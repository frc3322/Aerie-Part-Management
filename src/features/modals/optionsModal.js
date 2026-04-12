// Options Modal Module
// Manages the "Edit Pre-filled Options" popup for materials and subsystems

import { apiGet, apiPut } from "../../core/api/apiClient.js";
import { ENDPOINTS } from "../../core/api/endpoints.js";
import {
    openModal as openManagedModal,
    closeModal as closeManagedModal,
} from "../../core/dom/modalManager.js";
import {
    showSuccessNotification,
    showErrorNotification,
} from "../../core/dom/notificationManager.js";
import { setDropdownOptions } from "./modals.js";

// In-memory working copies while the modal is open
let _workingMaterials = [];
let _workingSubsystems = [];

/**
 * Fetch options from the server and apply them to the dropdowns.
 * Called once on app startup and after every successful save.
 */
export async function loadOptionsFromServer() {
    try {
        const data = await apiGet(ENDPOINTS.OPTIONS.GET);
        if (data && Array.isArray(data.materials) && Array.isArray(data.subsystems)) {
            setDropdownOptions(data.materials, data.subsystems);
            return data;
        }
    } catch (err) {
        console.warn("Could not load options from server, using defaults.", err);
    }
    return null;
}

/**
 * Open the options editor modal.
 * Fetches current options from the server before showing.
 */
export async function openOptionsModal() {
    try {
        const data = await apiGet(ENDPOINTS.OPTIONS.GET);
        _workingMaterials = Array.isArray(data?.materials) ? [...data.materials] : [];
        _workingSubsystems = Array.isArray(data?.subsystems) ? [...data.subsystems] : [];
    } catch (err) {
        showErrorNotification("Load Failed", "Could not fetch current options.");
        return;
    }

    renderLists();
    openManagedModal("options-modal");

    // Allow pressing Enter in the add inputs to trigger add
    setTimeout(() => {
        const matInput = document.getElementById("options-new-material");
        const subInput = document.getElementById("options-new-subsystem");
        if (matInput) {
            matInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addMaterial(); } };
        }
        if (subInput) {
            subInput.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addSubsystem(); } };
        }
    }, 50);
}

/** Close the modal without saving. */
export function closeOptionsModal() {
    closeManagedModal("options-modal");
}

/**
 * Save the working copies back to the server.
 * Called by the Save button inside the modal.
 */
export async function saveOptions() {
    const saveBtn = document.getElementById("options-save-btn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";
    }

    try {
        const data = await apiPut(ENDPOINTS.OPTIONS.UPDATE, {
            materials: _workingMaterials,
            subsystems: _workingSubsystems,
        });

        // Apply updated lists to the live dropdowns
        setDropdownOptions(data.materials, data.subsystems);
        showSuccessNotification("Saved", "Pre-filled options updated successfully.");
        closeOptionsModal();
    } catch (err) {
        showErrorNotification("Save Failed", err.message || "Could not save options.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
        }
    }
}

// ─── Add handlers (called from data-action on the form inputs) ─────────────

export function addMaterial() {
    const input = document.getElementById("options-new-material");
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    if (_workingMaterials.map((m) => m.toLowerCase()).includes(value.toLowerCase())) {
        showErrorNotification("Duplicate", `"${value}" is already in the list.`);
        return;
    }
    _workingMaterials.push(value);
    input.value = "";
    renderLists();
}

export function addSubsystem() {
    const input = document.getElementById("options-new-subsystem");
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    if (_workingSubsystems.map((s) => s.toLowerCase()).includes(value.toLowerCase())) {
        showErrorNotification("Duplicate", `"${value}" is already in the list.`);
        return;
    }
    _workingSubsystems.push(value);
    input.value = "";
    renderLists();
}

// ─── Internal rendering ────────────────────────────────────────────────────

function renderLists() {
    renderOptionList(
        "options-materials-list",
        _workingMaterials,
        (idx) => {
            _workingMaterials.splice(idx, 1);
            renderLists();
        },
    );
    renderOptionList(
        "options-subsystems-list",
        _workingSubsystems,
        (idx) => {
            _workingSubsystems.splice(idx, 1);
            renderLists();
        },
    );
}

function renderOptionList(containerId, items, onRemove) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "text-gray-500 text-sm italic py-2";
        empty.textContent = "No items. Add one below.";
        container.appendChild(empty);
        return;
    }

    items.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className =
            "flex items-center justify-between gap-2 neumorphic-input px-3 py-2 rounded-lg";

        const label = document.createElement("span");
        label.className = "text-gray-300 text-sm truncate";
        label.textContent = item;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className =
            "flex-shrink-0 text-gray-500 hover:text-red-400 transition-colors";
        removeBtn.title = `Remove "${item}"`;
        removeBtn.innerHTML = '<i class="fa-solid fa-times text-xs"></i>';
        removeBtn.addEventListener("click", () => onRemove(idx));

        row.appendChild(label);
        row.appendChild(removeBtn);
        container.appendChild(row);
    });
}
