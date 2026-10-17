"""Configuration constants for the AbroadPath AI live data pipeline."""

import os
from pathlib import Path

# Base Paths
PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parent
SOURCES_PATH = PACKAGE_DIR / "sources.json"

# Polite Crawling & Network Configuration
USER_AGENT = "AbroadPathBot/1.0 (+https://abroadpath.ai/bot; verification-crawler)"
DEFAULT_DELAY_SECONDS = 2.0
REQUEST_TIMEOUT_SECONDS = 20.0
ROBOTS_TIMEOUT_SECONDS = 10.0

# Extraction & Model Configuration (TASK 2: Retired 1.5 Flash replaced with configurable modern Flash model)
MAX_TEXT_LENGTH = 12000
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_API_URL_TEMPLATE = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={{api_key}}"
)
GEMINI_MAX_RETRIES = 4
GEMINI_BASE_BACKOFF_SECONDS = 4.0
GEMINI_REQUEST_TIMEOUT_SECONDS = 30.0

# Firestore Collections
COLLECTION_UNIVERSITIES = "universities"
COLLECTION_COUNTRIES = "countries"

# Schema tracked rule fields for change detection
TRACKED_RULE_FIELDS = [
    "gmat_required",
    "gre_required",
    "min_ielts",
    "min_toefl",
    "min_gre",
    "min_gmat",
    "min_gpa",
    "language_requirement",
    "tuition_fee",
    "application_deadline",
]
