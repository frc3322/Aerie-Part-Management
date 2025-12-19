// Authentication Modal Module
// Handles the authentication popup and API key validation

import { setApiKey, clearApiKey, appState } from "../state/state.js";
import {
    setApiKeyCookie,
    checkAuthStatus,
    getApiKeyFromCookie,
} from "../../core/auth/auth.js";

/**
 * Hide the Action Icon Key when modals are shown
 */
export function hideActionIconKey() {
    const actionKey = document.getElementById("action-key");
    if (actionKey) {
        actionKey.classList.add("hidden");
    }
}

/**
 * Show the Action Icon Key when modals are hidden
 */
export function showActionIconKey() {
    if (appState.isMobile) return;
    const actionKey = document.getElementById("action-key");
    if (actionKey) {
        actionKey.classList.remove("hidden");
    }
}

/**
 * Show the authentication modal
 */
export function showAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        hideActionIconKey();
        // Focus the input field
        setTimeout(() => {
            const input = document.getElementById("auth-api-key");
            if (input) {
                input.focus();
            }
        }, 100);
    }
}

/**
 * Hide the authentication modal
 */
export function hideAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        showActionIconKey();
    }
}

/**
 * Show authentication error message
 * @param {string} message - Error message to display
 */
function showAuthError(message = "Invalid API key. Please try again.") {
    const errorDiv = document.getElementById("auth-error");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove("hidden");
    }
}

/**
 * Hide authentication error message
 */
function hideAuthError() {
    const errorDiv = document.getElementById("auth-error");
    if (errorDiv) {
        errorDiv.classList.add("hidden");
    }
}

/**
 * Set loading state for the authentication form
 * @param {boolean} isLoading - Whether the form is in loading state
 */
function setAuthLoading(isLoading) {
    const submitBtn = document.getElementById("auth-submit-btn");
    const submitText = document.getElementById("auth-submit-text");
    const input = document.getElementById("auth-api-key");

    if (submitBtn && submitText && input) {
        if (isLoading) {
            submitBtn.disabled = true;
            submitText.textContent = "Validating...";
            input.disabled = true;
        } else {
            submitBtn.disabled = false;
            submitText.textContent = "Authenticate";
            input.disabled = false;
        }
    }
}

/**
 * Reset the authentication form
 */
function resetAuthForm() {
    const form = document.getElementById("auth-form");
    const input = document.getElementById("auth-api-key");

    if (form) {
        form.reset();
    }
    if (input) {
        input.focus();
    }
    hideAuthError();
    setAuthLoading(false);
}

/**
 * Handle authentication form submission
 * @param {Event} event - Button click event from event delegation
 */
export async function handleAuthSubmit(event) {
    // Prevent default if this was called from a form submit somehow
    if (event && typeof event.preventDefault === "function") {
        event.preventDefault();
    }

    const apiKeyInput = document.getElementById("auth-api-key");
    if (!apiKeyInput) return;

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showAuthError("API key is required");
        return;
    }

    hideAuthError();
    setAuthLoading(true);

    try {
        // Validate the API key by making a test request
        const isValid = await checkAuthStatus(apiKey);

        if (isValid) {
            // Store the API key in state and cookie
            setApiKey(apiKey);
            setApiKeyCookie(apiKey);

            // Hide the modal and reset form
            hideAuthModal();
            resetAuthForm();

            // Dispatch custom event to notify other modules
            globalThis.dispatchEvent(new CustomEvent("authenticated"));
        } else {
            showAuthError("Invalid API key. Please check and try again.");
            setAuthLoading(false);
        }
    } catch (error) {
        console.error("Authentication error:", error);
        showAuthError(
            "Network error. Please check your connection and try again."
        );
        setAuthLoading(false);
    }
}

/**
 * Check if user is authenticated by validating API key with backend
 * @returns {Promise<boolean>} True if authenticated, false if modal was shown
 */
export async function checkAuthentication() {
    // Check if there's an API key in cookies
    const apiKey = getApiKeyFromCookie();

    if (apiKey) {
        // Try to validate the API key with the backend
        const isValid = await checkAuthStatus(apiKey);

        if (isValid) {
            // API key is valid, set it in state and hide any visible auth modal
            setApiKey(apiKey);
            // Ensure modal is hidden immediately, even if it was previously shown
            const modal = document.getElementById("auth-modal");
            if (modal) {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
            }
            return true;
        }
    }

    // No valid API key found, show authentication modal
    showAuthModal();
    return false;
}

/**
 * Clear authentication and show login modal again
 */
export function logout() {
    clearApiKey();
    // Cookie will be cleared by the backend or can be cleared here if needed
    showAuthModal();
}

/**
 * Initialize the authentication modal
 * Sets up event listeners (modal HTML is included in index.html)
 */
export function initializeAuthModal() {
    // Modal HTML is now included statically in index.html via Handlebars templating
    // No dynamic loading needed
}
