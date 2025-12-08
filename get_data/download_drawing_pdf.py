#!/usr/bin/env python3
"""Download an Onshape drawing PDF from a drawing URL."""

import base64
import os
import re
import time
from pathlib import Path
from typing import Dict, Tuple

import requests


class OnshapeDrawingDownloader:
    def __init__(
        self,
        access_key: str,
        secret_key: str,
        base_url: str = "https://cad.onshape.com",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        credentials = f"{access_key}:{secret_key}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {encoded_credentials}",
        }

    def parse_drawing_url(self, drawing_url: str) -> Tuple[str, str, str]:
        """Extract document, workspace, and element IDs from a drawing URL.

        Args:
            drawing_url: Full Onshape drawing URL.

        Returns:
            Tuple containing document ID, workspace ID, and element ID.

        Raises:
            ValueError: If the URL does not match the expected Onshape drawing format.
        """
        pattern = r"/documents/(?P<document>[A-Za-z0-9]+)/w/(?P<workspace>[A-Za-z0-9]+)/e/(?P<element>[A-Za-z0-9]+)"
        match = re.search(pattern, drawing_url)
        if not match:
            raise ValueError(
                "Drawing URL must include document, workspace, and element identifiers."
            )
        document_id = match.group("document")
        workspace_id = match.group("workspace")
        element_id = match.group("element")
        return document_id, workspace_id, element_id

    def download_pdf(self, drawing_url: str, output_path: str) -> str:
        """Export the drawing to PDF via the translations API and save it.

        Args:
            drawing_url: Full Onshape drawing URL.
            output_path: Destination file path for the PDF.

        Returns:
            Absolute path to the saved PDF file.

        Raises:
            requests.HTTPError: If the API request fails.
            ValueError: If the drawing URL cannot be parsed.
        """
        document_id, workspace_id, element_id = self.parse_drawing_url(drawing_url)
        translation_url = (
            f"{self.base_url}/api/v6/drawings/d/{document_id}/w/{workspace_id}"
            f"/e/{element_id}/translations"
        )
        payload = {
            "formatName": "PDF",
            "destinationName": Path(output_path).name,
            "currentSheetOnly": False,
            "selectablePdfText": True,
        }
        response = requests.post(
            translation_url, headers=self.headers, json=payload, timeout=30
        )
        response.raise_for_status()
        translation_info: Dict = response.json()

        href = translation_info.get("href")
        if not href:
            raise RuntimeError("Translation response missing status link.")

        status_url = href if href.startswith("http") else f"{self.base_url}{href}"
        final_status = self._poll_translation(status_url=status_url)
        external_ids = final_status.get("resultExternalDataIds") or []
        element_ids = final_status.get("resultElementIds") or []
        if not external_ids:
            if element_ids:
                return self._download_blob_element(
                    document_id=document_id,
                    workspace_id=workspace_id,
                    element_id=element_ids[0],
                    output_path=output_path,
                )
            raise RuntimeError("Translation finished without downloadable results.")

        download_url = f"{self.base_url}/api/externaldata/{external_ids[0]}"
        return self._download_file(download_url=download_url, output_path=output_path)

    def _poll_translation(
        self, status_url: str, max_attempts: int = 30, delay_seconds: float = 2.0
    ) -> Dict:
        """Poll translation status until completion or failure.

        Args:
            status_url: URL to query translation status.
            max_attempts: Maximum number of polling attempts.
            delay_seconds: Delay between polling attempts in seconds.

        Returns:
            Final translation status payload.

        Raises:
            TimeoutError: If translation does not complete in allotted attempts.
            RuntimeError: If translation fails or is cancelled.
        """
        for _ in range(max_attempts):
            status_response = requests.get(status_url, headers=self.headers, timeout=15)
            status_response.raise_for_status()
            status_payload: Dict = status_response.json()
            state = status_payload.get("requestState", "").upper()
            if state == "DONE":
                return status_payload
            if state in {"FAILED", "CANCELED"}:
                raise RuntimeError(f"Translation ended with state {state}.")
            time.sleep(delay_seconds)

        raise TimeoutError("Translation polling exceeded maximum attempts.")

    def _download_file(self, download_url: str, output_path: str) -> str:
        """Stream a file from the provided URL to disk.

        Args:
            download_url: URL of the file to download.
            output_path: Destination file path.

        Returns:
            Absolute path to the saved file.
        """
        file_headers = {**self.headers, "Accept": "application/pdf"}
        response = requests.get(
            download_url, headers=file_headers, stream=True, timeout=60
        )
        response.raise_for_status()

        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with output_file.open("wb") as file_handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_handle.write(chunk)

        return str(output_file.resolve())

    def _download_blob_element(
        self, document_id: str, workspace_id: str, element_id: str, output_path: str
    ) -> str:
        """Download a blob element (e.g., translated drawing) from the workspace.

        Args:
            document_id: Onshape document ID.
            workspace_id: Onshape workspace ID.
            element_id: Blob element ID produced by translation.
            output_path: Destination file path.

        Returns:
            Absolute path to the saved file.
        """
        blob_url = (
            f"{self.base_url}/api/v6/blobelements/d/{document_id}/w/{workspace_id}"
            f"/e/{element_id}"
        )
        blob_headers = {**self.headers, "Accept": "application/octet-stream"}
        response = requests.get(blob_url, headers=blob_headers, stream=True, timeout=60)
        response.raise_for_status()

        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with output_file.open("wb") as file_handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_handle.write(chunk)

        return str(output_file.resolve())


def main() -> None:
    """Download a drawing using credentials from environment variables."""

    access_key = os.getenv("ONSHAPE_ACCESS_KEY", "")
    secret_key = os.getenv("ONSHAPE_SECRET_KEY", "")
    drawing_url = os.getenv("ONSHAPE_DRAWING_URL", "")
    output_path = os.getenv("ONSHAPE_OUTPUT_PATH", "./downloaded_drawing.pdf")

    if not access_key or not secret_key or not drawing_url:
        print(
            "Set ONSHAPE_ACCESS_KEY, ONSHAPE_SECRET_KEY, and ONSHAPE_DRAWING_URL "
            "environment variables before running this script."
        )
        return

    downloader = OnshapeDrawingDownloader(access_key=access_key, secret_key=secret_key)
    try:
        saved_path = downloader.download_pdf(
            drawing_url=drawing_url, output_path=output_path
        )
        print(f"Drawing PDF saved to {saved_path}")
    except Exception as error:
        print(f"Failed to download drawing PDF: {error}")


if __name__ == "__main__":
    main()
