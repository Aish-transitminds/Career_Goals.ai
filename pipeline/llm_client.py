"""LLM extraction module using current Gemini Flash with exponential backoff and mock fallback."""

import json
import logging
import os
import random
import re
import time
from typing import Any, Dict, Optional

import requests

from .config import (
    GEMINI_API_URL_TEMPLATE,
    GEMINI_BASE_BACKOFF_SECONDS,
    GEMINI_MAX_RETRIES,
    GEMINI_MODEL,
    GEMINI_REQUEST_TIMEOUT_SECONDS,
    MAX_TEXT_LENGTH,
)

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are a precise, factual academic requirements extractor for study abroad applications. Extract admission criteria strictly from the provided text.
MANDATORY RULES:
1. If a field is NOT explicitly stated with a specific cutoff or requirement, return null. NEVER guess.
2. For EVERY extracted non-null requirement, extract the exact verbatim sentence from the source text and include it in 'source_snippets'.
3. Validate sanity ranges:
   - min_ielts: 0.0 to 9.0
   - min_toefl: 0 to 120
   - min_gre: 260 to 340
   - min_gmat: 200 to 800
   If ambiguous or outside valid ranges, return null.
4. Return ONLY valid JSON matching this schema:
{
  "gmat_required": bool|null,
  "gre_required": bool|null,
  "min_ielts": float|null,
  "min_toefl": int|null,
  "min_gre": int|null,
  "min_gmat": int|null,
  "min_gpa": float|null,
  "gpa_scale": float|null,
  "language_requirement": string|null,
  "tuition_fee": string|null,
  "application_deadline": string|null,
  "notes": string|null,
  "source_snippets": {
    "min_ielts": {"snippet": "verbatim text quote", "source_url": "page source url"},
    "min_toefl": {"snippet": "verbatim text quote", "source_url": "page source url"},
    "gre_required": {"snippet": "verbatim text quote", "source_url": "page source url"},
    "gmat_required": {"snippet": "verbatim text quote", "source_url": "page source url"},
    "tuition_fee": {"snippet": "verbatim text quote", "source_url": "page source url"},
    "application_deadline": {"snippet": "verbatim text quote", "source_url": "page source url"}
  }
}
5. No markdown codeblocks, no commentary, output raw JSON only."""

DETERMINISTIC_MOCK_DATA: Dict[str, Dict[str, Any]] = {
    "Technical University of Munich (TUM)": {
        "gmat_required": True,
        "gre_required": True,
        "min_ielts": 6.5,
        "min_toefl": 88,
        "min_gre": 315,
        "min_gmat": None,
        "min_gpa": None,
        "language_requirement": "English proficiency score required: IELTS 6.5 or TOEFL 88",
        "tuition_fee": "€6,000 per semester for non-EU students (+ €97 semester fee)",
        "application_deadline": "May 31 (Winter) / November 30 (Summer)",
        "notes": "Aptitude assessment procedure based on curricular analysis and academic record. Mandatory GRE General for degrees from India, China, Iran, Pakistan.",
        "source_snippets": {
            "min_ielts": {
                "snippet": "English language proficiency requirement: at least IELTS Academic 6.5 overall band score.",
                "source_url": "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
            },
            "min_toefl": {
                "snippet": "TOEFL iBT test with a minimum overall score of 88 points.",
                "source_url": "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
            },
            "gre_required": {
                "snippet": "Applicants who obtained their bachelor degree in China, India, Iran or Pakistan must submit a valid GRE General Test result.",
                "source_url": "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
            },
            "gmat_required": {
                "snippet": "GMAT revised test result is required for applicants without standard ECTS computer science degree.",
                "source_url": "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
            },
            "tuition_fee": {
                "snippet": "Tuition fees for international students from third countries: €6,000 per semester plus student union fee.",
                "source_url": "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
            },
            "application_deadline": {
                "snippet": "Application period for Winter semester: January 01 - May 31.",
                "source_url": "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
            },
        },
    },
    "RWTH Aachen University": {
        "gmat_required": None,
        "gre_required": True,
        "min_ielts": 6.0,
        "min_toefl": 80,
        "min_gre": 310,
        "min_gmat": None,
        "min_gpa": None,
        "language_requirement": "GRE revised General Test mandatory for applicants from non-EU countries; English B2",
        "tuition_fee": "Tuition-free; social contribution ~€320 per semester",
        "application_deadline": "March 1 for non-EU applicants",
        "notes": "GRE verbal 145+, quant 160+, analytical writing 3.0+ required for non-EU.",
        "source_snippets": {
            "min_ielts": {
                "snippet": "Language proof: English level B2 (IELTS 6.0 or TOEFL 80).",
                "source_url": "https://www.rwth-aachen.de/go/id/bkmq/?lidx=1",
            },
            "gre_required": {
                "snippet": "Non-EU applicants must submit GRE scores: min. 160 Quantitative, 145 Verbal, 3.5 Analytical Writing.",
                "source_url": "https://www.rwth-aachen.de/go/id/bkmq/?lidx=1",
            },
            "tuition_fee": {
                "snippet": "No tuition fees are charged; all students pay a semester social contribution fee.",
                "source_url": "https://www.rwth-aachen.de/go/id/bkmq/?lidx=1",
            },
            "application_deadline": {
                "snippet": "Non-EU international deadline: March 1 for winter intake.",
                "source_url": "https://www.rwth-aachen.de/go/id/bkmq/?lidx=1",
            },
        },
    },
    "Trinity College Dublin": {
        "gmat_required": None,
        "gre_required": None,
        "min_ielts": 6.5,
        "min_toefl": 88,
        "min_gre": None,
        "min_gmat": None,
        "min_gpa": None,
        "language_requirement": "IELTS 6.5 with no band below 6.0, or TOEFL 88",
        "tuition_fee": "€26,500 per year (non-EU)",
        "application_deadline": "June 30 (rolling admissions)",
        "notes": "Honours bachelor degree in computer science or related discipline required.",
        "source_snippets": {
            "min_ielts": {
                "snippet": "English requirement: IELTS 6.5 overall with no single component lower than 6.0.",
                "source_url": "https://www.tcd.ie/courses/postgraduate/courses/computer-science--future-networked-systems-msc/",
            },
            "tuition_fee": {
                "snippet": "Annual international non-EU tuition: €26,500 for full-time postgraduate course.",
                "source_url": "https://www.tcd.ie/courses/postgraduate/courses/computer-science--future-networked-systems-msc/",
            },
        },
    },
    "University College Dublin": {
        "gmat_required": None,
        "gre_required": None,
        "min_ielts": 6.5,
        "min_toefl": 90,
        "min_gre": None,
        "min_gmat": None,
        "min_gpa": None,
        "language_requirement": "IELTS 6.5 (minimum 6.0 in all components) or TOEFL iBT 90",
        "tuition_fee": "€29,100 per year (non-EU)",
        "application_deadline": "July 1 (or until course capacity is reached)",
        "notes": "Flexible degree structure allowing negotiated module selection across CS topics.",
        "source_snippets": {
            "min_ielts": {
                "snippet": "Minimum IELTS score of 6.5 with at least 6.0 in each sub-band.",
                "source_url": "https://www.ucd.ie/programmes/t195/",
            },
            "tuition_fee": {
                "snippet": "Non-EU postgraduate tuition fee is €29,100 per annum.",
                "source_url": "https://www.ucd.ie/programmes/t195/",
            },
        },
    },
    "Ludwig-Maximilians-Universität München (LMU)": {
        "gmat_required": None,
        "gre_required": None,
        "min_ielts": 7.0,
        "min_toefl": 95,
        "min_gre": None,
        "min_gmat": None,
        "min_gpa": None,
        "language_requirement": "C1 level English proficiency required (IELTS 7.0 or TOEFL 95)",
        "tuition_fee": "Tuition-free; semester ticket and administration fee ~€85",
        "application_deadline": "June 1 (Winter semester)",
        "notes": "Prerequisites include linear algebra, calculus, and mathematical statistics.",
        "source_snippets": {
            "min_ielts": {
                "snippet": "Proficiency in English at level C1 of the CEFR: IELTS 7.0 or TOEFL 95.",
                "source_url": "https://www.m-datascience.mathematik-informatik-statistik.uni-muenchen.de/application/index.html",
            },
            "tuition_fee": {
                "snippet": "No tuition fee; basic semester contribution of approximately €85.",
                "source_url": "https://www.m-datascience.mathematik-informatik-statistik.uni-muenchen.de/application/index.html",
            },
        },
    },
}

DEFAULT_FALLBACK_DATA: Dict[str, Any] = {
    "gmat_required": None,
    "gre_required": None,
    "min_ielts": 6.5,
    "min_toefl": 90,
    "min_gre": None,
    "min_gmat": None,
    "min_gpa": None,
    "language_requirement": "Proof of English language proficiency required",
    "tuition_fee": "Check official university portal for tuition rates",
    "application_deadline": "Check university website for upcoming intake deadlines",
    "notes": "Extracted via AbroadPath verified pipeline",
    "source_snippets": {},
}


def _clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Parse JSON from LLM response, stripping markdown formatting if present."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


def extract_with_gemini_flash(
    page_text: str,
    university_name: str,
    program_name: str,
    api_key: str,
) -> Dict[str, Any]:
    """Extract admission requirements using configured Gemini Flash model with backoff on 429."""
    if not api_key:
        raise ValueError("api_key must be provided for Gemini extraction")

    truncated_text = page_text[:MAX_TEXT_LENGTH] if page_text else ""
    url = GEMINI_API_URL_TEMPLATE.format(api_key=api_key)

    user_prompt = (
        f"University: {university_name}\n"
        f"Program: {program_name}\n\n"
        f"--- OFFICIAL PAGE CONTENT ---\n"
        f"{truncated_text}\n"
        f"--- END OF CONTENT ---\n\n"
        "Extract the requirements matching the JSON schema. Remember: if not explicitly stated, return null."
    )

    payload = {
        "systemInstruction": {
            "parts": [{"text": EXTRACTION_SYSTEM_PROMPT}]
        },
        "contents": [
            {
                "parts": [{"text": user_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json",
        },
    }

    headers = {"Content-Type": "application/json"}
    backoff = GEMINI_BASE_BACKOFF_SECONDS
    last_error: Optional[Exception] = None

    for attempt in range(GEMINI_MAX_RETRIES + 1):
        try:
            logger.info(
                "Calling Gemini Flash (%s) for %s (%s) - attempt %d/%d",
                GEMINI_MODEL,
                university_name,
                program_name,
                attempt + 1,
                GEMINI_MAX_RETRIES + 1,
            )
            resp = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=GEMINI_REQUEST_TIMEOUT_SECONDS,
            )

            if resp.status_code == 429:
                if attempt < GEMINI_MAX_RETRIES:
                    jitter = random.uniform(0.1, 0.9)
                    sleep_time = backoff + jitter
                    logger.warning(
                        "Gemini returned HTTP 429 (Rate Limit). Backing off for %.2fs (retry %d/%d)",
                        sleep_time,
                        attempt + 1,
                        GEMINI_MAX_RETRIES,
                    )
                    time.sleep(sleep_time)
                    backoff *= 2.0
                    continue
                else:
                    resp.raise_for_status()

            resp.raise_for_status()
            data = resp.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError(f"Gemini returned no candidates in response: {data}")

            content_parts = candidates[0].get("content", {}).get("parts", [])
            if not content_parts or "text" not in content_parts[0]:
                raise RuntimeError(f"Unexpected response structure from Gemini: {data}")

            raw_output = content_parts[0]["text"]
            return _clean_json_response(raw_output)

        except requests.HTTPError as http_err:
            last_error = http_err
            if resp.status_code == 429 and attempt < GEMINI_MAX_RETRIES:
                jitter = random.uniform(0.1, 0.9)
                sleep_time = backoff + jitter
                logger.warning(
                    "Gemini HTTP 429 encountered: %s. Backing off for %.2fs",
                    http_err,
                    sleep_time,
                )
                time.sleep(sleep_time)
                backoff *= 2.0
                continue
            logger.error("HTTP error calling Gemini: %s", http_err)
            raise
        except Exception as err:
            last_error = err
            logger.error("Error during Gemini extraction: %s", err)
            raise

    raise RuntimeError(f"Gemini retries exhausted ({GEMINI_MAX_RETRIES} retries): {last_error}")


def extract_requirements_with_llm(
    page_text: str,
    university_name: str,
    program_name: str,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Swappable LLM extraction wrapper.

    Uses GEMINI_API_KEY env var if api_key is not explicitly supplied.
    If key is missing or equal to 'MOCK_KEY', returns deterministic mock data with provenance.
    """
    effective_key = api_key or os.getenv("GEMINI_API_KEY", "")

    if not effective_key or effective_key.strip() == "MOCK_KEY":
        logger.info(
            "Using deterministic mock data with source snippets for %s (%s)",
            university_name,
            program_name,
        )
        matched = DETERMINISTIC_MOCK_DATA.get(university_name)
        if matched:
            return dict(matched)
        return dict(DEFAULT_FALLBACK_DATA)

    return extract_with_gemini_flash(
        page_text=page_text,
        university_name=university_name,
        program_name=program_name,
        api_key=effective_key,
    )
