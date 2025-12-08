"""Onshape drawing download utilities."""

import base64
import os
import re
import time
from pathlib import Path
from typing import Dict, Tuple

import requests

try:  # Prefer absolute import for script execution
    from config import load_config_from_json  # type: ignore
except ImportError:  # Fallback when imported as package
    from ..config import load_config_from_json

try:
    from flask import current_app
except Exception:  # pragma: no cover - fallback when Flask not available
    current_app = None  # type: ignore


class OnshapeDrawingClient:
    """Download drawings from Onshape using the translations API."""

    def __init__(
        self,
        access_key: str,
        secret_key: str,
        base_url: str = "https://cad.onshape.com",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": self._build_auth_header(access_key, secret_key),
        }

    def parse_drawing_url(self, drawing_url: str) -> Tuple[str, str, str]:
        """Extract identifiers from a drawing URL.

        Args:
            drawing_url: Full Onshape drawing URL.

        Returns:
            Tuple with document, workspace, and element identifiers.

        Raises:
            ValueError: If the URL cannot be parsed.
        """
        pattern = (
            r"/documents/(?P<document>[A-Za-z0-9]+)/w/"
            r"(?P<workspace>[A-Za-z0-9]+)/e/(?P<element>[A-Za-z0-9]+)"
        )
        match = re.search(pattern, drawing_url)
        if not match:
            raise ValueError(
                "Drawing URL must include document, workspace, and element identifiers."
            )
        return (
            match.group("document"),
            match.group("workspace"),
            match.group("element"),
        )

    def download_pdf(self, drawing_url: str, output_path: Path) -> Path:
        """Translate a drawing to PDF and save it.

        Args:
            drawing_url: Full Onshape drawing URL.
            output_path: Destination path for the PDF.

        Returns:
            Absolute path to the saved PDF.
        """
        document_id, workspace_id, element_id = self.parse_drawing_url(drawing_url)
        translation_url = (
            f"{self.base_url}/api/v6/drawings/d/{document_id}/w/{workspace_id}"
            f"/e/{element_id}/translations"
        )
        payload = {
            "formatName": "PDF",
            "destinationName": output_path.name,
            "currentSheetOnly": False,
            "selectablePdfText": True,
        }
        response = requests.post(
            translation_url, headers=self.headers, json=payload, timeout=30
        )
        response.raise_for_status()
        translation_info: Dict = response.json()
        status_url = self._extract_status_url(translation_info)
        final_status = self._poll_translation(status_url=status_url)
        external_ids = final_status.get("resultExternalDataIds") or []
        element_ids = final_status.get("resultElementIds") or []
        if external_ids:
            download_url = f"{self.base_url}/api/externaldata/{external_ids[0]}"
            return self._download_file(
                download_url=download_url, output_path=output_path
            )
        if element_ids:
            return self._download_blob_element(
                document_id=document_id,
                workspace_id=workspace_id,
                element_id=element_ids[0],
                output_path=output_path,
            )
        raise RuntimeError("Translation finished without downloadable results.")

    def _build_auth_header(self, access_key: str, secret_key: str) -> str:
        """Build the HTTP basic auth header."""
        credentials = f"{access_key}:{secret_key}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    def _extract_status_url(self, translation_info: Dict) -> str:
        """Get the status URL from translation creation response."""
        href = translation_info.get("href")
        if not href:
            raise RuntimeError("Translation response missing status link.")
        return href if href.startswith("http") else f"{self.base_url}{href}"

    def _poll_translation(
        self, status_url: str, max_attempts: int = 30, delay_seconds: float = 2.0
    ) -> Dict:
        """Poll translation status until completion or failure."""
        for _ in range(max_attempts):
            status_response = requests.get(status_url, headers=self.headers, timeout=15)
            status_response.raise_for_status()
            status_payload: Dict = status_response.json()
            state = (status_payload.get("requestState") or "").upper()
            if state == "DONE":
                return status_payload
            if state in {"FAILED", "CANCELED"}:
                raise RuntimeError(f"Translation ended with state {state}.")
            time.sleep(delay_seconds)
        raise TimeoutError("Translation polling exceeded maximum attempts.")

    def _download_file(self, download_url: str, output_path: Path) -> Path:
        """Download a file from external data endpoint."""
        file_headers = {**self.headers, "Accept": "application/pdf"}
        response = requests.get(
            download_url, headers=file_headers, stream=True, timeout=60
        )
        response.raise_for_status()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("wb") as file_handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_handle.write(chunk)
        return output_path.resolve()

    def _download_blob_element(
        self, document_id: str, workspace_id: str, element_id: str, output_path: Path
    ) -> Path:
        """Download a blob element produced by translation."""
        blob_url = (
            f"{self.base_url}/api/v6/blobelements/d/{document_id}/w/{workspace_id}"
            f"/e/{element_id}"
        )
        blob_headers = {**self.headers, "Accept": "application/octet-stream"}
        response = requests.get(blob_url, headers=blob_headers, stream=True, timeout=60)
        response.raise_for_status()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("wb") as file_handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_handle.write(chunk)
        return output_path.resolve()


def build_onshape_client() -> OnshapeDrawingClient:
    """Create a configured OnshapeDrawingClient from available configuration sources."""

    def _get_from_flask_config(key: str) -> str:
        if current_app and current_app.config:
            return current_app.config.get(key, "") or ""
        return ""

    file_config = load_config_from_json()
    access_key = (
        os.environ.get("ONSHAPE_ACCESS_KEY")
        or _get_from_flask_config("ONSHAPE_ACCESS_KEY")
        or file_config.get("ONSHAPE_ACCESS_KEY", "")
    )
    secret_key = (
        os.environ.get("ONSHAPE_SECRET_KEY")
        or _get_from_flask_config("ONSHAPE_SECRET_KEY")
        or file_config.get("ONSHAPE_SECRET_KEY", "")
    )

    if not access_key or not secret_key:
        raise RuntimeError("ONSHAPE_ACCESS_KEY and ONSHAPE_SECRET_KEY must be set.")

    return OnshapeDrawingClient(
        access_key=access_key,
        secret_key=secret_key,
        base_url="https://cad.onshape.com",
    )
