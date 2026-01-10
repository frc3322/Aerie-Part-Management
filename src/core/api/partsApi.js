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
import { getApiKeyFromCookie } from "../auth/auth.js";
import { ENDPOINTS } from "./endpoints.js";

// Blob URL cache with automatic cleanup and size limits
const MAX_CACHE_SIZE = 50; // Maximum number of cached blob URLs
const CACHE_EXPIRY_MS = 1800000; // 30 minutes

class BlobUrlCache {
    constructor(maxSize = MAX_CACHE_SIZE, expiryMs = CACHE_EXPIRY_MS) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.expiryMs = expiryMs;
    }

    set(key, blobUrl) {
        // Evict oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.revoke(firstKey);
        }

        this.cache.set(key, {
            url: blobUrl,
            timestamp: Date.now(),
        });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.expiryMs) {
            this.revoke(key);
            return null;
        }

        return entry.url;
    }

    has(key) {
        return this.get(key) !== null;
    }

    revoke(key) {
        const entry = this.cache.get(key);
        if (entry?.url) {
            URL.revokeObjectURL(entry.url);
        }
        this.cache.delete(key);
    }

    clear() {
        for (const key of this.cache.keys()) {
            this.revoke(key);
        }
    }
}

// Initialize caches
const cadModelCache = new BlobUrlCache();
const pendingModelRequests = new Map();
const pendingViewRequests = new Map();
const pendingManifestRequests = new Map();

// Clean up blob URLs when page unloads
if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
        cadModelCache.clear();
    });
}

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
    return await apiGet(ENDPOINTS.PARTS.LIST, options);
}

/**
 * Get a specific part by ID
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Part data
 */
export async function getPart(partId) {
    return await apiGet(ENDPOINTS.PARTS.GET(partId));
}

/**
 * Create a new part
 * @param {Object} partData - Part data to create
 * @returns {Promise<Object>} Created part data
 */
export async function createPart(partData) {
    return await apiPost(ENDPOINTS.PARTS.CREATE, partData);
}

/**
 * Update an existing part
 * @param {number} partId - Part ID
 * @param {Object} partData - Updated part data
 * @returns {Promise<Object>} Updated part data
 */
export async function updatePart(partId, partData) {
    return await apiPut(ENDPOINTS.PARTS.UPDATE(partId), partData);
}

/**
 * Delete a part
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Success message
 */
export async function deletePart(partId) {
    return await apiDelete(ENDPOINTS.PARTS.DELETE(partId));
}

/**
 * Approve a part for production
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function approvePart(partId, payload = {}) {
    return await apiPost(ENDPOINTS.PARTS.APPROVE(partId), payload);
}

/**
 * Assign a part to a user
 * @param {number} partId - Part ID
 * @param {string} assignedUser - User to assign to
 * @returns {Promise<Object>} Updated part data
 */
export async function assignPart(partId, assignedUser) {
    return await apiPost(ENDPOINTS.PARTS.ASSIGN(partId), {
        assigned: assignedUser,
    });
}

/**
 * Unclaim a part (remove assignment)
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function unclaimPart(partId) {
    return await apiPost(ENDPOINTS.PARTS.UNCLAIM(partId));
}

/**
 * Mark a part as completed
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function completePart(partId, payload = {}) {
    return await apiPost(ENDPOINTS.PARTS.COMPLETE(partId), payload);
}

/**
 * Revert a completed part back to previous category
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Updated part data
 */
export async function revertPart(partId) {
    return await apiPost(ENDPOINTS.PARTS.REVERT(partId));
}

/**
 * Get parts by category
 * @param {string} category - Category name (review, cnc, hand, completed)
 * @param {Object} options - Additional query options
 * @returns {Promise<Object>} Parts data
 */
export async function getPartsByCategory(category, options = {}) {
    return await apiGet(ENDPOINTS.PARTS.BY_CATEGORY(category), options);
}

/**
 * Get system statistics
 * @returns {Promise<Object>} Statistics data
 */
export async function getStats() {
    return await apiGet(ENDPOINTS.PARTS.STATS);
}

/**
 * Get leaderboard data
 * @returns {Promise<Object>} Leaderboard data
 */
export async function getLeaderboard() {
    return await apiGet(ENDPOINTS.PARTS.LEADERBOARD);
}

/**
 * Wipe all parts from the system
 * @param {string} password - The system password for confirmation
 * @returns {Promise<Object>} Success message
 */
export async function wipeAllParts(password) {
    return await apiPost(ENDPOINTS.PARTS.WIPE, { password });
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
    return await apiPostMultipart(ENDPOINTS.PARTS.UPLOAD(partId), formData);
}

/**
 * Download the original STEP file for a part
 * @param {number} partId - Part ID
 * @param {string} filename - Filename for download
 * @returns {Promise<Blob>} File blob
 */
export async function downloadPartFile(partId, filename) {
    return await apiDownloadFile(ENDPOINTS.PARTS.DOWNLOAD(partId), filename);
}

/**
 * Check authentication status
 * @returns {Promise<Object>} Authentication status
 */
export async function checkAuth() {
    return await apiGet(ENDPOINTS.PARTS.AUTH_CHECK);
}

/**
 * Get the stored file (STEP or PDF) as a blob URL for preview
 * @param {number} partId - Part ID
 * @returns {Promise<string>} Blob URL to the stored file
 */
export async function getPartFileBlobUrl(partId) {
    const base = import.meta.env.BASE_URL || "/";
    const basePath = base === "/" ? "" : base.replace(/\/$/, "");
    const url = basePath + "/api" + ENDPOINTS.PARTS.FILE(partId);

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
    // Check cache first
    const cachedUrl = cadModelCache.get(partId);
    if (cachedUrl) {
        return cachedUrl;
    }

    // Check if there is already a pending request for this part
    if (pendingModelRequests.has(partId)) {
        return pendingModelRequests.get(partId);
    }

    const request = (async () => {
        try {
            // Use Vite's BASE_URL which respects the subpath configured during build
            const base = import.meta.env.BASE_URL || "/";
            const basePath = base === "/" ? "" : base.replace(/\/$/, "");
            const url = basePath + "/api" + ENDPOINTS.PARTS.MODEL(partId);

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
            const blobUrl = URL.createObjectURL(blob);

            // Cache the blob URL with automatic expiry
            cadModelCache.set(partId, blobUrl);

            return blobUrl;
        } finally {
            // Remove from pending requests map regardless of success/failure
            pendingModelRequests.delete(partId);
        }
    })();

    // Store the promise in the pending requests map
    pendingModelRequests.set(partId, request);

    return request;
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
    const url = basePath + "/api" + ENDPOINTS.PARTS.DRAWING(partId) + query;

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

/**
 * Upload rendered views for a part
 * @param {number} partId - Part ID
 * @param {FormData} formData - Multipart form data with view blobs
 * @returns {Promise<Object>} Upload result
 */
export async function uploadPartViews(partId, formData) {
    return await apiPostMultipart(ENDPOINTS.PARTS.UPLOAD_VIEWS(partId), formData);
}

/**
 * Get views manifest for a part
 * @param {number} partId - Part ID
 * @returns {Promise<Object>} Views manifest
 */
export async function getPartViewsManifest(partId) {
    if (pendingManifestRequests.has(partId)) {
        return pendingManifestRequests.get(partId);
    }

    const request = (async () => {
        try {
            return await apiGet(ENDPOINTS.PARTS.VIEWS_MANIFEST(partId));
        } finally {
            pendingManifestRequests.delete(partId);
        }
    })();

    pendingManifestRequests.set(partId, request);
    return request;
}

/**
 * Get a specific view image as a blob URL
 * @param {number} partId - Part ID
 * @param {number} viewIndex - Index of the view (0-7)
 * @returns {Promise<string>} Blob URL to the view image
 */
export async function getPartViewBlobUrl(partId, viewIndex) {
    const cacheKey = `${partId}-${viewIndex}`;
    if (pendingViewRequests.has(cacheKey)) {
        return pendingViewRequests.get(cacheKey);
    }

    const request = (async () => {
        try {
            const base = import.meta.env.BASE_URL || "/";
            const basePath = base === "/" ? "" : base.replace(/\/$/, "");
            const url = basePath + "/api" + ENDPOINTS.PARTS.VIEW_IMAGE(partId, viewIndex);

            const headers = {};
            const apiKey = getApiKeyFromCookie();
            if (apiKey) {
                headers["X-API-Key"] = apiKey;
            }

            const response = await fetch(url, { headers });

            if (!response.ok) {
                throw new Error(
                    `Failed to load view ${viewIndex}: ${response.status}`
                );
            }

            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } finally {
            pendingViewRequests.delete(cacheKey);
        }
    })();

    pendingViewRequests.set(cacheKey, request);
    return request;
}
