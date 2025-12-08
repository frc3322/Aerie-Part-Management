// CNC Tab Module
// Handles the CNC tab display and functionality

import { appState } from "./state.js";
import { filterParts, getStatusClass } from "../utils/helpers.js";
import { loadGLTFModel } from "../components/threeDViewer.js";
import { getPartModelBlobUrl, downloadPartFile } from "../utils/partsApi.js";

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

/**
 * Render a single part card
 * @param {Object} part - The part data
 * @param {number} index - The part index
 * @param {HTMLElement} container - The container element
 */
function renderPartCard(part, index, container) {
  const statusClass = getStatusClass(part.status);
  const card = document.createElement("div");
  card.className =
    "neumorphic-card p-5 flex flex-col gap-3 transform transition hover:scale-[1.02] duration-300";

  card.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="text-xl font-bold text-blue-300">${part.name}</h3>
                <span class="text-xs text-gray-500">${part.id}</span>
                <div class="text-sm text-gray-400 mt-1">
                    Subsystem: <span class="text-blue-300 font-semibold">${
                      part.subsystem || "Not set"
                    }</span>
                </div>
                <div class="text-sm text-gray-400 mt-1">
                    Material: <span class="text-blue-300 font-semibold">${
                      part.material || "Not set"
                    }</span>
                </div>
                <div class="text-sm text-gray-400 mt-1">
                    Amount: <span class="text-blue-300 font-semibold">${
                      part.amount
                    }</span>
                </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-800 ${statusClass} shadow-3d-inset">
                ${part.status}
            </span>
        </div>

        <div class="h-48 w-full bg-gray-800 rounded-lg relative overflow-hidden shadow-3d-inset" id="model-view-${index}">
            ${
              part.file
                ? `<div class="absolute inset-0 flex items-center justify-center">
                        <div class="text-center">
                            <i class="fa-solid fa-cube text-4xl text-blue-500 mb-2 animate-pulse"></i>
                            <p class="text-xs text-gray-400">Loading model...</p>
                        </div>
                    </div>`
                : `<div class="absolute inset-0 flex items-center justify-center text-center text-gray-600">
                        <div>
                            <i class="fa-solid fa-cloud-upload text-3xl mb-2"></i>
                            <p class="text-xs">No Model</p>
                        </div>
                    </div>`
            }
        </div>

        <div class="bg-gray-800 p-3 rounded-lg shadow-3d-inset min-h-[60px]">
            <p class="text-sm text-gray-400 italic">"${
              part.notes || "No notes"
            }"</p>
        </div>

        <div class="flex justify-end mt-2 gap-2">
            <button onclick="globalThis.markCompleted('cnc', ${index})" class="neumorphic-btn px-2 py-1 text-green-400 hover:text-green-300 mr-auto" title="Mark Completed"><i class="fa-solid fa-check-circle"></i> Done</button>
            ${
              part.file
                ? `<button onclick="globalThis.downloadStepFile(${part.id}, '${part.file}')" class="neumorphic-btn px-2 py-1 text-purple-400 hover:text-purple-300" title="Download STEP File"><i class="fa-solid fa-download"></i> STEP</button>`
                : ""
            }
            ${
              part.status === "Reviewed"
                ? `<button onclick="globalThis.markInProgress('cnc', ${index})" class="neumorphic-btn px-2 py-1 text-blue-400 hover:text-blue-300 mr-2" title="Mark In Progress"><i class="fa-solid fa-play"></i> Start</button>`
                : ""
            }
            <button onclick="globalThis.editPart('cnc', ${index})" class="text-gray-400 hover:text-blue-400 transition"><i class="fa-solid fa-pen"></i></button>
            <button onclick="globalThis.deletePart('cnc', ${index})" class="text-gray-400 hover:text-red-400 transition"><i class="fa-solid fa-trash"></i></button>
        </div>
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

  setTimeout(async () => {
    try {
      const modelUrl = await getPartModelBlobUrl(part.id);
      loadGLTFModel(`model-view-${index}`, modelUrl);
    } catch (error) {
      console.error("Failed to load model:", error);
      const container = document.getElementById(`model-view-${index}`);
      if (container) {
        container.innerHTML = `
                    <div class="absolute inset-0 flex items-center justify-center text-center text-red-400">
                        <div>
                            <i class="fa-solid fa-exclamation-triangle text-2xl mb-2"></i>
                            <p class="text-xs">Failed to load model</p>
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
  const container = document.getElementById("content-cnc");
  container.innerHTML = "";

  if (
    appState.loadingTab === "cnc" ||
    (appState.isLoading && appState.parts.cnc.length === 0)
  ) {
    renderLoadingState(container);
    return;
  }

  const filtered = filterParts(appState.parts.cnc, appState.searchQuery);

  if (filtered.length === 0) {
    renderEmptyState(container);
    return;
  }

  for (const part of filtered) {
    const index = appState.parts.cnc.indexOf(part);
    renderPartCard(part, index, container);
    loadPartModel(part, index);
  }
}

/**
 * Download STEP file for a part
 * @param {number} partId - Part ID
 * @param {string} filename - Filename for download
 */
export async function downloadStepFile(partId, filename) {
  try {
    await downloadPartFile(partId, filename);
  } catch (error) {
    console.error("Failed to download file:", error);
    alert("Failed to download file. Please try again.");
  }
}
