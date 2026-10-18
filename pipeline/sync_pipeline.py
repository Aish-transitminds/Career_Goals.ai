"""Main pipeline orchestrator for live university requirements sync."""

import argparse
import datetime
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from .config import SOURCES_PATH
from .diff_engine import detect_rule_changes
from .extractor import extract_clean_text_and_hash
from .fetcher import EthicalFetcher
from .firestore_sync import FirestoreSync
from .llm_client import extract_requirements_with_llm
from .schema import validate_extracted_data

logger = logging.getLogger("pipeline.sync")


def get_current_utc_timestamp() -> str:
    """Return formatted ISO 8601 UTC timestamp."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def load_sources(sources_path: Path) -> List[Dict[str, Any]]:
    """Load and validate the whitelisted university sources from JSON."""
    if not sources_path.exists():
        raise FileNotFoundError(f"Sources file not found at: {sources_path}")

    with open(sources_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError(f"Sources JSON must be a list of source objects, got {type(data).__name__}")

    logger.info("Loaded %d whitelisted sources from %s", len(data), sources_path)
    return data


def run_pipeline(
    dry_run: bool = False,
    target_source_id: Optional[str] = None,
    sources_path: Optional[Path] = None,
) -> int:
    """Run the synchronization pipeline for whitelisted sources.

    Args:
        dry_run: If True, simulate operations without writing to Firestore.
        target_source_id: Optional ID to process a single source.
        sources_path: Path to sources.json file.

    Returns:
        Exit code (0 for success, non-zero for failures).
    """
    path_to_use = sources_path or SOURCES_PATH
    logger.info("Starting AbroadPath data pipeline (dry_run=%s, target_source_id=%s)", dry_run, target_source_id)

    try:
        sources = load_sources(path_to_use)
    except Exception as err:
        logger.error("Failed to load sources list: %s", err)
        return 1

    if target_source_id:
        sources = [s for s in sources if s.get("id") == target_source_id]
        if not sources:
            logger.warning("No source found matching ID '%s'", target_source_id)
            return 0
        logger.info("Filtered to single source: %s", target_source_id)

    fetcher = EthicalFetcher()
    firestore_sync = FirestoreSync(dry_run=dry_run)

    success_count = 0
    failure_count = 0

    for source in sources:
        source_id = source["id"]
        university_name = source["university"]
        program_name = source["program"]
        url = source["url"]
        country_id = source.get("countryId", "")

        logger.info("--------------------------------------------------")
        logger.info("Processing source [%s]: %s - %s", source_id, university_name, program_name)
        logger.info("URL: %s", url)

        now_iso = get_current_utc_timestamp()

        # Step 1: Fetch page content respecting robots.txt and polite delay
        html_content, fetch_error = fetcher.fetch_page(url)
        if fetch_error or html_content is None:
            logger.error("Fetch failed for [%s]: %s", source_id, fetch_error)
            firestore_sync.update_university_doc(
                source_id,
                {
                    "lastChecked": now_iso,
                    "extractionFailed": True,
                    "extractionError": fetch_error,
                },
            )
            failure_count += 1
            continue

        # Step 2: Clean text and compute content hash
        clean_text, content_hash = extract_clean_text_and_hash(html_content)
        logger.info(
            "Extracted text (%d characters). Content Hash: %s",
            len(clean_text),
            content_hash,
        )

        # Step 3: Compare hash with existing Firestore document
        existing_doc = firestore_sync.get_university_doc(source_id) or {}
        existing_hash = existing_doc.get("contentHash")

        if existing_hash and existing_hash == content_hash:
            # Hash unchanged: update lastChecked only
            logger.info("Content hash unchanged (%s). Updating lastChecked timestamp only.", content_hash[:12])
            firestore_sync.update_university_doc(
                source_id,
                {
                    "lastChecked": now_iso,
                    "extractionFailed": False,
                    "extractionError": None,
                },
            )
            success_count += 1
            continue

        logger.info(
            "Content changed or first-time sync (old hash: %s -> new hash: %s). Calling LLM.",
            existing_hash[:12] if existing_hash else "None",
            content_hash[:12],
        )

        # Step 4: Extract requirements via LLM with fallback
        try:
            raw_extraction = extract_requirements_with_llm(
                page_text=clean_text,
                university_name=university_name,
                program_name=program_name,
            )
        except Exception as llm_err:
            logger.error("LLM extraction failed for [%s]: %s", source_id, llm_err)
            firestore_sync.update_university_doc(
                source_id,
                {
                    "lastChecked": now_iso,
                    "extractionFailed": True,
                    "extractionError": f"LLM extraction error: {llm_err}",
                },
            )
            failure_count += 1
            continue

        # Step 5: Validate extracted requirements schema
        is_valid, validated_reqs, val_err = validate_extracted_data(raw_extraction)
        if not is_valid or validated_reqs is None:
            logger.error("Extraction schema validation failed for [%s]: %s", source_id, val_err)
            # Preserve last known values, flag extraction failure
            firestore_sync.update_university_doc(
                source_id,
                {
                    "lastChecked": now_iso,
                    "extractionFailed": True,
                    "extractionError": val_err,
                },
            )
            failure_count += 1
            continue

        # Step 6: Detect rule changes
        rule_changed, changed_fields, previous_values = detect_rule_changes(
            existing_doc=existing_doc,
            new_requirements=validated_reqs,
        )

        if rule_changed:
            logger.warning(
                "Rule change detected for [%s]! Changed fields: %s",
                source_id,
                changed_fields,
            )
        else:
            logger.info("No rule changes detected for [%s].", source_id)

        # Step 7: Update document in Firestore
        update_doc: Dict[str, Any] = {
            "name": university_name,
            "program": program_name,
            "countryId": country_id,
            "sourceUrl": url,
            "contentHash": content_hash,
            "lastChecked": now_iso,
            "extractionFailed": False,
            "extractionError": None,
            "requirements": validated_reqs,
            "ruleChanged": rule_changed,
            "changedFields": changed_fields,
            "previousValues": previous_values,
        }

        # Sync top-level tuition helper if present
        if validated_reqs.get("tuition_fee"):
            update_doc["tuition"] = validated_reqs["tuition_fee"]

        # Preserve demoSeeded if originally set
        if existing_doc.get("demoSeeded") is True:
            update_doc["demoSeeded"] = True

        # Timestamp lastChanged
        if rule_changed:
            update_doc["lastChanged"] = now_iso
        elif "lastChanged" in existing_doc:
            update_doc["lastChanged"] = existing_doc["lastChanged"]
        else:
            update_doc["lastChanged"] = now_iso

        firestore_sync.update_university_doc(source_id, update_doc)
        success_count += 1

    logger.info("==================================================")
    logger.info("Pipeline sync complete. Succeeded: %d, Handled extraction failures: %d", success_count, failure_count)
    return 0


def main() -> None:
    """CLI entry point for pipeline execution."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    env_dry_run = os.getenv("DRY_RUN", "").strip().lower() in ("true", "1", "yes")
    env_target_id = os.getenv("TARGET_SOURCE_ID", "").strip() or None

    parser = argparse.ArgumentParser(description="AbroadPath AI Live Data Pipeline")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=env_dry_run,
        help="Run without committing updates to Firestore (or set DRY_RUN=true)",
    )
    parser.add_argument(
        "--source-id",
        type=str,
        default=env_target_id,
        help="Filter execution to a single source id (or set TARGET_SOURCE_ID=<id>)",
    )
    parser.add_argument(
        "--sources-file",
        type=str,
        default=None,
        help="Path to custom sources.json file",
    )

    args = parser.parse_args()
    sources_path = Path(args.sources_file) if args.sources_file else None

    exit_code = run_pipeline(
        dry_run=args.dry_run,
        target_source_id=args.source_id,
        sources_path=sources_path,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
