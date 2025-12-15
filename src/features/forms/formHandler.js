// Form Handler Module
// Handles form submission, data extraction, and part creation

import { appState, updatePartInState, addPartToState } from "../state/state.js";
import { renderReview } from "../tabs/review.js";
import { renderCNC } from "../tabs/cnc.js";
import { renderHandFab } from "../tabs/handFab.js";
import { renderCompleted } from "../tabs/completed.js";
import { closeModal } from "../modals/modals.js";
import { switchTab } from "../navigation/tabs.js";
import {
    showErrorNotification,
    showWarningNotification,
} from "../../core/dom/notificationManager.js";
import {
    createPart as apiCreatePart,
    updatePart as apiUpdatePart,
    uploadPartFile,
    getPart,
} from "../../core/api/router.js";

function getMaterialInputValue() {
    const materialSelect = document.getElementById("input-material-select");
    const customMaterialInput = document.getElementById(
        "input-material-custom"
    );
    if (!materialSelect || !customMaterialInput) return "";
    return materialSelect.value === "custom"
        ? customMaterialInput.value
        : materialSelect.value;
}

function setUploadStatus(state) {
    const statusEl = document.getElementById("upload-status");
    if (!statusEl) return;

    statusEl.classList.remove(
        "hidden",
        "text-blue-300",
        "text-green-300",
        "text-red-300"
    );

    if (state === "uploading") {
        statusEl.querySelector("span").textContent = "Uploading file...";
        statusEl.classList.add("flex", "text-blue-300");
        return;
    }

    if (state === "success") {
        statusEl.querySelector("span").textContent = "Upload complete";
        statusEl.classList.add("flex", "text-green-300");
        setTimeout(() => {
            statusEl.classList.add("hidden");
        }, 1200);
        return;
    }

    if (state === "error") {
        statusEl.querySelector("span").textContent = "Upload failed";
        statusEl.classList.add("flex", "text-red-300");
        return;
    }

    statusEl.classList.add("hidden");
}

/**
 * Extract form data from the part form
 * @returns {Object} Form data object
 */
export function extractFormData() {
    return {
        isEdit: document.getElementById("edit-mode").value === "true",
        index: Number.parseInt(document.getElementById("edit-index").value),
        originTab: document.getElementById("edit-origin-tab").value,
        type: document.getElementById("input-category").value,
        name: document.getElementById("input-name").value,
        partId: document.getElementById("input-part-id").value,
        material: getMaterialInputValue(),
        amount: Number.parseInt(
            document.getElementById("input-amount").value,
            10
        ),
        subsystem: document.getElementById("input-subsystem").value,
        assigned: document.getElementById("input-assigned").value,
        status: document.getElementById("input-status").value,
        notes: document.getElementById("input-notes").value,
        onshapeUrl: document.getElementById("input-onshape").value,
        fileInput: document.getElementById("input-file"),
    };
}

/**
 * Prepare data for API submission
 * @param {Object} formData - The form data
 * @returns {Object} Data formatted for API
 */
function prepareApiData(formData) {
    const apiData = {
        type: formData.type,
        partId: formData.partId,
        material: formData.material,
        subsystem: formData.subsystem,
        amount:
            Number.isFinite(formData.amount) && formData.amount > 0
                ? formData.amount
                : 1,
        status: formData.status,
        notes: formData.notes,
        onshapeUrl: formData.onshapeUrl,
    };

    // Handle category - for new parts, default to review
    if (!formData.isEdit) {
        apiData.category = "review";
    }

    // Handle type-specific fields
    apiData.name = formData.name;

    if (formData.type === "cnc") {
        // Handle file if uploaded
        if (formData.fileInput.files.length > 0) {
            apiData.file = formData.fileInput.files[0].name;
        }
    } else {
        apiData.assigned = formData.assigned;
    }

    return apiData;
}

/**
 * Handle file upload for a part
 * @param {number} partId - The part ID
 * @param {File} file - The file to upload
 * @returns {Object|null} Updated part data or null if upload failed
 */
async function handleFileUpload(partId, file) {
    try {
        setUploadStatus("uploading");
        await uploadPartFile(partId, file);
        const updatedPart = await getPart(partId);
        updatePartInState(partId, updatedPart);
        setUploadStatus("success");
        return updatedPart;
    } catch (error) {
        console.error("Failed to upload file:", error);
        setUploadStatus("error");
        showErrorNotification(
            "Upload Failed",
            "Part saved but file upload failed. Please try uploading again."
        );
        return null;
    }
}

/**
 * Handle editing an existing part
 * @param {Object} formData - The form data
 * @param {Object} apiData - The prepared API data
 */
async function handleEditPart(formData, apiData) {
    const existingPart = appState.parts[formData.originTab][formData.index];
    const result = await apiUpdatePart(existingPart.id, apiData);
    updatePartInState(existingPart.id, result);

    if (formData.type === "cnc" && formData.fileInput.files.length > 0) {
        await handleFileUpload(existingPart.id, formData.fileInput.files[0]);
    }
}

/**
 * Handle creating a new part
 * @param {Object} formData - The form data
 * @param {Object} apiData - The prepared API data
 */
async function handleCreatePart(formData, apiData) {
    const result = await apiCreatePart(apiData);
    addPartToState(result);

    if (formData.type === "cnc" && formData.fileInput.files.length > 0) {
        await handleFileUpload(result.id, formData.fileInput.files[0]);
    }

    // Switch to review tab for new parts
    switchTab("review");
}

/**
 * Perform post-submit actions like re-rendering tabs
 */
function performPostSubmitActions() {
    renderReview();
    renderCNC();
    renderHandFab();
    renderCompleted();
    closeModal();
}

/**
 * Handle Enter key press in form inputs
 * @param {Event} event - Keyup event from event delegation
 */
export function handleFormKeyup(event) {
    if (event.key === "Enter") {
        handleFormSubmit(event);
    }
}

/**
 * Handle form submission
 * @param {Event} e - The form submission event
 */
export async function handleFormSubmit(e) {
    e.preventDefault();

    const submitButton =
        e.target.querySelector('button[type="submit"]') ||
        e.target.querySelector(".submit-btn");
    if (submitButton) submitButton.disabled = true;

    try {
        const formData = extractFormData();
        const trimmedName = formData.name.trim();
        const trimmedPartId = formData.partId.trim();
        const trimmedMaterial = formData.material.trim();
        const trimmedSubsystem = formData.subsystem.trim();
        if (trimmedName.length === 0) {
            showWarningNotification(
                "Validation Error",
                "Part name is required."
            );
            return;
        }
        if (trimmedPartId.length === 0) {
            showWarningNotification("Validation Error", "Part ID is required.");
            return;
        }
        if (trimmedMaterial.length === 0) {
            showWarningNotification(
                "Validation Error",
                "Material is required."
            );
            return;
        }
        if (trimmedSubsystem.length === 0) {
            showWarningNotification(
                "Validation Error",
                "Subsystem is required."
            );
            return;
        }
        if (!Number.isFinite(formData.amount) || formData.amount <= 0) {
            showWarningNotification(
                "Validation Error",
                "Amount must be at least 1."
            );
            return;
        }
        formData.name = trimmedName;
        formData.partId = trimmedPartId;
        formData.material = trimmedMaterial;
        formData.subsystem = trimmedSubsystem;
        const apiData = prepareApiData(formData);

        if (formData.isEdit) {
            await handleEditPart(formData, apiData);
        } else {
            await handleCreatePart(formData, apiData);
        }

        performPostSubmitActions();
    } catch (error) {
        console.error("Failed to save part:", error);
        showErrorNotification(
            "Save Failed",
            "Failed to save part. Please try again."
        );
    } finally {
        setUploadStatus("idle");
        if (submitButton) submitButton.disabled = false;
    }
}
