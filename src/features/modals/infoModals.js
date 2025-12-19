// Info and review misc modals
// Handles capturing reviewer + misc key/values on review,
// and displaying misc info for any part.

import { renderReview } from "../tabs/review.js";
import { renderHandFab } from "../tabs/handFab.js";

// Dynamically import renderCNC when needed
const loadRenderCNC = async () => {
    const { renderCNC } = await import("../tabs/cnc.js");
    return renderCNC;
};
import {
    openModal as openManagedModal,
    closeModal as closeManagedModal,
    setModalLoading,
} from "../../core/dom/modalManager.js";
import { hideActionIconKey, showActionIconKey } from "../auth/auth.js";
import { appState } from "../state/state.js";
import { showErrorNotification } from "../../core/dom/notificationManager.js";

const MODAL_IDS = {
    review: "review-misc-modal",
    info: "part-info-modal",
};

let reviewContext = null;

function ensureReviewModal() {
    if (document.getElementById(MODAL_IDS.review)) return;

    const wrapper = document.createElement("div");
    wrapper.id = MODAL_IDS.review;
    wrapper.className =
        "fixed inset-0 bg-white/5 hidden items-center justify-center z-50 backdrop-blur-md";
    wrapper.innerHTML = `
    <div class="neumorphic-card p-6 w-full max-w-lg relative animate-scale-in max-h-[90vh] overflow-y-auto">
      <button id="review-misc-close" class="absolute top-4 right-4 text-gray-400 hover:text-red-400">
        <i class="fa-solid fa-times text-xl"></i>
      </button>
      <h2 class="text-2xl font-bold text-blue-400 mb-2">Review Details</h2>
      <p class="text-gray-400 mb-4 text-sm">Capture reviewer and any misc fields (text or number). Leave blank to skip.</p>
      <form id="review-misc-form" class="space-y-4">
        <div>
          <label class="block text-sm font-bold mb-2 text-gray-400">Reviewer</label>
          <input type="text" id="reviewer-input" class="neumorphic-input w-full p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="e.g., Alex" />
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-bold text-gray-400">Misc fields</label>
            <button type="button" id="add-misc-field" class="text-blue-400 hover:text-blue-300 text-sm"><i class="fa-solid fa-plus mr-1"></i>Add field</button>
          </div>
          <div id="misc-fields-container" class="space-y-3"></div>
        </div>
        <div class="flex justify-end gap-3">
          <button type="button" id="review-misc-cancel" class="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button type="submit" class="neumorphic-btn px-6 py-2 rounded-lg text-green-400 font-bold">Save & Move</button>
        </div>
      </form>
    </div>
  `;

    document.body.appendChild(wrapper);
    document
        .getElementById("review-misc-close")
        .addEventListener("click", closeReviewModal);
    document
        .getElementById("review-misc-cancel")
        .addEventListener("click", closeReviewModal);
    document
        .getElementById("add-misc-field")
        .addEventListener("click", addMiscFieldRow);
    document
        .getElementById("review-misc-form")
        .addEventListener("submit", handleReviewSubmit);
}

function addMiscFieldRow() {
    const container = document.getElementById("misc-fields-container");
    if (!container) return;
    const row = document.createElement("div");
    row.className = "grid grid-cols-3 gap-2 items-center";
    row.innerHTML = `
    <input type="text" class="neumorphic-input p-2 rounded col-span-1" placeholder="key" />
    <input type="text" class="neumorphic-input p-2 rounded col-span-1" placeholder="value" />
    <select class="neumorphic-input p-2 rounded col-span-1">
      <option value="text">Text</option>
      <option value="number">Number</option>
    </select>
    <button type="button" class="text-red-400 hover:text-red-300 justify-self-end"><i class="fa-solid fa-times"></i></button>
  `;
    const removeBtn = row.querySelector("button");
    removeBtn.addEventListener("click", () => row.remove());
    container.appendChild(row);
}

function openReviewModal(context) {
    ensureReviewModal();
    reviewContext = context;
    const modal = document.getElementById(MODAL_IDS.review);
    const reviewerInput = document.getElementById("reviewer-input");
    const container = document.getElementById("misc-fields-container");
    if (modal && reviewerInput && container) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        hideActionIconKey();
        reviewerInput.value = "";
        container.innerHTML = "";
        reviewerInput.focus();
    }
}

function closeReviewModal() {
    const modal = document.getElementById(MODAL_IDS.review);
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        showActionIconKey();
    }
    reviewContext = null;
}

function collectMiscInfo() {
    const container = document.getElementById("misc-fields-container");
    if (!container) return null;
    const rows = Array.from(container.querySelectorAll("div.grid"));
    if (rows.length === 0) return null;
    const misc = {};
    for (const row of rows) {
        const [keyInput, valueInput, typeSelect] =
            row.querySelectorAll("input, select");
        const key = keyInput?.value?.trim();
        const rawValue = valueInput?.value?.trim();
        const type = typeSelect?.value || "text";
        if (!key || rawValue === "" || rawValue === undefined) continue;
        if (type === "number") {
            const parsed = Number(rawValue);
            if (!Number.isNaN(parsed)) {
                misc[key] = parsed;
                continue;
            }
        }
        misc[key] = rawValue;
    }
    return Object.keys(misc).length > 0 ? misc : null;
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!reviewContext) {
        closeReviewModal();
        return;
    }

    const reviewer = document.getElementById("reviewer-input")?.value?.trim();
    const misc = collectMiscInfo();
    const payload = {};
    if (misc) payload.miscInfo = misc;
    if (reviewer) {
        payload.miscInfo = payload.miscInfo || {};
        payload.miscInfo.reviewer = reviewer;
    }

    setModalLoading(MODAL_IDS.review, true);
    try {
        await reviewContext.onSubmit(payload);
        closeReviewModal();
        renderReview();
        (await loadRenderCNC())();
        renderHandFab();
    } catch (error) {
        console.error("Failed to submit review details", error);
        showErrorNotification(
            "Save Failed",
            "Failed to save review details. Please try again."
        );
    } finally {
        setModalLoading(MODAL_IDS.review, false);
    }
}

function ensureInfoModal() {
    if (document.getElementById(MODAL_IDS.info)) return;
    const wrapper = document.createElement("div");
    wrapper.id = MODAL_IDS.info;
    wrapper.className =
        "fixed inset-0 bg-white/5 hidden items-center justify-center z-50 backdrop-blur-md";
    wrapper.innerHTML = `
    <div class="neumorphic-card p-6 w-full max-w-lg relative animate-scale-in max-h-[80vh] overflow-y-auto">
      <button id="info-close" class="absolute top-4 right-4 text-gray-400 hover:text-red-400">
        <i class="fa-solid fa-times text-xl"></i>
      </button>
      <h2 class="text-2xl font-bold text-blue-400 mb-3">Part Info</h2>
      <div id="info-body" class="space-y-3 text-gray-300"></div>
    </div>
  `;
    document.body.appendChild(wrapper);
    document
        .getElementById("info-close")
        .addEventListener("click", () => toggleInfoModal(false));
}

function toggleInfoModal(show) {
    const modal = document.getElementById(MODAL_IDS.info);
    if (!modal) return;
    if (show) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        hideActionIconKey();
    } else {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        showActionIconKey();
    }
}

function extractHandWorkers(miscInfo) {
    const log = miscInfo?.handWorkers || miscInfo?.hand_workers;
    if (!Array.isArray(log)) return [];
    return log
        .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const name = typeof entry.name === "string" ? entry.name : null;
            const timestamp =
                typeof entry.timestamp === "string" ? entry.timestamp : null;
            if (!name) return null;
            return { name, timestamp };
        })
        .filter(Boolean);
}

function stripHandWorkers(miscInfo) {
    if (!miscInfo) return {};
    const cleaned = { ...miscInfo };
    delete cleaned.handWorkers;
    delete cleaned.hand_workers;
    return cleaned;
}

function formatWorkerTimestamp(timestamp) {
    if (!timestamp) return "Time not recorded";
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return "Time not recorded";
    return parsed.toLocaleString();
}

function renderHandWorkersSection(workers) {
    const hasWorkers = workers.length > 0;
    const items = hasWorkers
        ? workers
              .map(
                  (worker) => `<div class="flex justify-between text-sm">
            <span class="text-blue-200 font-semibold">${worker.name}</span>
            <span class="text-xs text-gray-400">${formatWorkerTimestamp(
                worker.timestamp
            )}</span>
          </div>`
              )
              .join("")
        : '<div class="text-sm text-gray-500">No workers recorded.</div>';
    return `<div class="border border-gray-800 rounded-lg p-3 shadow-3d-inset">
    <div class="text-sm text-gray-400 mb-2">Hand fab workers</div>
    ${items}
  </div>`;
}

function renderMiscItems(miscInfo) {
    if (!miscInfo || Object.keys(miscInfo).length === 0) {
        return '<div class="text-sm text-gray-500">No misc info saved.</div>';
    }
    return Object.entries(miscInfo)
        .map(
            ([key, value]) =>
                `<div class="flex justify-between text-sm">
          <span class="text-gray-400">${key}</span>
          <span class="text-blue-300 font-semibold">${value}</span>
        </div>`
        )
        .join("");
}

export function showPartInfo(part) {
    ensureInfoModal();
    const body = document.getElementById("info-body");
    const miscInfo = part.miscInfo || part.misc_info || {};
    const handWorkers = extractHandWorkers(miscInfo);
    const miscSection = renderMiscItems(stripHandWorkers(miscInfo));
    const workersSection = renderHandWorkersSection(handWorkers);
    const contextBits = [
        part.status
            ? `<div><span class="text-gray-400 text-sm">Status:</span> <span class="text-blue-300 font-semibold">${part.status}</span></div>`
            : "",
        part.category
            ? `<div><span class="text-gray-400 text-sm">Category:</span> <span class="text-blue-300 font-semibold">${part.category}</span></div>`
            : "",
        part.notes
            ? `<div><span class="text-gray-400 text-sm">Notes:</span> <span class="text-blue-300 font-semibold">${part.notes}</span></div>`
            : "",
    ]
        .filter(Boolean)
        .join("");

    if (body) {
        body.innerHTML = `
      ${contextBits}
      ${workersSection}
      <div class="border border-gray-800 rounded-lg p-3 shadow-3d-inset">
        <div class="text-sm text-gray-400 mb-2">Misc info</div>
        ${miscSection}
      </div>
    `;
    }
    toggleInfoModal(true);
}

export function openReviewDetails(part, onSubmit) {
    openReviewModal({ part, onSubmit });
}

// Ensure modals exist on module load
ensureReviewModal();
ensureInfoModal();
