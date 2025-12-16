// State Management Module
// Manages all application state and provides state-related utilities

import { getParts, getStats } from "../../core/api/router.js";
import { showErrorNotification } from "../../core/dom/notificationManager.js";
import { renderReview } from "../tabs/review.js";
import { renderHandFab } from "../tabs/handFab.js";

// Dynamically import renderCNC when needed
const loadRenderCNC = async () => {
    const { renderCNC } = await import("../tabs/cnc.js");
    return renderCNC;
};
import { renderCompleted } from "../tabs/completed.js";
import { renderLeaderboard } from "../tabs/leaderboard.js";
import {
    loadCurrentTab,
    loadTabVisibility,
    loadDisable3JSPreview,
    saveDisable3JSPreview,
} from "./persistence.js";
import {
    initReactiveState,
    setState,
    getState,
} from "../../core/state/reactiveState.js";

/** @typedef {{id?: number, type?: string, name?: string, subsystem?: string, assigned?: string, status: string, notes?: string, file?: string, onshapeUrl?: string, claimedDate?: string, category?: string, createdAt?: string, updatedAt?: string, amount?: number}} Part */

/** @typedef {{
 *   review: Part[],
 *   cnc: Part[],
 *   hand: Part[],
 *   completed: Part[]
 * }} PartsState */

// Application state object
export const appState = {
    currentTab: "review",
    searchQuery: "",
    sortDirection: 1,
    sortState: {
        hand: { key: null, direction: 1 },
        review: { key: null, direction: 1 },
        completed: { key: null, direction: 1 },
    },
    // Authentication state
    apiKey: null,
    isAuthenticated: false,
    // Loading states
    isLoading: false,
    loadingTab: null,
    // Parts data
    parts: {
        review: [],
        cnc: [],
        hand: [],
        completed: [],
    },
    // Statistics
    stats: null,
    // Leaderboard data
    leaderboard: [],
    // Tab visibility settings
    tabVisibility: {
        review: true,
        cnc: true,
        hand: true,
        completed: true,
        leaderboard: true,
    },
    // Display settings
    disable3JSPreview: false,
    isMobile: false,
};

initReactiveState(appState);

/**
 * Load persisted state from localStorage
 */
function loadPersistedState() {
    // Load current tab
    const savedTab = loadCurrentTab();
    if (
        savedTab &&
        ["review", "cnc", "hand", "completed", "leaderboard"].includes(savedTab)
    ) {
        setState("currentTab", savedTab);
    }
    if (
        getState("isMobile") &&
        !["hand", "completed"].includes(getState("currentTab"))
    ) {
        setState("currentTab", "hand");
    }

    // Load tab visibility settings
    const savedVisibility = loadTabVisibility();
    if (savedVisibility && typeof savedVisibility === "object") {
        setState("tabVisibility", {
            ...getState("tabVisibility"),
            ...savedVisibility,
        });
    }

    // Load disable 3JS preview setting
    const savedDisable3JS = loadDisable3JSPreview();
    if (typeof savedDisable3JS === "boolean") {
        setState("disable3JSPreview", savedDisable3JS);
    }
}

/**
 * Detect whether the current device should use the mobile layout.
 * Uses touch + user agent and falls back to small viewport width.
 * @returns {boolean} True if mobile device detected
 */
export function detectMobileDevice() {
    const agent = navigator.userAgent || "";
    const hasTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0;
    const uaMobile =
        /android|iphone|ipad|ipod|windows phone|blackberry|mobile/i.test(agent);
    const isUaDataMobile = navigator.userAgentData?.mobile === true;
    const smallViewport = window.innerWidth <= 768;
    const isMobile = Boolean(
        (hasTouch && (uaMobile || isUaDataMobile)) || smallViewport
    );
    setState("isMobile", isMobile);
    if (isMobile && !["hand", "completed"].includes(getState("currentTab"))) {
        setState("currentTab", "hand");
    }
    if (
        !isMobile &&
        !["review", "cnc", "hand", "completed", "leaderboard"].includes(
            getState("currentTab")
        )
    ) {
        setState("currentTab", "review");
    }
    return isMobile;
}

/**
 * Re-render the current tab's content
 */
async function reRenderCurrentTab() {
    switch (appState.currentTab) {
        case "review": {
            renderReview();
            break;
        }
        case "cnc": {
            (await loadRenderCNC())();
            break;
        }
        case "hand": {
            renderHandFab();
            break;
        }
        case "completed": {
            renderCompleted();
            break;
        }
        case "leaderboard": {
            renderLeaderboard();
            break;
        }
    }
}

/**
 * Initialize the application state by loading data from API
 */
export async function initializeState() {
    try {
        // Load persisted state first
        loadPersistedState();

        setState("isLoading", true);

        // Load all parts
        await loadAllParts();

        // Load statistics
        await loadStats();
    } catch (error) {
        console.error("Failed to initialize state:", error);
        // Show error to user
        showErrorNotification(
            "Connection Error",
            "Failed to load data from server. Please check your connection and try again."
        );
    } finally {
        setState("isLoading", false);
        // Re-render the current tab to show loaded data
        await reRenderCurrentTab();
    }
}

/**
 * Load all parts from the backend and organize by category
 */
export async function loadAllParts() {
    try {
        const response = await getParts();
        const allParts = (response.parts || []).map(normalizePart);

        const nextParts = {
            review: [],
            cnc: [],
            hand: [],
            completed: [],
        };

        allParts.forEach((part) => {
            const category = part.category || "review";
            if (nextParts[category]) {
                nextParts[category].push(part);
            }
        });

        setState("parts", nextParts);
    } catch (error) {
        console.error("Failed to load parts:", error);
        throw error;
    }
}

/**
 * Load parts for a specific category
 * @param {string} category - Category to load (review, cnc, hand, completed)
 */
export async function loadPartsForCategory(category) {
    try {
        setState("loadingTab", category);
        const response = await getParts({ category });
        setState(
            `parts.${category}`,
            (response.parts || []).map(normalizePart)
        );
    } catch (error) {
        console.error(`Failed to load ${category} parts:`, error);
        throw error;
    } finally {
        setState("loadingTab", null);
        // Re-render the current tab if it matches the loaded category
        if (getState("currentTab") === category) {
            await reRenderCurrentTab();
        }
    }
}

/**
 * Load system statistics
 */
export async function loadStats() {
    try {
        const stats = await getStats();
        setState("stats", stats);
    } catch (error) {
        console.error("Failed to load stats:", error);
        // Don't throw here - stats are not critical
        setState("stats", null);
    }
}

/**
 * Refresh all data from the backend
 */
export async function refreshData() {
    try {
        setState("isLoading", true);
        await Promise.all([loadAllParts(), loadStats()]);
    } catch (error) {
        console.error("Failed to refresh data:", error);
        throw error;
    } finally {
        setState("isLoading", false);
        // Re-render the current tab to show refreshed data
        await reRenderCurrentTab();
    }
}

/**
 * Set the current active tab
 * @param {string} tab - The tab to switch to
 */
export function setCurrentTab(tab) {
    setState("currentTab", tab);
}

/**
 * Set the search query
 * @param {string} query - The search query
 */
export function setSearchQuery(query) {
    setState("searchQuery", query);
}

/**
 * Toggle the disable 3JS preview setting
 */
export function toggleDisable3JSPreview() {
    const currentValue = getState("disable3JSPreview");
    const newValue = !currentValue;
    setState("disable3JSPreview", newValue);
    saveDisable3JSPreview(newValue);
}

/**
 * Set the disable 3JS preview setting directly
 * @param {boolean} disabled - Whether 3JS previews should be disabled
 */
export function setDisable3JSPreview(disabled) {
    const value = Boolean(disabled);
    setState("disable3JSPreview", value);
    saveDisable3JSPreview(value);
}

/**
 * Toggle sort direction
 */
export function toggleSortDirection() {
    setState("sortDirection", getState("sortDirection") === 1 ? -1 : 1);
}

/**
 * Set the API key and mark as authenticated
 * @param {string} apiKey - The API key to store
 */
export function setApiKey(apiKey) {
    setState("apiKey", apiKey);
    setState("isAuthenticated", true);
}

/**
 * Clear the API key and mark as unauthenticated
 */
export function clearApiKey() {
    setState("apiKey", null);
    setState("isAuthenticated", false);
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated, false otherwise
 */
export function isAuthenticated() {
    return appState.isAuthenticated && appState.apiKey;
}

/**
 * Get all parts from a specific category
 * @param {string} category - The category to get parts from
 * @returns {Part[]}
 */
export function getPartsByCategory(category) {
    return appState.parts[category] || [];
}

/**
 * Add a part to a specific category
 * @param {string} category - The category to add to
 * @param {Part} part - The part to add
 */
export function addPartToCategory(category, part) {
    const partsForCategory = appState.parts[category];
    if (!partsForCategory) return;
    setState(`parts.${category}`, [...partsForCategory, part]);
}

/**
 * Remove a part from a specific category by index
 * @param {string} category - The category to remove from
 * @param {number} index - The index of the part to remove
 */
export function removePartFromCategory(category, index) {
    const partsForCategory = appState.parts[category];
    if (!partsForCategory?.[index]) return;
    const nextCategory = [...partsForCategory];
    nextCategory.splice(index, 1);
    setState(`parts.${category}`, nextCategory);
}

/**
 * Update a part in state by ID
 * @param {number} partId - Part ID to update
 * @param {Object} updatedPart - Updated part data
 */
export function updatePartInState(partId, updatedPart) {
    console.log(
        "[updatePartInState] Called with partId:",
        partId,
        "updatedPart:",
        updatedPart
    );
    console.log(
        "[updatePartInState] Current state - review:",
        appState.parts.review.length,
        "cnc:",
        appState.parts.cnc.length,
        "hand:",
        appState.parts.hand.length
    );

    // Find and update the part in all categories
    const nextParts = { ...appState.parts };
    let foundInCategory = null;

    for (const category of ["review", "cnc", "hand", "completed"]) {
        const parts = nextParts[category];
        const index = parts.findIndex((part) => part.id === partId);
        if (index !== -1) {
            foundInCategory = category;
            console.log(
                "[updatePartInState] Found part in category:",
                category,
                "at index:",
                index
            );
            console.log(
                "[updatePartInState] Updated part category:",
                updatedPart.category,
                "current category:",
                category
            );

            // If category changed, move to new category
            if (updatedPart.category === category) {
                console.log(
                    "[updatePartInState] Category unchanged, updating in place"
                );
                const updatedList = [...parts];
                updatedList[index] = normalizePart({
                    ...parts[index],
                    ...updatedPart,
                });
                nextParts[category] = updatedList;
            } else {
                console.log(
                    "[updatePartInState] Category changed, moving from",
                    category,
                    "to",
                    updatedPart.category
                );
                const updatedList = [...parts];
                updatedList.splice(index, 1);
                nextParts[category] = updatedList;
                console.log(
                    "[updatePartInState] Removed from",
                    category,
                    "- new count:",
                    nextParts[category].length
                );

                if (nextParts[updatedPart.category]) {
                    nextParts[updatedPart.category] = [
                        ...nextParts[updatedPart.category],
                        normalizePart(updatedPart),
                    ];
                    console.log(
                        "[updatePartInState] Added to",
                        updatedPart.category,
                        "- new count:",
                        nextParts[updatedPart.category].length
                    );
                } else {
                    console.warn(
                        "[updatePartInState] Target category",
                        updatedPart.category,
                        "does not exist!"
                    );
                }
            }
            break;
        }
    }

    if (!foundInCategory) {
        console.warn("[updatePartInState] Part not found in any category!");
    }

    console.log(
        "[updatePartInState] Before setState - nextParts review:",
        nextParts.review.length
    );
    setState("parts", nextParts);
    console.log(
        "[updatePartInState] After setState - appState.parts.review:",
        appState.parts.review.length
    );
}

/**
 * Add a new part to the appropriate category
 * @param {Object} part - Part to add
 */
export function addPartToState(part) {
    const category = part.category || "review";
    if (appState.parts[category]) {
        setState(`parts.${category}`, [
            ...appState.parts[category],
            normalizePart(part),
        ]);
    }
}

/**
 * Remove a part from state by ID
 * @param {number} partId - Part ID to remove
 */
export function removePartFromState(partId) {
    const nextParts = { ...appState.parts };
    for (const category of ["review", "cnc", "hand", "completed"]) {
        const parts = nextParts[category];
        const index = parts.findIndex((part) => part.id === partId);
        if (index !== -1) {
            const updatedList = [...parts];
            updatedList.splice(index, 1);
            nextParts[category] = updatedList;
            break;
        }
    }
    setState("parts", nextParts);
}

function normalizePart(part) {
    const parsedAmount = Number.parseInt(part?.amount ?? 1, 10);
    const safeAmount =
        Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 1;
    const rawPartId = (part && (part.partId ?? part.part_id ?? "")) || "";
    const normalizedPartId = String(rawPartId).trim();
    const fallbackId =
        normalizedPartId ||
        (part?.name ? String(part.name) : "") ||
        (part?.id ? String(part.id) : "");
    return { ...part, amount: safeAmount, partId: fallbackId };
}

// Export individual state variables for backward compatibility
export const currentTab = appState.currentTab;
export const searchQuery = appState.searchQuery;
export const sortDirection = appState.sortDirection;
export const parts = appState.parts;
