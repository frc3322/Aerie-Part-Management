// Part Actions Module
// Handles part management actions like approve, complete, edit, delete

import { appState, updatePartInState, removePartFromState } from "./state.js";
import { renderReview } from "./review.js";
import { renderCNC } from "./cnc.js";
import { renderHandFab } from "./handFab.js";
import { renderCompleted } from "./completed.js";
import { openAddModal, handleCategoryChange } from "./modals.js";
import { hideActionIconKey, showActionIconKey } from "./auth.js";
import {
    approvePart as apiApprovePart,
    assignPart as apiAssignPart,
    unclaimPart as apiUnclaimPart,
    completePart as apiCompletePart,
    revertPart as apiRevertPart,
    deletePart as apiDeletePart,
    updatePart as apiUpdatePart,
} from "../utils/partsApi.js";
import { openReviewDetails, showPartInfo } from "./infoModals.js";

let pendingCompletionContext = null;
let pendingAmountConfirmation = null;
let storageModalInitialized = false;

function initStorageModal() {
    if (storageModalInitialized) return;
    const form = document.getElementById("storage-form");
    const cancelButton = document.getElementById("storage-cancel");
    if (!form || !cancelButton) return;
    form.addEventListener("submit", handleStorageSubmit);
    cancelButton.addEventListener("click", closeStorageModal);
    storageModalInitialized = true;
}

function openStorageModal(context) {
    initStorageModal();
    const modal = document.getElementById("storage-modal");
    const input = document.getElementById("storage-location-input");
    const submitButton = document.getElementById("storage-submit");
    const cancelButton = document.getElementById("storage-cancel");
    if (!modal || !input || !submitButton || !cancelButton) {
        alert("Storage modal is unavailable. Please try again.");
        return;
    }
    pendingCompletionContext = context;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    hideActionIconKey();
    input.value = "";
    input.focus();
    submitButton.disabled = false;
    cancelButton.disabled = false;
}

function closeStorageModal() {
    const modal = document.getElementById("storage-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        showActionIconKey();
    }
    pendingCompletionContext = null;
}

function setStorageModalLoading(isLoading) {
    const submitButton = document.getElementById("storage-submit");
    const cancelButton = document.getElementById("storage-cancel");
    if (submitButton) submitButton.disabled = isLoading;
    if (cancelButton) cancelButton.disabled = isLoading;
}

async function handleStorageSubmit(event) {
    event.preventDefault();
    if (!pendingCompletionContext) {
        closeStorageModal();
        return;
    }
    const { part, fromTab, index, triggerButton } = pendingCompletionContext;
    const input = document.getElementById("storage-location-input");
    if (!input) {
        closeStorageModal();
        return;
    }
    const location = input.value?.trim();
    const baseMisc = part.miscInfo || part.misc_info || {};
    const mergedMisc =
        location && location !== ""
            ? { ...baseMisc, storage: location }
            : { ...baseMisc };
    const payload =
        Object.keys(mergedMisc).length > 0 ? { miscInfo: mergedMisc } : {};
    try {
        setStorageModalLoading(true);
        if (triggerButton) triggerButton.disabled = true;
        const completedPart = await apiCompletePart(part.id, payload);
        updatePartInState(part.id, completedPart);
        if (fromTab === "cnc") renderCNC();
        else renderHandFab();
        renderCompleted();
    } catch (error) {
        console.error("Failed to complete part with storage location:", error);
        alert("Failed to save storage location. Please try again.");
    } finally {
        setStorageModalLoading(false);
        if (triggerButton) triggerButton.disabled = false;
        closeStorageModal();
    }
}

/**
 * Mark a part as completed
 * @param {string} fromTab - The tab the part is currently in
 * @param {number} index - The index of the part
 * @param {Event} event - The click event
 */
export async function markCompleted(fromTab, index, event) {
    const part = appState.parts[fromTab][index];
    const context = { part, fromTab, index, triggerButton: event?.target };
    if (shouldConfirmAmount(part)) {
        openCompleteAmountModal(context);
        return;
    }
    openStorageModal(context);
}

/**
 * Mark a completed part as uncompleted
 * @param {number} index - The index of the part in completed
 * @param {Event} event - The click event
 */
export async function markUncompleted(index, event) {
    const part = appState.parts.completed[index];

    try {
        // Disable the button during API call
        const button = event?.target;
        if (button) button.disabled = true;

        const updatedPart = await apiRevertPart(part.id);
        updatePartInState(part.id, updatedPart);

        // Re-render affected tabs
        renderCompleted();
        renderCNC();
        renderHandFab();
    } catch (error) {
        console.error("Failed to revert part:", error);
        alert("Failed to revert part. Please try again.");
    } finally {
        // Re-enable button
        const button = event?.target;
        if (button) button.disabled = false;
    }
}

/**
 * Approve a part from review and move to appropriate tab
 * @param {number} index - The index of the part in review
 * @param {Event} event - The click event
 */
export async function approvePart(index, event) {
    const part = appState.parts.review[index];
    openReviewDetails(part, async (payload) => {
        const updatedPart = await apiApprovePart(part.id, payload || {});
        updatePartInState(part.id, updatedPart);
    });
}

/**
 * Edit a part
 * @param {string} tab - The tab the part is in
 * @param {number} index - The index of the part
 */
export function editPart(tab, index) {
    const part = appState.parts[tab][index];
    const type = part.type || (tab === "cnc" ? "cnc" : "hand");

    openAddModal();
    document.getElementById("modal-title").innerText = `Edit Part`;
    document.getElementById("edit-mode").value = "true";
    document.getElementById("edit-index").value = index;
    document.getElementById("edit-origin-tab").value = tab;

    document.getElementById("input-category").value = type;
    document.getElementById("input-category").disabled = true;
    handleCategoryChange(type);

    document.getElementById("input-name").value = part.name || "";
    document.getElementById("input-part-id").value =
        part.partId || part.name || part.id || "";
    document.getElementById("input-material").value = part.material || "";
    document.getElementById("input-amount").value = part.amount || 1;
    document.getElementById("input-status").value = part.status;
    document
        .getElementById("input-status")
        .parentElement.classList.remove("hidden");
    document.getElementById("input-notes").value = part.notes || "";
    document.getElementById("input-onshape").value = part.onshapeUrl || "";
    document.getElementById("input-subsystem").value = part.subsystem || "";

    if (type === "hand") {
        document.getElementById("input-assigned").value = part.assigned || "";
        document.getElementById("file-name-display").innerText = "No file";
    } else {
        document.getElementById("file-name-display").innerText =
            part.file || "No file";
    }
}

/**
 * Delete a part
 * @param {string} tab - The tab the part is in
 * @param {number} index - The index of the part
 * @param {Event} event - The click event
 */
export async function deletePart(tab, index, event) {
    const part = appState.parts[tab][index];

    if (confirm("Delete this part?")) {
        try {
            // Disable the button during API call
            const button = event?.target;
            if (button) button.disabled = true;

            await apiDeletePart(part.id);
            removePartFromState(part.id);

            // Re-render all tabs since deletion affects global state
            renderReview();
            renderCNC();
            renderHandFab();
            renderCompleted();
        } catch (error) {
            console.error("Failed to delete part:", error);
            alert("Failed to delete part. Please try again.");
        } finally {
            // Re-enable button
            const button = event?.target;
            if (button) button.disabled = false;
        }
    }
}

/**
 * Mark a part as in progress
 * @param {string} tab - The tab the part is in
 * @param {number} index - The index of the part
 * @param {Event} event - The click event
 */
export async function markInProgress(tab, index, event) {
    const part = appState.parts[tab][index];

    if (tab === "hand" && (!part.assigned || part.assigned === "")) {
        // Open assignment modal for hand fabrication parts
        pendingAssignmentIndex = index;
        document.getElementById("assign-input").value = "";
        const modal = document.getElementById("assign-modal");
        const warning = document.getElementById("assign-warning");

        if (part.status === "Already Started") {
            warning.classList.remove("hidden");
            warning.classList.add("flex");
        } else {
            warning.classList.add("hidden");
            warning.classList.remove("flex");
        }

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        hideActionIconKey();
        setTimeout(() => document.getElementById("assign-input").focus(), 100);
        return;
    }

    // For CNC parts or already assigned hand parts, just update status
    try {
        // Disable the button during API call
        const button = event?.target;
        if (button) button.disabled = true;

        // For CNC parts, we need to update the part status via API
        const updateData = { status: "In Progress" };
        const updatedPart = await apiUpdatePart(part.id, updateData);
        updatePartInState(part.id, updatedPart);

        if (tab === "cnc") renderCNC();
        else renderHandFab();
    } catch (error) {
        console.error("Failed to update part status:", error);
        alert("Failed to update part status. Please try again.");
    } finally {
        // Re-enable button
        const button = event?.target;
        if (button) button.disabled = false;
    }
}

// Assignment Modal Management
let pendingAssignmentIndex = null;

/**
 * Close the assignment modal
 */
export function closeAssignModal() {
    const modal = document.getElementById("assign-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    showActionIconKey();
    pendingAssignmentIndex = null;
}

/**
 * Confirm assignment and mark part as in progress
 */
export async function confirmAssignment() {
    const name = document.getElementById("assign-input").value;
    if (name && name.trim() !== "") {
        const part = appState.parts.hand[pendingAssignmentIndex];

        try {
            const updatedPart = await apiAssignPart(part.id, name.trim());
            updatePartInState(part.id, updatedPart);

            renderHandFab();
            closeAssignModal();
        } catch (error) {
            console.error("Failed to assign part:", error);
            alert("Failed to assign part. Please try again.");
        }
    }
}

/**
 * Unclaim a part (remove assignment)
 * @param {number} index - The index of the part
 */
export function unclaimPart(index) {
    pendingUnclaimIndex = index;
    const modal = document.getElementById("unclaim-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    hideActionIconKey();
}

export function viewPartInfo(tab, index) {
    const part = appState.parts[tab]?.[index];
    if (part) {
        showPartInfo(part);
    }
}

/**
 * Close the unclaim modal
 */
export function closeUnclaimModal() {
    const modal = document.getElementById("unclaim-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    showActionIconKey();
    pendingUnclaimIndex = null;
}

/**
 * Confirm unclaim and remove assignment
 */
export async function confirmUnclaim() {
    if (pendingUnclaimIndex !== null) {
        const part = appState.parts.hand[pendingUnclaimIndex];

        try {
            const updatedPart = await apiUnclaimPart(part.id);
            updatePartInState(part.id, updatedPart);

            renderHandFab();
            closeUnclaimModal();
        } catch (error) {
            console.error("Failed to unclaim part:", error);
            alert("Failed to unclaim part. Please try again.");
        }
    }
}

// Unclaim Modal Management
let pendingUnclaimIndex = null;

function shouldConfirmAmount(part) {
    return Number.isFinite(part.amount) && part.amount > 1;
}

function openCompleteAmountModal(context) {
    pendingAmountConfirmation = context;
    const modal = document.getElementById("complete-amount-modal");
    const message = document.getElementById("complete-amount-message");
    const confirmButton = document.getElementById("complete-amount-confirm");
    const cancelButton = document.getElementById("complete-amount-cancel");
    if (!modal || !message || !confirmButton || !cancelButton) {
        openStorageModal(context);
        return;
    }
    message.innerText = `This part requires ${context.part.amount}. Have you completed all units?`;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    hideActionIconKey();
    confirmButton.disabled = false;
    cancelButton.disabled = false;
}

export function closeCompleteAmountModal() {
    const modal = document.getElementById("complete-amount-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        showActionIconKey();
    }
    pendingAmountConfirmation = null;
}

export function confirmCompleteAmount() {
    if (!pendingAmountConfirmation) return;
    const context = pendingAmountConfirmation;
    closeCompleteAmountModal();
    openStorageModal(context);
}
