/**
 * Onshape OAuth Authentication
 *
 * Handles optional Onshape OAuth connection (separate from app authentication).
 * Users must first be logged into the app, then can optionally connect Onshape.
 */

import { apiGet, apiPost } from "../../core/api/apiClient.js";
import { appState } from "../state/state.js";
import {
    showInfoNotification,
    showSuccessNotification,
    showErrorNotification,
} from "../../core/dom/notificationManager.js";

/**
 * Check Onshape OAuth connection status.
 * Updates UI to show connected/not connected state.
 */
export async function checkOnshapeStatus() {
    try {
        const response = await apiGet("/auth/onshape/status");

        if (response.connected) {
            // Update app state
            appState.onshapeConnected = true;
            appState.onshapeUser = response.user || null;

            // Update UI - show connected state
            const notConnectedDiv = document.getElementById("onshape-not-connected");
            const connectedDiv = document.getElementById("onshape-connected");

            if (notConnectedDiv) notConnectedDiv.classList.add("hidden");
            if (connectedDiv) connectedDiv.classList.remove("hidden");

            // Update user info
            const userName = document.getElementById("onshape-user-name");
            const userEmail = document.getElementById("onshape-user-email");

            if (userName) {
                userName.textContent = response.user?.name || "Unknown";
            }
            if (userEmail) {
                userEmail.textContent = response.user?.email || "";
            }
        } else {
            // Update app state
            appState.onshapeConnected = false;
            appState.onshapeUser = null;

            // Update UI - show not connected state
            const notConnectedDiv = document.getElementById("onshape-not-connected");
            const connectedDiv = document.getElementById("onshape-connected");

            if (notConnectedDiv) notConnectedDiv.classList.remove("hidden");
            if (connectedDiv) connectedDiv.classList.add("hidden");
        }
    } catch (error) {
        console.error("Error checking Onshape status:", error);
        // Assume not connected on error
        appState.onshapeConnected = false;
        appState.onshapeUser = null;

        const notConnectedDiv = document.getElementById("onshape-not-connected");
        const connectedDiv = document.getElementById("onshape-connected");

        if (notConnectedDiv) notConnectedDiv.classList.remove("hidden");
        if (connectedDiv) connectedDiv.classList.add("hidden");
    }
}

/**
 * Initiate Onshape OAuth connection flow.
 * Gets authorization URL from backend and redirects user to Onshape.
 */
export async function handleOnshapeConnect(event) {
    if (event) event.preventDefault();

    const connectBtn = document.getElementById("connect-onshape-btn");

    try {
        // Show loading state
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Connecting...</span>
            `;
        }

        // Get authorization URL from backend
        const response = await apiGet("/auth/onshape/connect");

        if (response.authorization_url) {
            // Store current location for potential return (optional)
            sessionStorage.setItem("onshape_redirect_origin", window.location.pathname);

            // Redirect to Onshape authorization page
            window.location.href = response.authorization_url;
        } else {
            throw new Error("No authorization URL received");
        }
    } catch (error) {
        console.error("Error initiating Onshape connection:", error);
        showErrorNotification(
            "Connection Failed",
            error.message || "Failed to connect to Onshape. Please try again."
        );

        // Reset button state
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.innerHTML = `
                <i class="fa-solid fa-link"></i>
                <span>Connect to Onshape</span>
            `;
        }
    }
}

/**
 * Handle Onshape OAuth callback.
 * Called when user is redirected back from Onshape after authorization.
 */
export async function handleOnshapeCallback() {
    const params = new URLSearchParams(window.location.search);

    if (params.has("onshape_connected")) {
        // Success - show notification
        showSuccessNotification(
            "Onshape Connected",
            "Successfully connected to Onshape!"
        );

        // Refresh Onshape status to update UI
        await checkOnshapeStatus();

        // Clean up URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Optionally restore previous location
        const origin = sessionStorage.getItem("onshape_redirect_origin");
        if (origin && origin !== window.location.pathname) {
            sessionStorage.removeItem("onshape_redirect_origin");
            // Could navigate back if desired
        }
    } else if (params.has("onshape_error")) {
        // Error - show notification
        const error = params.get("onshape_error");
        let message = "Failed to connect to Onshape.";

        if (error === "config") {
            message = "Onshape OAuth is not configured. Please contact administrator.";
        } else if (error === "callback_failed") {
            message = "Onshape authorization failed. Please try again.";
        }

        showErrorNotification("Connection Failed", message);

        // Clean up URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

/**
 * Disconnect Onshape OAuth session.
 * Removes session from backend and updates UI.
 */
export async function handleOnshapeDisconnect(event) {
    if (event) event.preventDefault();

    // Confirm with user
    if (
        !confirm(
            "Are you sure you want to disconnect from Onshape? Drawing downloads will fall back to system credentials."
        )
    ) {
        return;
    }

    const disconnectBtn = document.getElementById("disconnect-onshape-btn");

    try {
        // Show loading state
        if (disconnectBtn) {
            disconnectBtn.disabled = true;
            disconnectBtn.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Disconnecting...</span>
            `;
        }

        // Call disconnect endpoint
        await apiPost("/auth/onshape/disconnect", {});

        // Update app state
        appState.onshapeConnected = false;
        appState.onshapeUser = null;

        // Update UI to show disconnected state
        const notConnectedDiv = document.getElementById("onshape-not-connected");
        const connectedDiv = document.getElementById("onshape-connected");

        if (notConnectedDiv) notConnectedDiv.classList.remove("hidden");
        if (connectedDiv) connectedDiv.classList.add("hidden");

        // Show success notification
        showInfoNotification(
            "Disconnected",
            "Disconnected from Onshape"
        );

        // Reset button state
        if (disconnectBtn) {
            disconnectBtn.disabled = false;
            disconnectBtn.innerHTML = `
                <i class="fa-solid fa-unlink"></i>
                <span>Disconnect</span>
            `;
        }
    } catch (error) {
        console.error("Error disconnecting from Onshape:", error);
        showErrorNotification(
            "Disconnect Failed",
            error.message || "Failed to disconnect from Onshape"
        );

        // Reset button state
        if (disconnectBtn) {
            disconnectBtn.disabled = false;
            disconnectBtn.innerHTML = `
                <i class="fa-solid fa-unlink"></i>
                <span>Disconnect</span>
            `;
        }
    }
}

/**
 * Show notification when Onshape features are used without connection.
 *
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 */
export function showOnshapeAuthNotification(title, message) {
    showInfoNotification(title, message);
}
