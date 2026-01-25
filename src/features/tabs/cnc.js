// CNC Tab Module
// Handles the CNC tab display and functionality

import { appState } from "../state/state.js";
import { showErrorNotification } from "../../core/dom/notificationManager.js";
import { getState } from "../../core/state/reactiveState.js";
import {
    filterParts,
    getStatusClass,
    getFileExtension,
    sortArrayByKey,
} from "../../core/utils/helpers.js";
import { loadPartStaticViews } from "../../components/threeDViewer.js";
import { getPartFileBlobUrl, downloadPartFile } from "../../core/api/router.js";

/**
 * Render loading state for CNC tab
 * @param {HTMLElement} container - The container element
 */
function renderLoadingState(container) {
    const loadingState = document.createElement("div");
    loadingState.className = "col-span-full text-center py-8 text-gray-500";
    loadingState.innerHTML =
        '<div class="flex items-center justify-center"><i class="fa-solid fa-spinner fa-spin text-blue-400 mr-2"></i> Loading CNC parts...</div>';
    container.appendChild(loadingState);
}

/**
 * Render empty state for CNC tab
 * @param {HTMLElement} container - The container element
 */
function renderEmptyState(container) {
    const emptyState = document.createElement("div");
    emptyState.className = "col-span-full text-center py-8 text-gray-500";
    emptyState.innerHTML = appState.searchQuery
        ? "<p>No results found.</p>"
        : "<p>No CNC parts available.</p>";
    container.appendChild(emptyState);
}

function buildHeaderSection(part, statusClass) {
    const cadLink = part.onshapeUrl
        ? `<div class="w-10 h-10 bg-gray-800 rounded-lg border border-gray-700 shrink-0 flex items-center justify-center text-purple-400 cursor-pointer active:scale-95 transition-transform" onclick="window.open('${part.onshapeUrl}', '_blank')" title="View CAD">
             <i class="fa-solid fa-cube text-lg"></i>
           </div>`
        : "";
    return `
    <div class="flex justify-between items-start">
      <div class="flex gap-3">
        ${cadLink}
        <div>
          <h3 class="text-xl font-bold text-blue-300">${
              part.name || "Unnamed"
          }</h3>
          <div class="text-sm text-blue-200 font-semibold mt-1">Amount: ${
              part.amount
          }</div>
          <div class="text-xs text-gray-500 mt-1">ID: ${
              part.partId || part.id || "N/A"
          }</div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-800 ${statusClass} shadow-3d-inset status-indicator">
          ${part.status}
        </span>
        <div class="text-sm text-gray-400">Subsystem: <span class="text-blue-300 font-semibold">${
            part.subsystem || "Not set"
        }</span></div>
        <div class="text-sm text-gray-400">Material: <span class="text-blue-300 font-semibold">${
            part.material || "Not set"
        }</span></div>
      </div>
    </div>
  `;
}

function buildModelPlaceholder(fileExt, is3JSPreviewDisabled) {
    if (fileExt === "step" || fileExt === "stp") {
        if (is3JSPreviewDisabled) {
            return `
      <div class="absolute inset-0 flex items-center justify-center text-center text-gray-400">
        <div>
          <i class="fa-solid fa-cube text-3xl mb-2"></i>
          <p class="text-xs">3D Preview Disabled</p>
        </div>
      </div>
    `;
        }
        return `
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <i class="fa-solid fa-cube text-4xl text-blue-500 mb-2 animate-pulse"></i>
          <p class="text-xs text-gray-400">Loading model...</p>
        </div>
      </div>
    `;
    }
    if (fileExt === "pdf") {
        return `
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <i class="fa-solid fa-file-pdf text-4xl text-red-400 mb-2 animate-pulse"></i>
          <p class="text-xs text-gray-400">Loading PDF...</p>
        </div>
      </div>
    `;
    }
    return `
    <div class="absolute inset-0 flex items-center justify-center text-center text-gray-600">
      <div>
        <i class="fa-solid fa-cloud-upload text-3xl mb-2"></i>
        <p class="text-xs">No File</p>
      </div>
    </div>
  `;
}

function buildNotesSection(part) {
    return `
    <div class="p-3 rounded-lg shadow-3d-inset min-h-[60px]" style="background-color: #1f232cf2">
      <p class="text-sm text-gray-400 italic">"${part.notes || "No notes"}"</p>
    </div>
  `;
}

function buildActionButtons(part, index, showInfoEditButtons) {
    const inProgress =
        part.status === "In Progress" || part.status === "Already Started";
    const reviewed = part.status === "Reviewed";
    const downloadButton = part.file
        ? `<button data-action="downloadStepFile" data-part-id="${part.id}" data-filename="${part.file}" class="neumorphic-btn px-2 py-1 text-purple-400 hover:text-purple-300" title="Download File"><i class="fa-solid fa-download"></i> Download</button>`
        : "";
    const infoButtons = showInfoEditButtons
        ? `<button data-action="viewPartInfo" data-tab="cnc" data-index="${index}" class="text-gray-400 hover:text-blue-300 transition" aria-label="Part info"><i class="fa-solid fa-circle-info"></i></button>
       <button data-action="editPart" data-tab="cnc" data-index="${index}" class="text-gray-400 hover:text-blue-400 transition" aria-label="Edit part"><i class="fa-solid fa-pen"></i></button>`
        : "";
    const statusButton = inProgress
        ? `<button data-action="markCompleted" data-tab="cnc" data-index="${index}" class="neumorphic-btn px-2 py-1 text-green-400 hover:text-green-300 mr-auto" title="Mark Completed"><i class="fa-solid fa-check-circle"></i> Done</button>`
        : reviewed
        ? `<button data-action="markInProgress" data-tab="cnc" data-index="${index}" class="neumorphic-btn px-2 py-1 text-blue-400 hover:text-blue-300 mr-auto" title="Mark In Progress"><i class="fa-solid fa-play"></i> Start</button>`
        : "";

    return `
    <div class="flex justify-end mt-2 gap-2 action-buttons">
      ${statusButton}
      ${downloadButton}
      ${infoButtons}
      <button data-action="deletePart" data-tab="cnc" data-index="${index}" class="text-gray-400 hover:text-red-400 transition" aria-label="Delete part"><i class="fa-solid fa-trash"></i></button>
    </div>
  `;
}

/**
 * Render a single part card
 * @param {Object} part - The part data
 * @param {number} index - The part index
 * @param {HTMLElement} container - The container element
 */
function renderPartCard(part, index, container) {
    const statusClass = getStatusClass(part.status);
    const showInfoEditButtons = true;
    const card = document.createElement("div");
    card.className =
        "cnc-card p-5 flex flex-col gap-3 transform transition hover:scale-[1.02] duration-300";

    const fileExt = getFileExtension(part.file);

    const header = buildHeaderSection(part, statusClass);
    const is3JSPreviewDisabled = getState("disable3JSPreview");
    const modelPlaceholder = buildModelPlaceholder(
        fileExt,
        is3JSPreviewDisabled
    );
    const notesSection = buildNotesSection(part);
    const actions = buildActionButtons(part, index, showInfoEditButtons);

    card.innerHTML = `
    ${header}
    <div class="h-48 w-full rounded-lg relative overflow-hidden shadow-3d-inset" id="model-view-${index}" style="background-color: #1f232cf2">
      ${modelPlaceholder}
    </div>
    ${notesSection}
    ${actions}
  `;

    container.appendChild(card);
}

/**
 * Load 3D model for a part
 * @param {Object} part - The part data
 * @param {number} index - The part index
 */
function loadPartModel(part, index) {
    if (!part.file) return;

    const fileExt = getFileExtension(part.file);
    const containerId = `model-view-${index}`;
    const is3JSPreviewDisabled = getState("disable3JSPreview");

    setTimeout(async () => {
        try {
            if (fileExt === "pdf") {
                const fileUrl = await getPartFileBlobUrl(part.id);
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = `
            <iframe src="${fileUrl}" class="absolute inset-0 w-full h-full border-0 bg-white"></iframe>
            <div class="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-xs text-white px-2 py-1 rounded">PDF Preview</div>
          `;
                }
                return;
            }

            // Check if 3JS previews are disabled
            if (
                is3JSPreviewDisabled &&
                (fileExt === "step" || fileExt === "stp")
            ) {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = `
          <div class="absolute inset-0 flex items-center justify-center text-center text-gray-400">
            <div>
              <i class="fa-solid fa-cube text-3xl mb-2"></i>
              <p class="text-xs">3D Preview Disabled</p>
            </div>
          </div>
        `;
                }
                return;
            }

            if (fileExt === "step" || fileExt === "stp") {
                await loadPartStaticViews(containerId, part);
            }
        } catch (error) {
            console.error("Failed to load file:", error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
          <div class="absolute inset-0 flex items-center justify-center text-center text-red-400">
            <div>
              <i class="fa-solid fa-exclamation-triangle text-2xl mb-2"></i>
              <p class="text-xs">Failed to load file</p>
            </div>
          </div>
        `;
            }
        }
    }, 0);
}

/**
 * Render the CNC tab
 */
export function renderCNC() {
    const container = document.getElementById("cnc-cards-grid");
    if (!container) return;
    container.innerHTML = "";

    if (
        appState.loadingTab === "cnc" ||
        (appState.isLoading && appState.parts.cnc.length === 0)
    ) {
        renderLoadingState(container);
        return;
    }

    const prioritized = prioritizeParts(appState.parts.cnc);
    const filtered = filterParts(prioritized, appState.searchQuery);
    const sorted = applySorting(filtered);
    const is3JSPreviewDisabled = getState("disable3JSPreview");

    if (sorted.length === 0) {
        renderEmptyState(container);
        return;
    }

    for (const part of sorted) {
        const index = appState.parts.cnc.indexOf(part);
        renderPartCard(part, index, container);
        const fileExt = getFileExtension(part.file);
        const shouldSkip3DPreview =
            is3JSPreviewDisabled && (fileExt === "step" || fileExt === "stp");
        if (!shouldSkip3DPreview) {
            loadPartModel(part, index);
        }
    }
    
    // Update sort button states after render
    setTimeout(() => updateSortIcons(), 0);
}

/**
 * Download the stored file for a part
 * @param {number} partId - Part ID
 * @param {string} filename - Filename for download
 */
export async function downloadStepFile(partId, filename) {
    try {
        await downloadPartFile(partId, filename);
    } catch (error) {
        console.error("Failed to download file:", error);
        showErrorNotification(
            "Download Failed",
            "Failed to download file. Please try again."
        );
    }
}

/**
 * Order parts so in-progress items surface first.
 * @param {Array} parts
 * @returns {Array}
 */
function prioritizeParts(parts) {
    const cloned = [...parts];
    const getPriority = (status) => {
        if (status === "In Progress" || status === "Already Started") return 1;
        if (status === "Reviewed") return 2;
        return 3;
    };
    return cloned.sort((a, b) => getPriority(a.status) - getPriority(b.status));
}

/**
 * Apply sorting to parts based on current sort state
 * @param {Array} parts - Array of parts to sort
 * @returns {Array} Sorted array
 */
function applySorting(parts) {
    const sortState = appState.sortState.cnc;
    // If no sort key (null state), return parts as-is
    if (!sortState || !sortState.key || sortState.key === null) {
        return parts;
    }
    
    const cloned = [...parts];
    return sortArrayByKey(cloned, sortState.key, sortState.direction);
}

/**
 * Update sort icons to show active sort state
 */
function updateSortIcons() {
    const sortState = appState.sortState.cnc;
    const activeKey = sortState?.key;
    const direction = sortState?.direction || 1;
    const buttons = document.querySelectorAll('[data-action="sortCNC"]');
    
    buttons.forEach((button) => {
        const buttonKey = button.dataset.sortKey;
        const icon = button.querySelector('.sort-icon');
        
        if (!icon) return;
        
        // Reset icon classes using classList
        icon.classList.remove("fa-sort", "fa-sort-up", "fa-sort-down");
        
        // Reset button classes - remove blue styling
        button.classList.remove("text-blue-400");
        button.classList.add("text-gray-300");
        
        if (buttonKey === activeKey && activeKey !== null) {
            // Active sorting - make button blue and show appropriate arrow
            button.classList.remove("text-gray-300");
            button.classList.add("text-blue-400");
            
            if (direction === 1) {
                icon.classList.add("fa-sort-up");
            } else {
                icon.classList.add("fa-sort-down");
            }
        } else {
            // Not sorting - show default sort icon
            icon.classList.add("fa-sort");
        }
    });
}
