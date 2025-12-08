// Review Tab Module
// Handles the review tab display and functionality

import { appState } from "./state.js";
import { filterParts } from "../utils/helpers.js";

/**
 * Generate empty state message for review tab
 * @returns {string} HTML string for empty state
 */
export function generateEmptyMessageReview() {
  if (appState.parts.review.length > 0 && appState.searchQuery) {
    return '<p class="text-gray-500">No results found.</p>';
  }
  return '<i class="fa-solid fa-check-circle text-4xl mb-3 opacity-50"></i><p>All parts reviewed!</p>';
}

/**
 * Generate preview HTML for review tab
 * @param {Object} part - The part object
 * @returns {string} HTML string for preview
 */
export function generateReviewPreviewHTML(part) {
  const isCNC = part.type === "cnc";
  if (isCNC) {
    return `<div class="w-12 h-12 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-blue-500 cursor-pointer hover:border-blue-400 transition" onclick="window.open('${
      part.onshapeUrl || "#"
    }', '_blank')" title="View CAD">
                        <i class="fa-solid fa-cube"></i>
                   </div>`;
  }
  return `<div class="w-12 h-12 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-purple-400 cursor-pointer hover:border-purple-400 transition overflow-hidden relative group" onclick="window.open('${
    part.onshapeUrl || "#"
  }', '_blank')" title="View CAD">
                        <i class="fa-solid fa-cube text-lg group-hover:scale-110 transition-transform"></i>
                   </div>`;
}

/**
 * Generate file HTML for review tab
 * @param {Object} part - The part object
 * @returns {string} HTML string for file preview
 */
export function generateReviewFileHTML(part) {
  const isCNC = part.type === "cnc";
  if (isCNC) {
    return `<span><i class="fa-solid fa-cube text-gray-500 mr-1"></i> ${
      part.file || "None"
    }</span>`;
  }
  return `<span class="text-gray-500">No file</span>`;
}

/**
 * Create a review table row
 * @param {Object} part - The part object
 * @param {number} index - The index of the part
 * @returns {HTMLElement} The created table row element
 */
export function createReviewRow(part, index) {
  const isCNC = part.type === "cnc";
  const displayID = isCNC ? part.name : part.id;
  const subDisplay = part.subsystem || "";
  const previewHTML = generateReviewPreviewHTML(part);
  const fileHTML = generateReviewFileHTML(part);

  const row = document.createElement("tr");
  row.className =
    "border-b border-gray-800 hover:bg-gray-800 transition duration-200";
  row.innerHTML = `
        <td class="p-3">
            <span class="px-2 py-1 rounded text-xs font-bold ${
              isCNC
                ? "bg-blue-900 text-blue-200"
                : "bg-purple-900 text-purple-200"
            } border border-white/10">
                ${isCNC ? "CNC" : "HAND FAB"}
            </span>
        </td>
        <td class="p-3">
            ${previewHTML}
        </td>
        <td class="p-3 font-bold text-gray-200">${displayID}</td>
        <td class="p-3 text-sm text-gray-400">${subDisplay}</td>
        <td class="p-3 text-sm text-blue-300 font-semibold">${
          part.material || "Not set"
        }</td>
        <td class="p-3">
             ${fileHTML}
        </td>
        <td class="p-3 text-sm text-gray-500 max-w-xs truncate">${
          part.notes || ""
        }</td>
        <td class="p-3 flex items-center gap-2">
            <button onclick="globalThis.approvePart(${index})" class="neumorphic-btn px-3 py-1 text-green-400 text-sm rounded hover:text-green-300" title="Approve & Move">
                <i class="fa-solid fa-check"></i> Review
            </button>
            <button onclick="globalThis.editPart('review', ${index})" class="text-gray-400 hover:text-blue-400 px-2"><i class="fa-solid fa-pen"></i></button>
            <button onclick="globalThis.deletePart('review', ${index})" class="text-gray-400 hover:text-red-400 px-2"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
  return row;
}

/**
 * Render the review tab
 */
export function renderReview() {
  const tbody = document.getElementById("review-tbody");
  const emptyMsg = document.getElementById("review-empty");

  // Show loading state if data is being loaded
  if (
    appState.loadingTab === "review" ||
    (appState.isLoading && appState.parts.review.length === 0)
  ) {
    tbody.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    emptyMsg.innerHTML =
      '<div class="flex items-center justify-center"><i class="fa-solid fa-spinner fa-spin text-blue-400 mr-2"></i> Loading parts...</div>';
    return;
  }

  tbody.innerHTML = "";

  const filtered = filterParts(appState.parts.review, appState.searchQuery);

  if (filtered.length === 0) {
    emptyMsg.classList.remove("hidden");
    emptyMsg.innerHTML = generateEmptyMessageReview();
  } else {
    emptyMsg.classList.add("hidden");
    for (const part of filtered) {
      // Find original index for actions
      const index = appState.parts.review.indexOf(part);
      const row = createReviewRow(part, index);
      tbody.appendChild(row);
    }
  }
}
