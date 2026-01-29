// Review Tab Module
// Handles the review tab display and functionality

import { appState } from "../state/state.js";
import {
    filterParts,
    updateScrollbarEdgeEffect,
} from "../../core/utils/helpers.js";
import { createElement, renderList } from "../../core/dom/templateHelpers.js";

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
    const isMisc = part.type === "misc";
    if (isCNC || isMisc) {
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
    const isMisc = part.type === "misc";
    if (isCNC || isMisc) {
        return `<span><i class="fa-solid fa-cube text-gray-500 mr-1"></i> ${
            part.file || "None"
        }</span>`;
    }
    return `<span class="text-gray-500">No file</span>`;
}

function createReviewCard(part, index) {
    const isCNC = part.type === "cnc";
    const isMisc = part.type === "misc";
    const displayName = part.name || "Unnamed";
    const cadLink = part.onshapeUrl
        ? `<div class="w-10 h-10 bg-gray-800 rounded-lg border border-gray-700 shrink-0 flex items-center justify-center text-purple-400 cursor-pointer active:scale-95 transition-transform" onclick="window.open('${part.onshapeUrl}', '_blank')" title="View CAD">
             <i class="fa-solid fa-cube text-lg"></i>
           </div>`
        : "";

    const card = document.createElement("div");
    card.className = "mobile-card";
    
    let typeClass = "type-hand";
    let typeText = "HAND FAB";
    if (isCNC) {
        typeClass = "type-cnc";
        typeText = "CNC";
    } else if (isMisc) {
        typeClass = "type-misc";
        typeText = "MISC";
    }

    card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex gap-3">
        ${cadLink}
        <div>
          <div class="text-sm font-semibold text-blue-100">${displayName}</div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <span class="mobile-type-pill ${typeClass}">
          ${typeText}
        </span>
      </div>
    </div>
    <div class="text-[11px] text-gray-400 mt-1">${part.subsystem || ""}</div>
    <div class="mobile-card-actions mt-3">
      <button data-action="approvePart" data-index="${index}" class="mobile-icon-btn text-green-400" aria-label="Approve">
        <i class="fa-solid fa-check"></i>
      </button>
      <button data-action="viewPartInfo" data-tab="review" data-index="${index}" class="mobile-icon-btn text-gray-300" aria-label="Info">
        <i class="fa-solid fa-circle-info"></i>
      </button>
      <button data-action="editPart" data-tab="review" data-index="${index}" class="mobile-icon-btn text-blue-200" aria-label="Edit">
        <i class="fa-solid fa-pen"></i>
      </button>
      <button data-action="deletePart" data-tab="review" data-index="${index}" class="mobile-icon-btn text-red-300" aria-label="Delete">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;
    return card;
}

/**
 * Create a review table row
 * @param {Object} part - The part object
 * @param {number} index - The index of the part
 * @returns {HTMLElement} The created table row element
 */
export function createReviewRow(part, index) {
    const isCNC = part.type === "cnc";
    const isMisc = part.type === "misc";
    const displayName = part.name || "Unnamed";
    const subDisplay = part.subsystem || "";
    const previewHTML = generateReviewPreviewHTML(part);
    const fileHTML = generateReviewFileHTML(part);

    const row = createElement("tr", {
        className: "part-row",
    });

    const typeCell = createElement("td", {
        className: "p-3 align-middle",
    });

    let typeBadgeClass = "bg-purple-900 text-purple-200";
    let typeText = "HAND FAB";
    if (isCNC) {
        typeBadgeClass = "bg-blue-900 text-blue-200";
        typeText = "CNC";
    } else if (isMisc) {
        typeBadgeClass = "bg-teal-900 text-teal-200";
        typeText = "MISC";
    }

    const typeBadge = createElement("span", {
        className: `px-2 py-1 rounded text-xs font-bold ${typeBadgeClass} border border-white/10 status-indicator`,
        text: typeText,
    });
    typeCell.appendChild(typeBadge);

    const previewCell = createElement("td", {
        className: "p-3 align-middle",
    });
    previewCell.innerHTML = previewHTML;

    const nameCell = createElement("td", { className: "p-3 align-middle" });
    nameCell.innerHTML = `<div class="font-bold text-gray-200">${displayName}</div>`;

    const subsystemCell = createElement("td", {
        className: "p-3 align-middle text-sm text-gray-400",
        text: subDisplay,
    });

    const materialCell = createElement("td", {
        className: "p-3 align-middle text-sm text-blue-300 font-semibold",
        text: part.material || "Not set",
    });

    const fileCell = createElement("td", { className: "p-3 align-middle" });
    fileCell.innerHTML = fileHTML;

    const notesCell = createElement("td", {
        className: "p-3 align-middle text-sm text-gray-500 max-w-xs truncate",
        text: part.notes || "",
    });

    const actionsCell = createElement("td", {
        className: "p-3 align-middle",
    });
    const actionsWrapper = createElement("div", {
        className: "flex items-center gap-2 whitespace-nowrap action-buttons",
    });

    const approveButton = createElement("button", {
        className:
            "neumorphic-btn px-3 py-1 text-green-400 text-sm rounded hover:text-green-300",
        attrs: { title: "Approve & Move" },
        dataset: { action: "approvePart", index },
    });
    approveButton.innerHTML = `<i class="fa-solid fa-check"></i> Review`;

    const editButton = createElement("button", {
        className: "text-gray-400 hover:text-blue-400 px-2",
        dataset: { action: "editPart", tab: "review", index },
        attrs: { title: "Edit part" },
    });
    editButton.innerHTML = `<i class="fa-solid fa-pen"></i>`;

    const deleteButton = createElement("button", {
        className: "text-gray-400 hover:text-red-400 px-2",
        dataset: { action: "deletePart", tab: "review", index },
        attrs: { title: "Delete part" },
    });
    deleteButton.innerHTML = `<i class="fa-solid fa-trash"></i>`;

    actionsWrapper.appendChild(approveButton);
    if (!appState.isMobile) actionsWrapper.appendChild(editButton);
    actionsWrapper.appendChild(deleteButton);
    actionsCell.appendChild(actionsWrapper);

    row.append(
        typeCell,
        previewCell,
        nameCell,
        subsystemCell,
        materialCell,
        fileCell,
        notesCell,
        actionsCell
    );
    return row;
}

/**
 * Render the review tab
 */
export function renderReview() {
    console.log(
        "[renderReview] Called - review parts count:",
        appState.parts.review.length
    );
    console.log(
        "[renderReview] Review parts:",
        appState.parts.review.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
        }))
    );

    const tbody = document.getElementById("review-tbody");
    const emptyMsg = document.getElementById("review-empty");
    const mobileList = document.getElementById("review-mobile-list");
    const table = document.querySelector("#content-review table");

    if (appState.isMobile) {
        if (table) table.classList.add("hidden");
        if (mobileList) mobileList.classList.remove("hidden");
    } else {
        if (table) table.classList.remove("hidden");
        if (mobileList) {
            mobileList.classList.add("hidden");
            mobileList.innerHTML = "";
        }
    }

    // Show loading state if data is being loaded
    if (
        appState.loadingTab === "review" ||
        (appState.isLoading && appState.parts.review.length === 0)
    ) {
        if (appState.isMobile && mobileList) {
            mobileList.innerHTML = `<div class="mobile-card text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin text-blue-400 mr-2"></i> Loading parts...</div>`;
        } else {
            tbody.innerHTML = "";
            emptyMsg.classList.remove("hidden");
            emptyMsg.innerHTML =
                '<div class="flex items-center justify-center"><i class="fa-solid fa-spinner fa-spin text-blue-400 mr-2"></i> Loading parts...</div>';
        }
        return;
    }

    const filtered = filterParts(appState.parts.review, appState.searchQuery);

    if (appState.isMobile && mobileList) {
        mobileList.innerHTML = "";
        if (filtered.length === 0) {
            mobileList.innerHTML = `<div class="mobile-card text-center text-gray-400">${generateEmptyMessageReview()}</div>`;
        } else {
            for (const part of filtered) {
                const index = appState.parts.review.indexOf(part);
                if (index === -1) {
                    console.warn("Part not found in review array:", part.id);
                    continue;
                }
                const card = createReviewCard(part, index);
                mobileList.appendChild(card);
            }
        }
    } else if (filtered.length === 0) {
        emptyMsg.classList.remove("hidden");
        emptyMsg.innerHTML = generateEmptyMessageReview();
        tbody.innerHTML = "";
    } else {
        emptyMsg.classList.add("hidden");
        renderList(tbody, filtered, (part) => {
            const index = appState.parts.review.indexOf(part);
            if (index === -1) {
                console.warn("Part not found in review array:", part.id);
                return null;
            }
            return createReviewRow(part, index);
        });
    }

    console.log(
        "[renderReview] tbody children after:",
        tbody ? tbody.children.length : "N/A"
    );
    console.log(
        "[renderReview] emptyMsg classes after:",
        emptyMsg ? emptyMsg.className : "N/A"
    );

    // Update scrollbar edge effect
    const reviewContent = document.getElementById("content-review");
    updateScrollbarEdgeEffect(reviewContent);
}
