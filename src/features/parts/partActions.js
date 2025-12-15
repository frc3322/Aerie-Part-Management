// Part Actions Module
// Handles part management actions like approve, complete, edit, delete

import {
    appState,
    updatePartInState,
    removePartFromState,
} from "../state/state.js";
import { renderReview } from "../tabs/review.js";
import { renderCNC } from "../tabs/cnc.js";
import { renderHandFab } from "../tabs/handFab.js";
import { renderCompleted } from "../tabs/completed.js";
import {
    openAddModal,
    handleCategoryChange,
    setMaterialField,
} from "../modals/modals.js";
import { hideActionIconKey, showActionIconKey } from "../auth/auth.js";
import {
    approvePart as apiApprovePart,
    assignPart as apiAssignPart,
    unclaimPart as apiUnclaimPart,
    completePart as apiCompletePart,
    revertPart as apiRevertPart,
    deletePart as apiDeletePart,
    updatePart as apiUpdatePart,
} from "../../core/api/router.js";
import { openReviewDetails, showPartInfo } from "../modals/infoModals.js";
import {
    openModal as openManagedModal,
    closeModal as closeManagedModal,
    setModalLoading,
} from "../../core/dom/modalManager.js";
import { withErrorHandling } from "../../core/api/router.js";
import {
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
} from "../../core/dom/notificationManager.js";
import { celebrateCompletion } from "../../utils/confetti.js";

let pendingStorageContext = null;
let pendingAmountConfirmation = null;
let storageModalInitialized = false;

const STORAGE_MODAL_MODES = {
    complete: {
        title: "Store Completed Part",
        description: "Where did you store the part?",
        submitLabel: "Save",
        readOnly: false,
    },
    unclaim: {
        title: "Where is the part stored?",
        description: "Save the storage location before unclaiming.",
        submitLabel: "Save and unclaim",
        readOnly: false,
    },
    claimInfo: {
        title: "Stored Location",
        description: "Retrieve the part from this location.",
        submitLabel: "Continue",
        readOnly: true,
    },
};

function getStorageLocation(part) {
    if (!part) return "";
    const misc = part.miscInfo || part.misc_info || {};
    return misc.storage || "";
}

function buildMiscWithStorage(part, location) {
    const baseMisc = part?.miscInfo || part?.misc_info || {};
    const trimmedLocation = location?.trim();
    if (trimmedLocation) {
        return { ...baseMisc, storage: trimmedLocation };
    }
    return { ...baseMisc };
}

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
    const input = document.getElementById("storage-location-input");
    const submitButton = document.getElementById("storage-submit");
    const cancelButton = document.getElementById("storage-cancel");
    const titleElement = document.getElementById("storage-modal-title");
    const descriptionElement = document.getElementById(
        "storage-modal-description"
    );
    if (!input || !submitButton || !cancelButton) {
        showErrorNotification(
            "Storage Error",
            "Storage modal is unavailable. Please try again."
        );
        return;
    }
    const mode = context?.mode || "complete";
    const config = STORAGE_MODAL_MODES[mode] || STORAGE_MODAL_MODES.complete;
    const initialValue =
        context?.initialValue ||
        (mode === "complete" ? "" : getStorageLocation(context?.part));
    pendingStorageContext = { ...context, mode };
    if (titleElement) titleElement.innerText = config.title;
    if (descriptionElement) descriptionElement.innerText = config.description;
    submitButton.innerText = config.submitLabel;
    input.value = initialValue || "";
    input.readOnly = Boolean(config.readOnly);
    input.disabled = false;
    submitButton.disabled = false;
    cancelButton.disabled = false;
    openManagedModal("storage-modal", {
        onOpen: hideActionIconKey,
        focusSelector: config.readOnly ? null : "#storage-location-input",
    });
    if (!config.readOnly) {
        input.focus();
    }
}

function closeStorageModal() {
    closeManagedModal("storage-modal", {
        onClose: showActionIconKey,
    });
    pendingStorageContext = null;
}

function setStorageModalLoading(isLoading) {
    setModalLoading("storage-modal", isLoading);
}

async function handleStorageSubmit(event) {
    event.preventDefault();
    if (!pendingStorageContext) {
        closeStorageModal();
        return;
    }
    const {
        part,
        fromTab,
        index,
        triggerButton,
        mode = "complete",
        onContinue,
    } = pendingStorageContext;
    const input = document.getElementById("storage-location-input");
    if (!input) {
        closeStorageModal();
        return;
    }
    const rawLocation = input.value?.trim();
    const storageLocation =
        rawLocation && rawLocation !== ""
            ? rawLocation
            : getStorageLocation(part);
    const mergedMisc = buildMiscWithStorage(part, storageLocation);
    const payload =
        Object.keys(mergedMisc).length > 0 ? { miscInfo: mergedMisc } : {};
    if (mode === "unclaim" && !storageLocation) {
        showWarningNotification(
            "Storage Required",
            "Please provide the storage location before unclaiming."
        );
        return;
    }
    const shouldShowLoading = mode !== "claimInfo";
    if (shouldShowLoading) setStorageModalLoading(true);
    if (triggerButton && shouldShowLoading) triggerButton.disabled = true;
    await withErrorHandling(
        async () => {
            if (mode === "complete") {
                const completedPart = await apiCompletePart(part.id, payload);
                updatePartInState(part.id, completedPart);
                if (fromTab === "cnc") renderCNC();
                else renderHandFab();
                renderCompleted();

                // 🎉 Celebrate the completion!
                celebrateCompletion();
            } else if (mode === "unclaim") {
                await apiUpdatePart(part.id, payload);
                const unclaimedPart = await apiUnclaimPart(part.id);
                updatePartInState(part.id, unclaimedPart);
                renderHandFab();
            } else if (mode === "claimInfo") {
                if (typeof onContinue === "function") {
                    onContinue();
                }
            }
        },
        {
            onError: () =>
                showErrorNotification(
                    "Storage Error",
                    "Failed to save storage location. Please try again."
                ),
            onFinally: () => {
                if (shouldShowLoading) setStorageModalLoading(false);
                if (triggerButton && shouldShowLoading)
                    triggerButton.disabled = false;
                closeStorageModal();
            },
        }
    );
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

    const button = event?.target;
    await withErrorHandling(
        async () => {
            const updatedPart = await apiRevertPart(part.id);
            updatePartInState(part.id, updatedPart);
            renderCompleted();
            renderCNC();
            renderHandFab();
        },
        {
            loadingTargets: button,
            onError: () =>
                showErrorNotification(
                    "Revert Failed",
                    "Failed to revert part. Please try again."
                ),
        }
    );
}

/**
 * Approve a part from review and move to appropriate tab
 * @param {number} index - The index of the part in review
 * @param {Event} event - The click event
 */
export async function approvePart(index, event) {
    const part = appState.parts.review[index];
    console.log(
        "[approvePart] Starting approval for part:",
        part.id,
        part.name
    );
    console.log(
        "[approvePart] Current review parts count:",
        appState.parts.review.length
    );
    openReviewDetails(part, async (payload) => {
        console.log(
            "[approvePart] onSubmit callback called with payload:",
            payload
        );
        const updatedPart = await apiApprovePart(part.id, payload || {});
        console.log("[approvePart] API returned updated part:", updatedPart);
        console.log(
            "[approvePart] Updated part category:",
            updatedPart.category
        );
        console.log(
            "[approvePart] Before updatePartInState - review count:",
            appState.parts.review.length
        );
        updatePartInState(part.id, updatedPart);
        console.log(
            "[approvePart] After updatePartInState - review count:",
            appState.parts.review.length
        );
        console.log(
            "[approvePart] Review parts:",
            appState.parts.review.map((p) => ({ id: p.id, name: p.name }))
        );
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
    setMaterialField(part.material || "");
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
        const button = event?.target;
        await withErrorHandling(
            async () => {
                await apiDeletePart(part.id);
                removePartFromState(part.id);
                renderReview();
                renderCNC();
                renderHandFab();
                renderCompleted();
            },
            {
                loadingTargets: button,
                onError: () =>
                    showErrorNotification(
                        "Delete Failed",
                        "Failed to delete part. Please try again."
                    ),
            }
        );
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
        const hasStoredLocation = Boolean(getStorageLocation(part));
        if (hasStoredLocation) {
            openAssignModal(part, index, {
                showStorageOnAssign: true,
                storageLocation: getStorageLocation(part),
            });
        } else {
            openAssignModal(part, index);
        }
        return;
    }

    // For CNC parts or already assigned hand parts, just update status
    const button = event?.target;
    await withErrorHandling(
        async () => {
            const updateData = { status: "In Progress" };
            const updatedPart = await apiUpdatePart(part.id, updateData);
            updatePartInState(part.id, updatedPart);
            if (tab === "cnc") renderCNC();
            else renderHandFab();
        },
        {
            loadingTargets: button,
            onError: () =>
                showErrorNotification(
                    "Status Update Failed",
                    "Failed to update part status. Please try again."
                ),
        }
    );
}

// Assignment Modal Management
let pendingAssignmentIndex = null;
let pendingAssignShowStorageLocation = false;
let pendingAssignStorageLocation = "";

function openAssignModal(part, index, options = {}) {
    pendingAssignmentIndex = index;
    pendingAssignShowStorageLocation = Boolean(options.showStorageOnAssign);
    pendingAssignStorageLocation =
        options.storageLocation || getStorageLocation(part) || "";
    const assignInput = document.getElementById("assign-input");
    const modal = document.getElementById("assign-modal");
    const warning = document.getElementById("assign-warning");
    if (assignInput) assignInput.value = "";
    if (warning) {
        if (part.status === "Already Started") {
            warning.classList.remove("hidden");
            warning.classList.add("flex");
        } else {
            warning.classList.add("hidden");
            warning.classList.remove("flex");
        }
    }
    if (modal) {
        openManagedModal("assign-modal", {
            onOpen: hideActionIconKey,
            focusSelector: "#assign-input",
        });
    }
    if (assignInput) {
        setTimeout(() => assignInput.focus(), 100);
    }
}

/**
 * Close the assignment modal
 */
export function closeAssignModal() {
    closeAssignModalInternal(false);
}

function closeAssignModalInternal(skipShowActionIcon) {
    const modal = document.getElementById("assign-modal");
    closeManagedModal("assign-modal", {
        onClose: skipShowActionIcon ? undefined : showActionIconKey,
    });
    pendingAssignmentIndex = null;
    pendingAssignShowStorageLocation = false;
    pendingAssignStorageLocation = "";
}

/**
 * Handle Enter key press in assign input
 * @param {Event} event - Keyup event from event delegation
 */
export function handleAssignKeyup(event) {
    if (event.key === "Enter") {
        confirmAssignment();
    }
}

/**
 * Confirm assignment and mark part as in progress
 */
export async function confirmAssignment() {
    const name = document.getElementById("assign-input").value;
    if (name && name.trim() !== "") {
        const part = appState.parts.hand[pendingAssignmentIndex];

        await withErrorHandling(
            async () => {
                const updatedPart = await apiAssignPart(part.id, name.trim());
                updatePartInState(part.id, updatedPart);
                renderHandFab();
                const shouldShowStorage =
                    pendingAssignShowStorageLocation &&
                    Boolean(pendingAssignStorageLocation);
                closeAssignModalInternal(shouldShowStorage);
                if (shouldShowStorage) {
                    openStorageModal({
                        mode: "claimInfo",
                        part: updatedPart,
                        fromTab: "hand",
                        index: pendingAssignmentIndex,
                        initialValue: pendingAssignStorageLocation,
                    });
                }
            },
            {
                onError: () =>
                    showErrorNotification(
                        "Assignment Failed",
                        "Failed to assign part. Please try again."
                    ),
            }
        );
    }
}

/**
 * Unclaim a part (remove assignment)
 * @param {number} index - The index of the part
 */
export function unclaimPart(index) {
    pendingUnclaimIndex = index;
    openManagedModal("unclaim-modal", {
        onOpen: hideActionIconKey,
    });
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
    closeManagedModal("unclaim-modal", {
        onClose: showActionIconKey,
    });
    pendingUnclaimIndex = null;
}

/**
 * Confirm unclaim and remove assignment
 */
export async function confirmUnclaim() {
    if (pendingUnclaimIndex !== null) {
        const part = appState.parts.hand[pendingUnclaimIndex];
        const storageLocation = getStorageLocation(part);
        const index = pendingUnclaimIndex;
        closeUnclaimModal();
        openStorageModal({
            mode: "unclaim",
            part,
            fromTab: "hand",
            index,
            initialValue: storageLocation,
        });
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
    openManagedModal("complete-amount-modal", {
        onOpen: hideActionIconKey,
    });
    confirmButton.disabled = false;
    cancelButton.disabled = false;
}

export function closeCompleteAmountModal() {
    closeManagedModal("complete-amount-modal", {
        onClose: showActionIconKey,
    });
    pendingAmountConfirmation = null;
}

export function confirmCompleteAmount() {
    if (!pendingAmountConfirmation) return;
    const context = pendingAmountConfirmation;
    closeCompleteAmountModal();
    openStorageModal(context);
}
