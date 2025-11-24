// Parts API Service
// Handles all backend API calls for parts management

import { apiGet, apiPost, apiPut, apiDelete, apiPostMultipart, apiDownloadFile } from './apiClient.js';

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
    return await apiGet('/parts/', options);
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
    return await apiPost('/parts/', partData);
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
export async function approvePart(partId) {
    return await apiPost(`/parts/${partId}/approve`);
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
export async function completePart(partId) {
    return await apiPost(`/parts/${partId}/complete`);
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
    return await apiGet('/parts/stats');
}

/**
 * Upload a STEP file for a part
 * @param {number} partId - Part ID
 * @param {File} file - STEP file to upload
 * @returns {Promise<Object>} Upload result with file metadata
 */
export async function uploadPartFile(partId, file) {
    const formData = new FormData();
    formData.append('file', file);
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
 * Get the GLTF model as a blob URL for a part
 * @param {number} partId - Part ID
 * @returns {Promise<string>} Blob URL to the GLTF model
 */
export async function getPartModelBlobUrl(partId) {
    // Use Vite's BASE_URL which respects the subpath configured during build
    const base = import.meta.env.BASE_URL || '/';
    const basePath = base === '/' ? '' : base.replace(/\/$/, '');
    const url = basePath + `/api/parts/${partId}/model`;
    
    const { appState } = await import('../modules/state.js');
    
    const headers = {};
    if (appState.apiKey) {
        headers['X-API-Key'] = appState.apiKey;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
        throw new Error(`Failed to load model: ${response.status}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
