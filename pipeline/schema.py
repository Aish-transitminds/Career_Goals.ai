"""Validation schema for academic admission requirements."""

import logging
from typing import Any, Dict, Optional, Tuple

from pydantic import BaseModel, Field, ValidationError, field_validator

logger = logging.getLogger(__name__)


class RequirementsSchema(BaseModel):
    """Schema for validated academic admission requirements."""

    gmat_required: Optional[bool] = None
    gre_required: Optional[bool] = None
    min_ielts: Optional[float] = Field(default=None, ge=0.0, le=9.0)
    min_toefl: Optional[int] = Field(default=None, ge=0, le=120)
    language_requirement: Optional[str] = Field(default=None, max_length=500)
    tuition_fee: Optional[str] = Field(default=None, max_length=200)
    application_deadline: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("language_requirement", "tuition_fee", "application_deadline", "notes", mode="before")
    @classmethod
    def clean_empty_strings(cls, v: Any) -> Any:
        """Convert empty or whitespace-only strings to None."""
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("min_ielts", mode="before")
    @classmethod
    def parse_ielts(cls, v: Any) -> Any:
        """Parse float IELTS if provided as string."""
        if v is None or v == "":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return v

    @field_validator("min_toefl", mode="before")
    @classmethod
    def parse_toefl(cls, v: Any) -> Any:
        """Parse integer TOEFL if provided as string."""
        if v is None or v == "":
            return None
        try:
            return int(float(v))
        except (ValueError, TypeError):
            return v


def validate_extracted_data(data: Any) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Validate extracted data against RequirementsSchema.

    Args:
        data: Raw extracted dictionary or object from LLM.

    Returns:
        Tuple of (is_valid, validated_dict, error_msg).
        If valid: (True, validated_dict, None).
        If invalid: (False, None, error_message).
    """
    if not isinstance(data, dict):
        msg = f"Expected dict for requirements, received {type(data).__name__}"
        logger.error(msg)
        return False, None, msg

    try:
        model = RequirementsSchema(**data)
        # Compatible with both Pydantic v2 (model_dump) and v1 (dict)
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
