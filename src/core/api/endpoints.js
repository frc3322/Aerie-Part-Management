/**
 * Centralized API Endpoint Definitions
 * All backend API endpoints are defined here to prevent typos and enable easy refactoring
 */

// Base endpoints
export const ENDPOINTS = {
    // Parts endpoints
    PARTS: {
        LIST: "/parts/",
        GET: (id) => `/parts/${id}`,
        CREATE: "/parts/",
        UPDATE: (id) => `/parts/${id}`,
        DELETE: (id) => `/parts/${id}`,

        // Part actions
        APPROVE: (id) => `/parts/${id}/approve`,
        ASSIGN: (id) => `/parts/${id}/assign`,
        UNCLAIM: (id) => `/parts/${id}/unclaim`,
        COMPLETE: (id) => `/parts/${id}/complete`,
        REVERT: (id) => `/parts/${id}/revert`,

        // File operations
        UPLOAD: (id) => `/parts/${id}/upload`,
        DOWNLOAD: (id) => `/parts/${id}/download`,
        FILE: (id) => `/parts/${id}/file`,
        MODEL: (id) => `/parts/${id}/model`,
        DRAWING: (id) => `/parts/${id}/drawing`,

        // Views
        UPLOAD_VIEWS: (id) => `/parts/${id}/views`,
        VIEWS_MANIFEST: (id) => `/parts/${id}/views`,
        VIEW_IMAGE: (id, viewIndex) => `/parts/${id}/views/${viewIndex}`,

        // Categories and stats
        BY_CATEGORY: (category) => `/parts/categories/${category}`,
        STATS: "/parts/stats",
        LEADERBOARD: "/parts/leaderboard",

        // System
        WIPE: "/parts/wipe",
        AUTH_CHECK: "/parts/auth/check",
    },
};

// Helper function to build full URL with query parameters
export function buildUrlWithParams(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return queryString ? `${endpoint}?${queryString}` : endpoint;
}
