"""Firestore synchronization module using Firebase Admin SDK."""

import json
import logging
import os
from typing import Any, Dict, Optional

from .config import COLLECTION_UNIVERSITIES

logger = logging.getLogger(__name__)


class FirestoreSync:
    """Manages reading and updating university documents in Firestore."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.db = None

        if self.dry_run:
            logger.info("FirestoreSync initialized in DRY-RUN mode. Skipping Firebase Admin initialization.")
            return

        self._initialize_firebase()

    def _initialize_firebase(self) -> None:
        """Initialize Firebase Admin SDK with service account credentials."""
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            # Check if default app is already initialized
            if firebase_admin._apps:
                self.db = firestore.client()
                logger.info("Reusing existing Firebase Admin app connection.")
                return

            sa_key_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
            gac_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

            if sa_key_json and sa_key_json.strip():
                logger.info("Initializing Firebase Admin from FIREBASE_SERVICE_ACCOUNT_KEY env var.")
                try:
                    cred_dict = json.loads(sa_key_json)
                    cred = credentials.Certificate(cred_dict)
                except json.JSONDecodeError as json_err:
                    raise ValueError(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON: {json_err}")
            elif gac_path and os.path.exists(gac_path):
                logger.info("Initializing Firebase Admin from GOOGLE_APPLICATION_CREDENTIALS file: %s", gac_path)
                cred = credentials.Certificate(gac_path)
            else:
                logger.warning(
                    "Neither FIREBASE_SERVICE_ACCOUNT_KEY nor GOOGLE_APPLICATION_CREDENTIALS was provided. "
                    "Attempting default credentials."
                )
                try:
                    cred = credentials.ApplicationDefault()
                except Exception as default_err:
                    raise RuntimeError(
                        "No valid Firebase credentials found. Provide FIREBASE_SERVICE_ACCOUNT_KEY "
                        "or run with --dry-run."
                    ) from default_err

            firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            logger.info("Firebase Admin successfully initialized.")

        except ImportError as imp_err:
            raise ImportError(
                "firebase-admin package is required for live sync. "
                "Install it via 'pip install firebase-admin' or use --dry-run."
            ) from imp_err
        except Exception as err:
            logger.error("Failed to initialize Firebase Admin SDK: %s", err)
            raise

    def get_university_doc(self, university_id: str) -> Optional[Dict[str, Any]]:
        """Fetch existing university document from Firestore universities collection.

        Args:
            university_id: Document ID in universities collection.

        Returns:
            Dictionary representing document contents if found, or None.
        """
        if self.dry_run or self.db is None:
            logger.debug("[DRY RUN] Skipping remote Firestore read for '%s'", university_id)
            return None

        try:
            doc_ref = self.db.collection(COLLECTION_UNIVERSITIES).document(university_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                logger.debug("Retrieved Firestore document for '%s': %s", university_id, data)
                return data
            logger.info("Document '%s' does not yet exist in collection '%s'", university_id, COLLECTION_UNIVERSITIES)
            return None
        except Exception as err:
            logger.error("Error fetching Firestore document '%s': %s", university_id, err)
            raise

    def update_university_doc(self, university_id: str, data: Dict[str, Any]) -> None:
        """Update or merge university document in Firestore using set(data, merge=True).

        Args:
            university_id: Document ID in universities collection.
            data: Dictionary of fields to merge.
        """
        if self.dry_run or self.db is None:
            logger.info(
                "[DRY RUN] Would update Firestore doc '%s' in collection '%s' with fields: %s",
                university_id,
                COLLECTION_UNIVERSITIES,
                list(data.keys()),
            )
            return

        try:
            doc_ref = self.db.collection(COLLECTION_UNIVERSITIES).document(university_id)
            doc_ref.set(data, merge=True)
            logger.info(
                "Successfully updated Firestore doc '%s' in collection '%s'",
                university_id,
                COLLECTION_UNIVERSITIES,
            )
        except Exception as err:
            logger.error("Error updating Firestore document '%s': %s", university_id, err)
            raise
