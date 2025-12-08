// Hand Fabrication Tab Module
// Handles the hand fabrication tab display and functionality

import { appState } from "./state.js";
import { filterParts, getStatusClass } from "../utils/helpers.js";

/**
 * Calculate days claimed HTML for a part
 * @param {Object} part - The part object
 * @returns {string} HTML string for days claimed indicator
 */
export function calculateDaysClaimedHTML(part) {
  if (part.status !== "In Progress" || !part.assigned || !part.claimedDate) {
    return "";
  }

  const now = new Date();
  const claimed = new Date(part.claimedDate);
  const diffTime = Math.abs(now - claimed);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Color logic: 0 (green) -> 5 (red)
  let r, g;
  if (diffDays <= 0) {
    r = 0;
    g = 255;
  } else if (diffDays >= 5) {
    r = 255;
    g = 0;
  } else {
    // Interpolate
    const ratio = diffDays / 5;
    r = Math.floor(255 * ratio);
    g = Math.floor(255 * (1 - ratio));
  }

  return `<div class="ml-2 w-5 h-5 rounded text-[10px] flex items-center justify-center text-black font-bold shadow-sm" style="background-color: rgb(${r}, ${g}, 0);" title="Days Claimed: ${diffDays}">
                                ${diffDays}
                               </div>`;
}

/**
 * Create a hand fabrication table row
 * @param {Object} part - The part object
 * @param {number} index - The index of the part
 * @returns {HTMLElement} The created table row element
 */
export function createHandFabRow(part, index) {
  const daysClaimedHTML = calculateDaysClaimedHTML(part);
  const statusClass = getStatusClass(part.status);
  const showStartButton =
    part.status === "Reviewed" || part.status === "Already Started";
  const showCompleteButton =
    part.status === "In Progress" || part.status === "Already Started";
  const hasDrawing = Boolean(part.onshapeUrl);

  const cadPreview = `<div class="w-12 h-12 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-purple-400 cursor-pointer hover:border-purple-400 transition overflow-hidden relative group" onclick="window.open('${
    part.onshapeUrl || "#"
  }', '_blank')" title="View CAD">
                                    <i class="fa-solid fa-cube text-lg group-hover:scale-110 transition-transform"></i>
                            </div>`;

  const row = document.createElement("tr");
  row.className =
    "border-b border-gray-800 hover:bg-gray-800 transition duration-200";

  row.innerHTML = `
        <td class="p-3">
            ${cadPreview}
        </td>
        <td class="p-3">
            <div class="font-mono text-sm text-blue-200 font-bold">${
              part.name || "Unnamed"
            }</div>
            <div class="text-xs text-gray-500">ID: ${
              part.partId || part.id || "N/A"
            }</div>
        </td>
        <td class="p-3">${part.subsystem || "-"}</td>
        <td class="p-3 text-sm text-blue-300 font-semibold">${
          part.material || "-"
        }</td>
        <td class="p-3 text-sm text-blue-200 font-semibold">${part.amount}</td>
        <td class="p-3">
            <div class="flex items-center">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-xs flex items-center justify-center text-white font-bold">
                        ${part.assigned ? part.assigned.charAt(0) : "?"}
                    </div>
                    ${part.assigned || "Unassigned"}
                </div>
                ${daysClaimedHTML}
            </div>
        </td>
        <td class="p-3">
            <span class="px-2 py-1 rounded text-xs font-bold ${statusClass} bg-gray-900 border border-gray-700">
                ${part.status}
            </span>
        </td>
        <td class="p-3 text-sm text-gray-400 max-w-xs truncate">${
          part.notes || ""
        }</td>
        <td class="p-3">
            ${
              showStartButton
                ? `<button onclick="globalThis.markInProgress('hand', ${index})" class="neumorphic-btn px-2 py-1 text-blue-400 hover:text-blue-300 mr-2" title="Start Work / Claim"><i class="fa-solid fa-play"></i></button>`
                : ""
            }
            ${
              showCompleteButton
                ? `<button onclick="globalThis.markCompleted('hand', ${index})" class="neumorphic-btn px-2 py-1 text-green-400 hover:text-green-300 mr-2" title="Mark Completed"><i class="fa-solid fa-check-circle"></i></button>`
                : ""
            }
            ${
              part.assigned && part.assigned !== ""
                ? `<button onclick="globalThis.unclaimPart(${index})" class="neumorphic-btn px-2 py-1 text-orange-400 hover:text-orange-300 mr-2" title="Unclaim Part"><i class="fa-solid fa-user-slash"></i></button>`
                : ""
            }
            <button onclick="globalThis.viewPartInfo('hand', ${index})" class="text-gray-400 hover:text-blue-300 mr-2" title="Info"><i class="fa-solid fa-circle-info"></i></button>
            <button ${hasDrawing ? "" : "disabled"} onclick="${
    hasDrawing ? `globalThis.viewHandDrawing(${index})` : ""
  }" class="neumorphic-btn px-2 py-1 ${
    hasDrawing
      ? "text-purple-300 hover:text-purple-200"
      : "text-gray-500 cursor-not-allowed opacity-50"
  } mr-2" title="${
    hasDrawing ? "View/Print Drawing" : "No drawing URL provided"
  }">
                <i class="fa-solid fa-print"></i>
            </button>
            <button onclick="globalThis.editPart('hand', ${index})" class="text-gray-400 hover:text-blue-400 mr-2"><i class="fa-solid fa-pen"></i></button>
            <button onclick="globalThis.deletePart('hand', ${index})" class="text-gray-400 hover:text-red-400"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
  return row;
}

/**
 * Render the hand fabrication tab
 */
export function renderHandFab() {
  const tbody = document.getElementById("hand-fab-tbody");
  tbody.innerHTML = "";

  // Show loading state if data is being loaded
  if (
    appState.loadingTab === "hand" ||
    (appState.isLoading && appState.parts.hand.length === 0)
  ) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="9" class="text-center py-8 text-gray-500"><div class="flex items-center justify-center"><i class="fa-solid fa-spinner fa-spin text-purple-400 mr-2"></i> Loading hand fabrication parts...</div></td>`;
    tbody.appendChild(row);
    return;
  }

  const filtered = filterParts(appState.parts.hand, appState.searchQuery);

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="9" class="text-center py-8 text-gray-500">${
      appState.searchQuery ? "No results found." : "No Hand Fab parts."
    }</td>`;
    tbody.appendChild(row);
  } else {
    for (const part of filtered) {
      const index = appState.parts.hand.indexOf(part);
      const row = createHandFabRow(part, index);
      tbody.appendChild(row);
    }
  }
}
