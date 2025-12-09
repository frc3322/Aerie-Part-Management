// Parts API Service
// Handles all backend API calls for parts management

import {
    apiGet,
    apiPost,
    apiPut,
    apiDelete,
    apiPostMultipart,
    apiDownloadFile,
} from "./apiClient.js";
import { getApiKeyFromCookie } from "./auth.js";

/**
 * Get all parts with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {string} options.category - Filter by category (review, cnc, hand, completed)
 * @param {string} options.search - Search query
 * @param {string} options.sort_by - Sort field (name, status, assigned, created_at)
 * @param {string} options.sort_order - Sort order (asc, desc)
 * @param {number} options.limit - Maximum results
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object>} Parts data with pagination info
 */
export async function getParts(options = {}) {
    return await apiGet("/parts/", options);
}

/**
 * Get a specific part by ID
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Part data
 */
export async function getPart(partId) {
    return await apiGet(`/parts/${partId}`);
}

/**
 * Create a new part
 * @param {Object} partData - Part data to create
 * @returns {Promise<Object>} Created part data
 */
export async function createPart(partData) {
    return await apiPost("/parts/", partData);
}

/**
 * Update an existing part
 * @param {number} partId - Part ID
 * @param {Object} partData - Updated part data
 * @returns {Promise<Object>} Updated part data
 */
export async function updatePart(partId, partData) {
    return await apiPut(`/parts/${partId}`, partData);
}

/**
 * Delete a part
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Success message
 */
export async function deletePart(partId) {
    return await apiDelete(`/parts/${partId}`);
}

/**
 * Approve a part for production
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function approvePart(partId, payload = {}) {
    return await apiPost(`/parts/${partId}/approve`, payload);
}

/**
 * Assign a part to a user
 * @param {number} partId - Part ID
 * @param {string} assignedUser - User to assign to
 * @returns {Promise<Object>} Updated part data
 */
export async function assignPart(partId, assignedUser) {
    return await apiPost(`/parts/${partId}/assign`, { assigned: assignedUser });
}

/**
 * Unclaim a part (remove assignment)
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function unclaimPart(partId) {
    return await apiPost(`/parts/${partId}/unclaim`);
}

/**
 * Mark a part as completed
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function completePart(partId, payload = {}) {
    return await apiPost(`/parts/${partId}/complete`, payload);
}

/**
 * Revert a completed part back to previous category
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function revertPart(partId) {
    return await apiPost(`/parts/${partId}/revert`);
}

/**
 * Get parts by category
 * @param {string} category - Category name (review, cnc, hand, completed)
 * @param {Object} options - Additional query options
 * @returns {Promise<Object>} Parts data
 */
export async function getPartsByCategory(category, options = {}) {
    return await apiGet(`/parts/categories/${category}`, options);
}

/**
 * Get system statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getStats() {
    return await apiGet("/parts/stats");
}

/**
 * Upload a STEP or PDF file for a part
 * @param {number} partId - Part ID
 * @param {File} file - STEP or PDF file to upload
 * @returns {Promise<Object>} Upload result with file metadata
 */
export async function uploadPartFile(partId, file) {
    const formData = new FormData();
    formData.append("file", file);
    return await apiPostMultipart(`/parts/${partId}/upload`, formData);
}

/**
 * Download the original STEP file for a part
 * @param {number} partId - Part ID
 * @param {string} filename - Filename for download
 * @returns {Promise<Blob>} File blob
 */
export async function downloadPartFile(partId, filename) {
    return await apiDownloadFile(`/parts/${partId}/download`, filename);
}

/**
 * Get the stored file (STEP or PDF) as a blob URL for preview
 * @param {number} partId - Part ID
 * @returns {Promise<string>} Blob URL to the stored file
 */
export async function getPartFileBlobUrl(partId) {
    const base = import.meta.env.BASE_URL || "/";
    const basePath = base === "/" ? "" : base.replace(/\/$/, "");
    const url = basePath + `/api/parts/${partId}/file`;

    const headers = {};
    const apiKey = getApiKeyFromCookie();
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

/**
 * Get the GLTF model as a blob URL for a part
 * @param {number} partId - Part ID
 * @returns {Promise<string>} Blob URL to the GLTF model
 */
export async function getPartModelBlobUrl(partId) {
    // Use Vite's BASE_URL which respects the subpath configured during build
    const base = import.meta.env.BASE_URL || "/";
    const basePath = base === "/" ? "" : base.replace(/\/$/, "");
    const url = basePath + `/api/parts/${partId}/model`;

    const headers = {};
    const apiKey = getApiKeyFromCookie();
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`Failed to load model: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

/**
 * Get the drawing PDF as a blob URL for a part
 * @param {number} partId - Part ID
 * @param {Object} options - Fetch options
 * @param {boolean} options.refresh - Force refresh from Onshape
 * @returns {Promise<string>} Blob URL to the drawing PDF
 */
export async function getPartDrawingBlobUrl(partId, options = {}) {
    const { refresh = false } = options;
    const base = import.meta.env.BASE_URL || "/";
    const basePath = base === "/" ? "" : base.replace(/\/$/, "");
    const query = refresh ? "?refresh=true" : "";
    const url = basePath + `/api/parts/${partId}/drawing${query}`;

    const headers = {};
    const apiKey = getApiKeyFromCookie();
    if (apiKey) {
        headers["X-API-Key"] = apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`Failed to load drawing: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
