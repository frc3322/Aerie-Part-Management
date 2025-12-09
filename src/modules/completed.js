// Completed Tab Module
// Handles the completed tab display and functionality

import { appState } from "./state.js";
import { filterParts } from "../utils/helpers.js";

/**
 * Generate empty state message for completed tab
 * @returns {string} HTML string for empty state
 */
export function generateEmptyMessageCompleted() {
  if (appState.parts.completed.length > 0 && appState.searchQuery) {
    return '<p class="text-gray-500">No results found.</p>';
  }
  return '<i class="fa-solid fa-box-open text-4xl mb-3 opacity-50"></i><p>No completed parts yet.</p>';
}

function createCompletedCard(part, index) {
  const isCNC = part.type === "cnc";
  const showInfoButton = !appState.isMobile;
  const card = document.createElement("div");
  card.className = "mobile-card";
  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm font-semibold text-blue-100">${part.name || "Unnamed"}</div>
        <div class="text-[11px] text-gray-500">${part.partId || part.id || "N/A"}</div>
      </div>
      <div class="flex items-center gap-2">
        <span class="mobile-type-pill ${isCNC ? "type-cnc" : "type-hand"}">
          ${isCNC ? "CNC" : "HAND FAB"}
        </span>
        <span class="mobile-status-pill status-completed">Completed</span>
      </div>
    </div>
    <div class="text-[11px] text-gray-400 mt-1">${part.subsystem || ""}</div>
    <div class="mobile-card-actions mt-3">
      ${
        showInfoButton
          ? `<button onclick="globalThis.viewPartInfo('completed', ${index})" class="mobile-icon-btn text-gray-300" aria-label="Info">
        <i class="fa-solid fa-circle-info"></i>
      </button>`
          : ""
      }
      <button onclick="globalThis.markUncompleted(${index})" class="mobile-icon-btn text-yellow-300" aria-label="Restore">
        <i class="fa-solid fa-rotate-left"></i>
      </button>
      <button onclick="globalThis.deletePart('completed', ${index})" class="mobile-icon-btn text-red-300" aria-label="Delete">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;
  return card;
}

/**
 * Create a completed table row
 * @param {Object} part - The part object
 * @param {number} index - The index of the part
 * @returns {HTMLElement} The created table row element
 */
export function createCompletedRow(part, index) {
  const isCNC = part.type === "cnc";
  const row = document.createElement("tr");
  row.className =
    "border-b border-gray-800 hover:bg-gray-800 transition duration-200 opacity-75 hover:opacity-100";

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
            <div class="font-bold text-gray-200">${part.name || "Unnamed"}</div>
            <div class="text-xs text-gray-500">ID: ${
              part.partId || part.id || "N/A"
            }</div>
        </td>
        <td class="p-3 text-sm text-gray-400">${part.subsystem || ""}</td>
        <td class="p-3 text-sm text-blue-300 font-semibold">${
          part.material || "Not set"
        }</td>
        <td class="p-3">
             <span class="px-2 py-1 rounded text-xs font-bold status-completed bg-gray-900 border border-gray-700">
                Completed
            </span>
        </td>
        <td class="p-3 text-sm text-gray-500 max-w-xs truncate">${
          part.notes || ""
        }</td>
        <td class="p-3">
            <button onclick="globalThis.viewPartInfo('completed', ${index})" class="text-gray-400 hover:text-blue-300 mr-2" title="Info"><i class="fa-solid fa-circle-info"></i></button>
            <button onclick="globalThis.markUncompleted(${index})" class="neumorphic-btn px-3 py-1 text-yellow-400 hover:text-yellow-300 mr-2 text-sm" title="Un-complete (Restore)">
                <i class="fa-solid fa-rotate-left"></i> Restore
            </button>
            <button onclick="globalThis.deletePart('completed', ${index})" class="text-gray-400 hover:text-red-400"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
  return row;
}

/**
 * Render the completed tab
 */
export function renderCompleted() {
  const tbody = document.getElementById("completed-tbody");
  const emptyMsg = document.getElementById("completed-empty");
  const mobileList = document.getElementById("completed-mobile-list");
  const table = document.getElementById("completed-table");
  tbody.innerHTML = "";

  if (appState.isMobile) {
    if (table) table.classList.add("hidden");
    if (mobileList) mobileList.classList.remove("hidden");
    if (emptyMsg) emptyMsg.classList.add("hidden");
  } else {
    if (table) table.classList.remove("hidden");
    if (mobileList) {
      mobileList.classList.add("hidden");
      mobileList.innerHTML = "";
    }
  }

  // Show loading state if data is being loaded
  if (
    appState.loadingTab === "completed" ||
    (appState.isLoading && appState.parts.completed.length === 0)
  ) {
    if (appState.isMobile && mobileList) {
      mobileList.innerHTML = `<div class="mobile-card text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin text-green-300 mr-2"></i> Loading completed parts...</div>`;
    } else if (emptyMsg) {
      emptyMsg.classList.remove("hidden");
      emptyMsg.innerHTML =
        '<div class="flex items-center justify-center"><i class="fa-solid fa-spinner fa-spin text-green-400 mr-2"></i> Loading completed parts...</div>';
    }
    return;
  }

  const filtered = filterParts(appState.parts.completed, appState.searchQuery);

  if (appState.isMobile && mobileList) {
    mobileList.innerHTML = "";
    if (filtered.length === 0) {
      mobileList.innerHTML = `<div class="mobile-card text-center text-gray-400">${generateEmptyMessageCompleted()}</div>`;
      return;
    }
    for (const part of filtered) {
      const index = appState.parts.completed.indexOf(part);
      const card = createCompletedCard(part, index);
      mobileList.appendChild(card);
    }
    return;
  }

  if (filtered.length === 0) {
    if (emptyMsg) {
      emptyMsg.classList.remove("hidden");
      emptyMsg.innerHTML = generateEmptyMessageCompleted();
    }
    return;
  }

  if (emptyMsg) {
    emptyMsg.classList.add("hidden");
  }
  for (const part of filtered) {
    const index = appState.parts.completed.indexOf(part);
    const row = createCompletedRow(part, index);
    tbody.appendChild(row);
  }
}
