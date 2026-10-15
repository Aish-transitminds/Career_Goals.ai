"""Diff engine to detect rule changes between existing university profiles and newly extracted requirements."""

import logging
from typing import Any, Dict, List, Optional, Tuple

from .config import TRACKED_RULE_FIELDS

logger = logging.getLogger(__name__)


def detect_rule_changes(
    existing_doc: Optional[Dict[str, Any]],
    new_requirements: Dict[str, Any],
) -> Tuple[bool, List[str], Dict[str, Any]]:
    """Detect rule changes across tracked admission fields.

    Tracks 7 core fields:
    - gmat_required
    - gre_required
    - min_ielts
    - min_toefl
    - language_requirement
    - tuition_fee
    - application_deadline

    Preserves demo state if existing_doc has `demoSeeded=True`.

    Args:
        existing_doc: Existing Firestore document dict or None.
        new_requirements: Newly validated requirements dict.

    Returns:
        Tuple of (rule_changed, changed_fields, previous_values).
    """
    if not existing_doc:
        existing_doc = {}

    # Demo Honesty Rule: Preserve seeded demo changes so live pipeline does not overwrite the demo showcase
    if existing_doc.get("demoSeeded") is True:
        logger.info("Preserving demo-seeded state for document (demoSeeded=True)")
        demo_rule_changed = existing_doc.get("ruleChanged", True)
        demo_changed_fields = existing_doc.get("changedFields", ["gmat_required"])
        demo_previous_values = existing_doc.get("previousValues", {"gmat_required": None})
        return demo_rule_changed, demo_changed_fields, demo_previous_values

    # Requirements in Firestore university documents are stored under 'requirements' map
    existing_reqs = existing_doc.get("requirements")
    if not isinstance(existing_reqs, dict):
        existing_reqs = existing_doc

    # If document has never had requirements recorded before, this is initial ingestion, not a change
    has_prior_history = any(k in existing_reqs for k in TRACKED_RULE_FIELDS)
    if not has_prior_history:
        return False, [], {}

    changed_fields: List[str] = []
    previous_values: Dict[str, Any] = {}

    for field in TRACKED_RULE_FIELDS:
        prev_val = existing_reqs.get(field)
        new_val = new_requirements.get(field)

        # Normalize empty string to None for reliable comparison
        if prev_val == "":
            prev_val = None
        if new_val == "":
            new_val = None

        if prev_val != new_val:
            changed_fields.append(field)
            previous_values[field] = prev_val

    rule_changed = len(changed_fields) > 0
    return rule_changed, changed_fields, previous_values
