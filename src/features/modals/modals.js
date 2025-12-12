// Modal Management Module
// Handles all modal dialogs and UI interactions

import { appState, toggleDisable3JSPreview } from "../state/state.js";
import { saveTabVisibility } from "../state/persistence.js";
import { hideActionIconKey, showActionIconKey } from "../auth/auth.js";
import { getCurrentTab, switchTab } from "../navigation/tabs.js";
import {
    openModal as openManagedModal,
    closeModal as closeManagedModal,
} from "../../core/dom/modalManager.js";

const MATERIAL_OPTIONS = ["Polycarb", "Aluminum", "Acrylic"];

/**
 * Open the settings modal
 */
export function openSettingsModal() {
    // Initialize checkbox states
    const disable3JSCheckbox = document.getElementById("check-disable-3js");
    if (disable3JSCheckbox) {
        disable3JSCheckbox.checked = appState.disable3JSPreview;
    }

    openManagedModal("settings-modal", {
        onOpen: hideActionIconKey,
    });
}

/**
 * Close the settings modal
 */
export function closeSettingsModal() {
    closeManagedModal("settings-modal", {
        onClose: showActionIconKey,
    });
}

/**
 * Toggle tab visibility in settings
 * @param {Event|string} eventOrTab - Change event or tab name string
 */
export function toggleTabVisibility(eventOrTab) {
    let tab;
    if (typeof eventOrTab === "string") {
        tab = eventOrTab;
    } else if (eventOrTab && eventOrTab.target) {
        // Get tab from data-tab attribute
        tab = eventOrTab.target.dataset.tab;
    }

    if (!tab) return;
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
 * Toggle disable 3JS preview setting
 */
export function toggleDisable3JS() {
    const checkbox = document.getElementById("check-disable-3js");
    if (!checkbox) return;

    toggleDisable3JSPreview();
}

/**
 * Open the add/edit part modal
 * @param {boolean} isNew - Whether this is a new part (true) or editing existing (false)
 */
export function openAddModal(isNew = false) {
    const modal = document.getElementById("modal");
    const form = document.getElementById("part-form");

    openManagedModal("modal", {
        onOpen: hideActionIconKey,
    });

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
        setMaterialField(MATERIAL_OPTIONS[0]);
        handleCategoryChange("cnc");
    }

    setTimeout(() => document.getElementById("input-name").focus(), 100);
}

/**
 * Close the add/edit part modal
 */
export function closeModal() {
    closeManagedModal("modal", {
        onClose: showActionIconKey,
    });
}

/**
 * Handle category change in the form
 * @param {Event|string} eventOrType - Change event or category type string
 */
export function handleCategoryChange(eventOrType) {
    let type;
    if (typeof eventOrType === "string") {
        type = eventOrType;
    } else if (eventOrType && eventOrType.target) {
        type = eventOrType.target.value;
    } else {
        return;
    }
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

export function handleMaterialChange(eventOrValue) {
    let selectedValue;
    if (typeof eventOrValue === "string") {
        selectedValue = eventOrValue;
    } else if (eventOrValue && eventOrValue.target) {
        selectedValue = eventOrValue.target.value;
    } else {
        return;
    }

    const materialSelect = document.getElementById("input-material-select");
    const customInput = document.getElementById("input-material-custom");
    if (!materialSelect || !customInput) return;

    if (selectedValue) {
        materialSelect.value = selectedValue;
    }

    const isCustom = materialSelect.value === "custom";
    customInput.classList.toggle("hidden", !isCustom);
    customInput.disabled = !isCustom;
    if (isCustom) {
        customInput.focus();
    }
}

export function setMaterialField(materialValue = "") {
    const normalizedMaterial = materialValue?.trim() || "";
    const materialSelect = document.getElementById("input-material-select");
    const customInput = document.getElementById("input-material-custom");
    if (!materialSelect || !customInput) return;

    const matchingOption = MATERIAL_OPTIONS.find(
        (option) => option.toLowerCase() === normalizedMaterial.toLowerCase()
    );

    if (matchingOption) {
        materialSelect.value = matchingOption;
        customInput.value = "";
        handleMaterialChange(matchingOption);
        return;
    }

    if (normalizedMaterial.length > 0) {
        materialSelect.value = "custom";
        customInput.value = normalizedMaterial;
        handleMaterialChange("custom");
        return;
    }

    materialSelect.value = MATERIAL_OPTIONS[0];
    customInput.value = "";
    handleMaterialChange(MATERIAL_OPTIONS[0]);
}
