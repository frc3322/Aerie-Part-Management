import { appState } from "../state/state.js";
import { getPartDrawingBlobUrl } from "../../core/api/router.js";
import { hideActionIconKey, showActionIconKey } from "../auth/auth.js";
import { showInfoNotification } from "../../core/dom/notificationManager.js";

let drawingObjectUrl = null;
let currentPartId = null;

function getViewerElements() {
    const modal = document.getElementById("drawing-modal");
    const frame = document.getElementById("drawing-frame");
    const spinner = document.getElementById("drawing-spinner");
    const error = document.getElementById("drawing-error");
    const status = document.getElementById("drawing-status");
    const title = document.getElementById("drawing-title");
    const subtitle = document.getElementById("drawing-subtitle");
    const refreshButton = document.getElementById("drawing-refresh");
    const printButton = document.getElementById("drawing-print");
    if (
        !modal ||
        !frame ||
        !spinner ||
        !error ||
        !status ||
        !title ||
        !subtitle ||
        !refreshButton ||
        !printButton
    ) {
        return null;
    }
    return {
        modal,
        frame,
        spinner,
        error,
        status,
        title,
        subtitle,
        refreshButton,
        printButton,
    };
}

function showElement(element) {
    element.classList.remove("hidden");
}

function hideElement(element) {
    element.classList.add("hidden");
}

function openModal(modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    hideActionIconKey();
}

function closeModal(modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    showActionIconKey();
}

function revokeDrawingUrl() {
    if (drawingObjectUrl) {
        URL.revokeObjectURL(drawingObjectUrl);
        drawingObjectUrl = null;
    }
}

function buildFrameSrc(blobUrl) {
    // Hide default PDF toolbar; keep scrollbars for viewing.
    const suffix = "#toolbar=0&navpanes=0&scrollbar=1";
    return blobUrl.includes("#") ? blobUrl : `${blobUrl}${suffix}`;
}

function findHandPartById(partId) {
    return appState.parts.hand.find((p) => p.id === partId);
}

function setActionState(elements, isLoading) {
    const { refreshButton, printButton } = elements;
    refreshButton.disabled = isLoading;
    printButton.disabled = isLoading;
    refreshButton.classList.toggle("opacity-60", isLoading);
    printButton.classList.toggle("opacity-60", isLoading);
}

export function closeDrawingModal() {
    const elements = getViewerElements();
    if (!elements) return;
    const { modal, frame, spinner, error, status } = elements;
    closeModal(modal);
    revokeDrawingUrl();
    frame.src = "about:blank";
    hideElement(frame);
    hideElement(spinner);
    hideElement(error);
    error.classList.remove("flex", "items-center", "justify-center");
    status.textContent = "Select a drawing to view.";
    currentPartId = null;
}

async function loadDrawing(partId, useRefresh) {
    const elements = getViewerElements();
    if (!elements) {
        showInfoNotification(
            "Drawing Viewer",
            "Drawing viewer is unavailable."
        );
        return;
    }

    const { frame, spinner, error, status } = elements;
    status.textContent = useRefresh
        ? "Refreshing drawing from Onshape..."
        : "Loading drawing...";
    hideElement(error);
    error.classList.remove("flex", "items-center", "justify-center");
    showElement(spinner);
    hideElement(frame);
    revokeDrawingUrl();
    setActionState(elements, true);

    try {
        const blobUrl = await getPartDrawingBlobUrl(partId, {
            refresh: Boolean(useRefresh),
        });
        drawingObjectUrl = blobUrl;
        frame.onload = () => {
            hideElement(spinner);
            status.textContent = "Ready to view or print.";
            showElement(frame);
        };
        frame.src = buildFrameSrc(blobUrl);
    } catch (err) {
        console.error("Failed to load drawing", err);
        hideElement(spinner);
        hideElement(frame);
        status.textContent = "Failed to load drawing.";
        error.textContent =
            "Unable to load drawing. Verify the Onshape link and try again.";
        error.classList.add("flex", "items-center", "justify-center");
        showElement(error);
    } finally {
        setActionState(elements, false);
    }
}

export async function viewHandDrawing(index) {
    const part = appState.parts.hand[index];
    if (!part) {
        showInfoNotification("Drawing Viewer", "Part not found.");
        return;
    }
    if (!part.onshapeUrl) {
        showInfoNotification("Drawing Viewer", "No drawing URL for this part.");
        return;
    }

    const elements = getViewerElements();
    if (!elements) {
        showInfoNotification(
            "Drawing Viewer",
            "Drawing viewer is unavailable."
        );
        return;
    }

    const { modal, title, subtitle } = elements;
    openModal(modal);
    currentPartId = part.id;
    title.textContent = part.name || "Drawing";
    subtitle.textContent = `ID: ${part.partId || part.id || "N/A"}`;
    await loadDrawing(part.id, false);
}

export async function refreshDrawing() {
    if (!currentPartId) {
        showInfoNotification("Drawing Viewer", "Open a drawing first.");
        return;
    }
    const part = findHandPartById(currentPartId);
    if (!part) {
        showInfoNotification("Drawing Viewer", "Part not found.");
        return;
    }
    await loadDrawing(part.id, true);
}

export function printDrawing() {
    const elements = getViewerElements();
    if (!elements) return;
    const { frame, status } = elements;

    if (!drawingObjectUrl) {
        status.textContent = "Load the drawing before printing.";
        return;
    }

    const contentWindow = frame.contentWindow;
    if (contentWindow) {
        contentWindow.focus();
        contentWindow.print();
        return;
    }

    const newWindow = window.open(drawingObjectUrl, "_blank");
    if (newWindow) {
        newWindow.onload = () => newWindow.print();
    } else {
        status.textContent = "Unable to open print window.";
    }
}
