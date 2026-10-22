// Update Modal Module
// Checks the backend's git remote for new commits, confirms with the user,
// then pulls them and waits for the rebuilt server to come back.

import { apiGet, apiPost } from "../../core/api/apiClient.js";
import { ENDPOINTS } from "../../core/api/endpoints.js";
import {
    openModal as openManagedModal,
    closeModal as closeManagedModal,
    setModalLoading,
} from "../../core/dom/modalManager.js";
import {
    showErrorNotification,
    showInfoNotification,
    showSuccessNotification,
} from "../../core/dom/notificationManager.js";
import { escapeHtml } from "../../core/utils/helpers.js";
import { closeSettingsModal } from "./modals.js";

const RESTART_POLL_INTERVAL_MS = 3000;
// Rebuilding runs uv sync, npm install and a Vite build, which can be slow on small servers.
const RESTART_TIMEOUT_MS = 15 * 60 * 1000;

let pendingUpdate = null;
let isApplyingUpdate = false;

/**
 * Show the Updates section in settings if the backend tracks a git remote.
 * Called whenever the settings modal opens.
 */
export async function loadUpdateSection() {
    const section = document.getElementById("settings-updates-section");
    if (!section) return;

    try {
        const status = await apiGet(ENDPOINTS.SYSTEM.UPDATE_STATUS);
        section.classList.toggle("hidden", !status?.enabled);
        if (status?.enabled) {
            setVersionLabel(status);
        }
    } catch (error) {
        console.warn("Could not load update status:", error);
        section.classList.add("hidden");
    }
}

function setVersionLabel(status) {
    const label = document.getElementById("settings-update-version");
    if (label) {
        label.textContent = `Running ${status.commit} on ${status.upstream}`;
    }
}

function setCheckButtonBusy(isBusy) {
    const button = document.getElementById("check-updates-btn");
    if (!button) return;
    button.disabled = isBusy;
    const icon = button.querySelector("i");
    if (icon) icon.classList.toggle("fa-spin", isBusy);
}

/**
 * Fetch from the remote and, if there are new commits, ask the user to confirm.
 */
export async function checkForUpdates() {
    setCheckButtonBusy(true);
    try {
        const result = await apiPost(ENDPOINTS.SYSTEM.UPDATE_CHECK);
        setVersionLabel(result);

        if (result.commits.length === 0) {
            showInfoNotification(
                "Up to Date",
                `Already running the latest version (${result.commit}).`
            );
            return;
        }

        pendingUpdate = result;
        closeSettingsModal();
        openUpdateModal(result);
    } catch (error) {
        showErrorNotification(
            "Update Check Failed",
            error.details || error.message
        );
    } finally {
        setCheckButtonBusy(false);
    }
}

function openUpdateModal(result) {
    const count = result.commits.length;
    document.getElementById("update-modal-title").textContent =
        "Update Available";
    document.getElementById("update-modal-description").textContent =
        `${count} new commit${count === 1 ? "" : "s"} on ${result.upstream} ` +
        `(${result.commit} → ${result.latest_commit}).` +
        (result.can_restart
            ? " The app will rebuild and restart, which takes a few minutes."
            : " The server is not running under deploy.py, so you will need to restart it yourself.");

    const list = document.getElementById("update-modal-commits");
    list.classList.remove("hidden");
    list.innerHTML = result.commits
        .map(
            (commit) => `
            <li class="flex gap-2">
                <span class="font-mono text-blue-400 shrink-0">${escapeHtml(commit.hash)}</span>
                <span class="text-gray-300">${escapeHtml(commit.subject)}</span>
            </li>`
        )
        .join("");

    document.getElementById("update-modal-actions").classList.remove("hidden");
    document.getElementById("update-modal-icon").className =
        "fa-solid fa-cloud-arrow-down text-2xl";
    openManagedModal("update-modal", { focusSelector: "#update-modal-confirm" });
}

/** Close the update modal without updating. */
export function closeUpdateModal() {
    if (isApplyingUpdate) return;
    pendingUpdate = null;
    closeManagedModal("update-modal");
}

function showRestartingState() {
    document.getElementById("update-modal-title").textContent = "Updating…";
    document.getElementById("update-modal-description").textContent =
        "Rebuilding and restarting the server. This page will reload when it is back.";
    document.getElementById("update-modal-commits").classList.add("hidden");
    document.getElementById("update-modal-actions").classList.add("hidden");
    document.getElementById("update-modal-icon").className =
        "fa-solid fa-gear fa-spin text-2xl";
}

/**
 * Pull the pending update, then wait for the relaunched server and reload.
 */
export async function applyUpdate() {
    if (!pendingUpdate || isApplyingUpdate) return;

    isApplyingUpdate = true;
    setModalLoading("update-modal", true);
    const previousInstance = pendingUpdate.server_instance;

    let result;
    try {
        result = await apiPost(ENDPOINTS.SYSTEM.UPDATE_APPLY);
    } catch (error) {
        isApplyingUpdate = false;
        setModalLoading("update-modal", false);
        showErrorNotification("Update Failed", error.details || error.message);
        return;
    }

    if (!result.restarting) {
        isApplyingUpdate = false;
        setModalLoading("update-modal", false);
        closeUpdateModal();
        if (result.updated) {
            showSuccessNotification(
                "Update Downloaded",
                `Pulled ${result.commit}. Restart the server to apply it.`
            );
        } else {
            showInfoNotification("Up to Date", "No new commits were pulled.");
        }
        return;
    }

    showRestartingState();
    await waitForRelaunch(previousInstance);
}

async function waitForRelaunch(previousInstance) {
    const deadline = Date.now() + RESTART_TIMEOUT_MS;

    while (Date.now() < deadline) {
        await new Promise((resolve) =>
            setTimeout(resolve, RESTART_POLL_INTERVAL_MS)
        );
        try {
            const status = await apiGet(ENDPOINTS.SYSTEM.UPDATE_STATUS);
            if (status?.server_instance && status.server_instance !== previousInstance) {
                globalThis.location.reload();
                return;
            }
        } catch {
            // Expected while the server is down for the rebuild.
        }
    }

    isApplyingUpdate = false;
    setModalLoading("update-modal", false);
    closeUpdateModal();
    showErrorNotification(
        "Update Timed Out",
        "The server did not come back in time. Check the server logs."
    );
}
