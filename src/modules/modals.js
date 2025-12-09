// Modal Management Module
// Handles all modal dialogs and UI interactions

import { appState } from "./state.js";
import { saveTabVisibility } from "./persistence.js";
import { hideActionIconKey, showActionIconKey } from "./auth.js";

/**
 * Open the settings modal
 */
export function openSettingsModal() {
    const modal = document.getElementById("settings-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    hideActionIconKey();
}

/**
 * Close the settings modal
 */
export function closeSettingsModal() {
    const modal = document.getElementById("settings-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    showActionIconKey();
}

/**
 * Toggle tab visibility in settings
 * @param {string} tab - The tab to toggle
 */
export function toggleTabVisibility(tab) {
    const checkbox = document.getElementById(`check-${tab}`);
    const btn = document.getElementById(`tab-${tab}`);
    const isVisible = checkbox.checked;

    // Update state
    appState.tabVisibility[tab] = isVisible;

    // Save to localStorage
    saveTabVisibility(appState.tabVisibility);

    if (isVisible) {
        btn.classList.remove("hidden");
    } else {
        btn.classList.add("hidden");
        // If we just hid the active tab, switch to another
        const currentTab = getCurrentTab();
        if (currentTab === tab) {
            const tabs = ["review", "cnc", "hand", "completed"];
            const nextVisible = tabs.find(
                (t) => document.getElementById(`check-${t}`).checked
            );
            if (nextVisible) switchTab(nextVisible);
        }
    }
}

/**
 * Get the current active tab
 * @returns {string} The current tab name
 */
function getCurrentTab() {
    const activeTab = document.querySelector(".active-tab");
    return activeTab ? activeTab.id.replace("tab-", "") : "review";
}

/**
 * Switch to a different tab
 * @param {string} tab - The tab to switch to
 */
function switchTab(tab) {
    if (typeof globalThis.switchTab === "function") {
        globalThis.switchTab(tab);
    }
}

/**
 * Open the add/edit part modal
 * @param {boolean} isNew - Whether this is a new part (true) or editing existing (false)
 */
export function openAddModal(isNew = false) {
    const modal = document.getElementById("modal");
    const form = document.getElementById("part-form");

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    hideActionIconKey();

    if (isNew) {
        document.getElementById("modal-title").innerText =
            "Add Part for Review";
        form.reset();
        document.getElementById("edit-mode").value = "false";
        document.getElementById("edit-index").value = "";
        document.getElementById("edit-origin-tab").value = "review";
        document.getElementById("input-status").value = "Pending";
        document
            .getElementById("input-status")
            .parentElement.classList.add("hidden");
        document.getElementById("input-category").disabled = false;
        document.getElementById("input-category").value = "cnc";
        document.getElementById("file-name-display").innerText =
            "No file chosen";
        document.getElementById("input-onshape").value = "";
        document.getElementById("input-amount").value = "1";
        handleCategoryChange("cnc");
    }

    setTimeout(() => document.getElementById("input-name").focus(), 100);
}

/**
 * Close the add/edit part modal
 */
export function closeModal() {
    document.getElementById("modal").classList.add("hidden");
    document.getElementById("modal").classList.remove("flex");
    showActionIconKey();
}

/**
 * Handle category change in the form
 * @param {string} type - The category type ('cnc' or 'hand')
 */
export function handleCategoryChange(type) {
    const subField = document.getElementById("field-subsystem");
    const assignField = document.getElementById("field-assigned");
    const fileField = document.getElementById("field-file");
    const fileLabel = document.getElementById("label-file");
    const isEdit = document.getElementById("edit-mode").value === "true";
    const originTab = document.getElementById("edit-origin-tab").value;

    subField.classList.remove("hidden");

    if (type === "cnc") {
        assignField.classList.add("hidden");
        fileField.classList.remove("hidden");
        fileLabel.innerText = "File (STEP or PDF)";
        const fileInput = document.getElementById("input-file");
        if (fileInput) {
            fileInput.setAttribute("accept", ".step,.stp,.pdf");
        }
    } else {
        fileField.classList.add("hidden");
        if (isEdit && originTab !== "review" && originTab !== "completed") {
            assignField.classList.remove("hidden");
        } else {
            assignField.classList.add("hidden");
            document.getElementById("input-assigned").value = "";
        }
        if (fileField) {
            fileField.classList.add("hidden");
        }
    }
}

/**
 * Update the file name display
 */
export function updateFileName() {
    const input = document.getElementById("input-file");
    const display = document.getElementById("file-name-display");
    if (input.files.length > 0) display.innerText = input.files[0].name;
}
