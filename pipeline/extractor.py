"""Extractor module for converting raw HTML to normalized text and content hashes."""

import hashlib
import re
from typing import Tuple
from bs4 import BeautifulSoup

TAGS_TO_STRIP = [
    "script",
    "style",
    "nav",
    "footer",
    "header",
    "aside",
    "noscript",
    "svg",
    "iframe",
    "form",
]


def extract_clean_text_and_hash(html_content: str) -> Tuple[str, str]:
    """Strip noise from HTML, extract main text, normalize whitespace, and compute SHA-256.

    Args:
        html_content: Raw HTML string.

    Returns:
        Tuple of (clean_text, sha256_hash).
    """
    if not html_content:
        empty_hash = hashlib.sha256(b"").hexdigest()
        return "", empty_hash

    soup = BeautifulSoup(html_content, "html.parser")

    # Strip non-content and noisy structural tags
    for tag_name in TAGS_TO_STRIP:
        for element in soup.find_all(tag_name):
            element.decompose()

    # Find the main content area with progressive fallbacks
    container = (
        soup.find("main")
        or soup.find("article")
        or soup.find(id="content")
        or soup.find(id="main-content")
        or soup.find(id="main")
        or soup.find(class_=re.compile(r"\b(content|main|article)\b", re.IGNORECASE))
        or soup.find("body")
        or soup
    )

    raw_text = container.get_text(separator=" ", strip=True)
    # Normalize multiple whitespaces, tabs, newlines into single spaces
    clean_text = re.sub(r"\s+", " ", raw_text).strip()

    sha256_hash = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()

    return clean_text, sha256_hash
