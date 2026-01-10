// API Client Utility
// Handles authenticated API calls to the backend

import { getApiKeyFromCookie } from "../auth/auth.js";
import { showAuthModal } from "../../features/auth/auth.js";

/**
 * Get the base API URL
 * Supports deployment at any subpath (e.g., /part-management-system/api)
 * @returns {string} Base API URL
 */
function getBaseUrl() {
    // Use Vite's BASE_URL which is set via VITE_BASE_PATH env var during build
    // This respects the base path configured for subpath deployments
    const base = import.meta.env.BASE_URL || "/";
    // Ensure base path ends without trailing slash for API endpoint
    const basePath = base === "/" ? "" : base.replace(/\/$/, "");
    return basePath + "/api";
}

/**
 * Get common headers for API requests including authentication
 * @param {boolean} includeContentType - Whether to include Content-Type header (false for multipart)
 * @param {string} overrideApiKey - Optional API key to use instead of cookie value
 * @returns {Object} Headers object
 */
function getHeaders(includeContentType = true, overrideApiKey = null) {
    const headers = {};

    if (includeContentType) {
        headers["Content-Type"] = "application/json";
    }

    // Add API key - use override if provided, otherwise get from cookie
    const apiKey = overrideApiKey || getApiKeyFromCookie();
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    return headers;
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @param {string} overrideApiKey - Optional API key to use instead of cookie value
 * @returns {Promise} Fetch response promise
 */
async function apiRequest(endpoint, options = {}, overrideApiKey = null) {
    const url = getBaseUrl() + endpoint;

    // Properly merge headers - don't let options.headers completely overwrite auth headers
    const defaultHeaders = getHeaders(true, overrideApiKey);
    const mergedHeaders = {
        ...defaultHeaders,
        ...(options.headers || {}),
    };

    const defaultOptions = {
        ...options,
        headers: mergedHeaders,
    };

    // Debug logging
    console.log("[DEBUG] apiRequest:", {
        endpoint,
        url,
        overrideApiKey: overrideApiKey
            ? "***" + overrideApiKey.slice(-4)
            : "null",
        headers: {
            ...mergedHeaders,
            "X-API-Key": mergedHeaders["X-API-Key"]
                ? "***" + mergedHeaders["X-API-Key"].slice(-4)
                : "null",
        },
    });

    try {
        const response = await fetch(url, defaultOptions);

        // Check if authentication failed
        if (response.status === 401) {
            showAuthModal();
            throw new Error("Authentication required");
        }

        return response;
    } catch (error) {
        if (error.name === "TypeError" && error.message.includes("fetch")) {
            throw new Error(
                "Network error: Unable to connect to the API server"
            );
        }
        throw error;
    }
}

/**
 * GET request wrapper
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {string} overrideApiKey - Optional API key to use instead of cookie value
 * @returns {Promise} Response data
 */
export async function apiGet(endpoint, params = {}, overrideApiKey = null) {
    // Build query string from params
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    const response = await apiRequest(url, {}, overrideApiKey);
    return await handleResponse(response);
}

/**
 * POST request wrapper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @param {string} overrideApiKey - Optional API key to use instead of cookie value
 * @returns {Promise} Response data
 */
export async function apiPost(endpoint, data = {}, overrideApiKey = null) {
    const response = await apiRequest(
        endpoint,
        {
            method: "POST",
            body: JSON.stringify(data),
        },
        overrideApiKey
    );
    return await handleResponse(response);
}

/**
 * PUT request wrapper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body data
 * @param {string} overrideApiKey - Optional API key to use instead of cookie value
 * @returns {Promise} Response data
 */
export async function apiPut(endpoint, data = {}, overrideApiKey = null) {
    const response = await apiRequest(
        endpoint,
        {
            method: "PUT",
            body: JSON.stringify(data),
        },
        overrideApiKey
    );
    return await handleResponse(response);
}

/**
 * DELETE request wrapper
 * @param {string} endpoint - API endpoint
 * @param {string} overrideApiKey - Optional API key to use instead of cookie value
 * @returns {Promise} Response data
 */
export async function apiDelete(endpoint, overrideApiKey = null) {
    const response = await apiRequest(
        endpoint,
        {
            method: "DELETE",
        },
        overrideApiKey
    );
    return await handleResponse(response);
}

/**
 * Handle API response and parse JSON
 * @param {Response} response - Fetch response object
 * @returns {Promise} Parsed response data
 */
async function handleResponse(response) {
    let data;

    // Only try to parse JSON if response has a body
    if (response.headers.get("content-type")?.includes("application/json")) {
        try {
            data = await response.json();
        } catch (parseError) {
            // JSON parsing failed - this shouldn't happen if content-type is correct
            console.warn("Failed to parse JSON response:", parseError);
            data = null;
        }
    } else {
        data = null;
    }

    if (!response.ok) {
        const error = new Error(data?.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.details = data?.details;
        throw error;
    }

    return data;
}

/**
 * POST request with multipart/form-data for file uploads
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - FormData object containing file
 * @returns {Promise} Response data
 */
export async function apiPostMultipart(endpoint, formData) {
    const response = await apiRequest(endpoint, {
        method: "POST",
        headers: getHeaders(false),
        body: formData,
    });
    return await handleResponse(response);
}

/**
 * Download a file from the API
 * @param {string} endpoint - API endpoint
 * @param {string} filename - Suggested filename for download
 * @returns {Promise<Blob>} File blob
 */
export async function apiDownloadFile(endpoint, filename = null) {
    const url = getBaseUrl() + endpoint;
    const headers = getHeaders(false);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: headers,
        });

        if (response.status === 401) {
            showAuthModal();
            throw new Error("Authentication required");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(
                errorData.error || `HTTP ${response.status}`
            );
            error.status = response.status;
            throw error;
        }

        const blob = await response.blob();

        if (filename) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }

        return blob;
    } catch (error) {
        if (error.name === "TypeError" && error.message.includes("fetch")) {
            throw new Error(
                "Network error: Unable to connect to the API server"
            );
        }
        throw error;
    }
}
