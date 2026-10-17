"""Validation schema for academic admission requirements with provenance & sanity ranges."""

import logging
import re
from typing import Any, Dict, Optional, Tuple

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator

logger = logging.getLogger(__name__)

AMBIGUOUS_TERMS = {
    "varies", "vague", "see website", "check portal", "contact department",
    "optional", "recommended", "not specified", "tbd", "n/a", "na", "none",
    "conditional", "exempt", "varies by track", "flexible", "competitive"
}


def is_ambiguous_text(val: Any) -> bool:
    """Check if value is ambiguous or unconfirmed."""
    if val is None:
        return True
    if isinstance(val, str):
        cleaned = val.strip().lower()
        if not cleaned or cleaned in AMBIGUOUS_TERMS:
            return True
        for term in AMBIGUOUS_TERMS:
            if term in cleaned and len(cleaned) < 30:
                return True
    return False


class SnippetProvenance(BaseModel):
    """Verbatim source snippet and official URL provenance for an extracted requirement."""
    snippet: Optional[str] = None
    source_url: Optional[str] = None
    verified_on: Optional[str] = None


class RequirementsSchema(BaseModel):
    """Schema for validated academic admission requirements with sanity range checks.

    Sanity range rules:
    - IELTS: strictly 0.0 - 9.0. If out of range or ambiguous, set to None.
    - TOEFL: strictly 0 - 120. If out of range or ambiguous, set to None.
    - GRE: strictly 260 - 340 (total score scale). If out of range or ambiguous, set to None.
    - GMAT: strictly 200 - 800 (total score scale). If out of range or ambiguous, set to None.
    - GPA: strictly within declared gpa_scale (e.g. 0.0 - 4.0, 0.0 - 10.0, 1.0 - 5.0).
    - Source snippets: verbatim quote and official link stored per requirement.
    """

    gmat_required: Optional[bool] = None
    gre_required: Optional[bool] = None
    min_ielts: Optional[float] = None
    min_toefl: Optional[int] = None
    min_gre: Optional[int] = None
    min_gmat: Optional[int] = None
    min_gpa: Optional[float] = None
    gpa_scale: Optional[float] = None
    language_requirement: Optional[str] = Field(default=None, max_length=500)
    tuition_fee: Optional[str] = Field(default=None, max_length=200)
    application_deadline: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=500)
    source_snippets: Optional[Dict[str, Dict[str, Optional[str]]]] = None

    @field_validator("language_requirement", "tuition_fee", "application_deadline", "notes", mode="before")
    @classmethod
    def clean_empty_strings(cls, v: Any) -> Any:
        """Convert empty, whitespace-only, or ambiguous strings to None."""
        if is_ambiguous_text(v):
            return None
        return v

    @field_validator("gmat_required", "gre_required", mode="before")
    @classmethod
    def parse_boolean_requirement(cls, v: Any) -> Any:
        """Parse boolean flag; return None if ambiguous or unconfirmed."""
        if v is None:
            return None
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            lower = v.strip().lower()
            if lower in {"true", "yes", "required", "mandatory", "must submit"}:
                return True
            if lower in {"false", "no", "waived", "not required", "exempt"}:
                return False
            # Ambiguous (e.g. "recommended", "optional", "varies") -> set to None
            return None
        return None

    @field_validator("min_ielts", mode="before")
    @classmethod
    def validate_ielts(cls, v: Any) -> Optional[float]:
        """Validate IELTS against 0.0 - 9.0 range. Set to None if invalid or ambiguous."""
        if is_ambiguous_text(v):
            return None
        try:
            score = float(v)
            if 0.0 <= score <= 9.0:
                # Round to nearest 0.5 step
                return round(score * 2) / 2
            logger.warning("IELTS score %s outside valid range [0.0, 9.0]; setting to null", v)
            return None
        except (ValueError, TypeError):
            return None

    @field_validator("min_toefl", mode="before")
    @classmethod
    def validate_toefl(cls, v: Any) -> Optional[int]:
        """Validate TOEFL against 0 - 120 range. Set to None if invalid or ambiguous."""
        if is_ambiguous_text(v):
            return None
        try:
            score = int(float(v))
            if 0 <= score <= 120:
                return score
            logger.warning("TOEFL score %s outside valid range [0, 120]; setting to null", v)
            return None
        except (ValueError, TypeError):
            return None

    @field_validator("min_gre", mode="before")
    @classmethod
    def validate_gre(cls, v: Any) -> Optional[int]:
        """Validate GRE against 260 - 340 range. Set to None if invalid or ambiguous."""
        if is_ambiguous_text(v):
            return None
        try:
            score = int(float(v))
            if 260 <= score <= 340:
                return score
            logger.warning("GRE score %s outside valid range [260, 340]; setting to null", v)
            return None
        except (ValueError, TypeError):
            return None

    @field_validator("min_gmat", mode="before")
    @classmethod
    def validate_gmat(cls, v: Any) -> Optional[int]:
        """Validate GMAT against 200 - 800 range. Set to None if invalid or ambiguous."""
        if is_ambiguous_text(v):
            return None
        try:
            score = int(float(v))
            if 200 <= score <= 800:
                return score
            logger.warning("GMAT score %s outside valid range [200, 800]; setting to null", v)
            return None
        except (ValueError, TypeError):
            return None

    @model_validator(mode="after")
    def validate_gpa_within_scale(self) -> "RequirementsSchema":
        """Validate GPA falls strictly within its declared scale."""
        if self.min_gpa is not None:
            scale = self.gpa_scale or 4.0  # default to 4.0 scale if undeclared
            if scale == 5.0:
                # German scale: 1.0 (best) to 5.0 (fail)
                if not (1.0 <= self.min_gpa <= 5.0):
                    logger.warning("German GPA %s outside valid range [1.0, 5.0]; setting to null", self.min_gpa)
                    self.min_gpa = None
            else:
                if not (0.0 <= self.min_gpa <= scale):
                    logger.warning("GPA %s outside scale [0.0, %s]; setting to null", self.min_gpa, scale)
                    self.min_gpa = None
        return self


def validate_extracted_data(data: Any) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Validate extracted data against RequirementsSchema with provenance support.

    Args:
        data: Raw extracted dictionary or object from LLM.

    Returns:
        Tuple of (is_valid, validated_dict, error_msg).
    """
    if not isinstance(data, dict):
        msg = f"Expected dict for requirements, received {type(data).__name__}"
        logger.error(msg)
        return False, None, msg

    try:
        model = RequirementsSchema(**data)
        if hasattr(model, "model_dump"):
            validated_dict = model.model_dump()
        else:
            validated_dict = model.dict()
        return True, validated_dict, None
    except ValidationError as val_err:
        err_msg = f"Requirements schema validation error: {val_err}"
        logger.error(err_msg)
        return False, None, err_msg
    except Exception as err:
        err_msg = f"Unexpected error during schema validation: {err}"
        logger.error(err_msg)
        return False, None, err_msg
