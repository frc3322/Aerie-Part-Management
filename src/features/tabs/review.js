// Review Tab Module
// Handles the review tab display and functionality

import { appState } from "../state/state.js";
import { filterParts } from "../../core/utils/helpers.js";
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
    const displayName = part.name || "Unnamed";
    const displayPartId = part.partId || part.name || part.id || "N/A";
    const subDisplay = part.subsystem || "";
    const previewHTML = generateReviewPreviewHTML(part);
    const fileHTML = generateReviewFileHTML(part);

    const row = createElement("tr", {
        className:
            "border-b border-gray-800 hover:bg-gray-800 transition duration-200",
    });

    const typeCell = createElement("td", {
        className: "p-3 align-middle",
    });
    const typeBadge = createElement("span", {
        className: `px-2 py-1 rounded text-xs font-bold ${
            isCNC
                ? "bg-blue-900 text-blue-200"
                : "bg-purple-900 text-purple-200"
        } border border-white/10 status-indicator`,
        text: isCNC ? "CNC" : "HAND FAB",
    });
    typeCell.appendChild(typeBadge);

    const previewCell = createElement("td", {
        className: "p-3 align-middle",
    });
    previewCell.innerHTML = previewHTML;

    const nameCell = createElement("td", { className: "p-3 align-middle" });
    nameCell.innerHTML = `<div class="font-bold text-gray-200">${displayName}</div><div class="text-xs text-gray-500">ID: ${displayPartId}</div>`;

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
    console.log("[renderReview] Called - review parts count:", appState.parts.review.length);
    console.log("[renderReview] Review parts:", appState.parts.review.map(p => ({ id: p.id, name: p.name, category: p.category })));

    const tbody = document.getElementById("review-tbody");
    const emptyMsg = document.getElementById("review-empty");

    console.log("[renderReview] DOM elements found - tbody:", !!tbody, "emptyMsg:", !!emptyMsg);
    console.log("[renderReview] tbody children before:", tbody ? tbody.children.length : "N/A");
    console.log("[renderReview] emptyMsg classes before:", emptyMsg ? emptyMsg.className : "N/A");

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

    const filtered = filterParts(appState.parts.review, appState.searchQuery);
    console.log("[renderReview] Filtered count:", filtered.length, "searchQuery:", appState.searchQuery);

    if (filtered.length === 0) {
        console.log("[renderReview] Showing empty message");
        emptyMsg.classList.remove("hidden");
        emptyMsg.innerHTML = generateEmptyMessageReview();
        tbody.innerHTML = "";
        console.log("[renderReview] Cleared tbody, set empty message");
    } else {
        console.log("[renderReview] Rendering", filtered.length, "parts");
        emptyMsg.classList.add("hidden");
        renderList(tbody, filtered, (part) => {
            const index = appState.parts.review.indexOf(part);
            return createReviewRow(part, index);
        });
    }

    console.log("[renderReview] tbody children after:", tbody ? tbody.children.length : "N/A");
    console.log("[renderReview] emptyMsg classes after:", emptyMsg ? emptyMsg.className : "N/A");
}
