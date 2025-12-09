// State Management Module
// Manages all application state and provides state-related utilities

import { getParts, getStats } from "../utils/partsApi.js";
import { renderReview } from "./review.js";
import { renderCNC } from "./cnc.js";
import { renderHandFab } from "./handFab.js";
import { renderCompleted } from "./completed.js";
import { loadCurrentTab, loadTabVisibility } from "./persistence.js";

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
  // Tab visibility settings
  tabVisibility: {
    review: true,
    cnc: true,
    hand: true,
    completed: true,
  },
  isMobile: false,
};

/**
 * Load persisted state from localStorage
 */
function loadPersistedState() {
  // Load current tab
  const savedTab = loadCurrentTab();
  if (savedTab && ["review", "cnc", "hand", "completed"].includes(savedTab)) {
    appState.currentTab = savedTab;
  }
  if (appState.isMobile && !["hand", "completed"].includes(appState.currentTab)) {
    appState.currentTab = "hand";
  }

  // Load tab visibility settings
  const savedVisibility = loadTabVisibility();
  if (savedVisibility && typeof savedVisibility === "object") {
    appState.tabVisibility = { ...appState.tabVisibility, ...savedVisibility };
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
  const uaMobile = /android|iphone|ipad|ipod|windows phone|blackberry|mobile/i.test(
    agent
  );
  const isUaDataMobile = navigator.userAgentData?.mobile === true;
  const smallViewport = window.innerWidth <= 768;
  const isMobile = Boolean((hasTouch && (uaMobile || isUaDataMobile)) || smallViewport);
  appState.isMobile = isMobile;
  if (isMobile && !["hand", "completed"].includes(appState.currentTab)) {
    appState.currentTab = "hand";
  }
  if (!isMobile && !["review", "cnc", "hand", "completed"].includes(appState.currentTab)) {
    appState.currentTab = "review";
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
      renderCNC();
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
  }
}

/**
 * Initialize the application state by loading data from API
 */
export async function initializeState() {
  try {
    // Load persisted state first
    loadPersistedState();

    appState.isLoading = true;

    // Load all parts
    await loadAllParts();

    // Load statistics
    await loadStats();
  } catch (error) {
    console.error("Failed to initialize state:", error);
    // Show error to user - could add toast notification here
    alert(
      "Failed to load data from server. Please check your connection and try again."
    );
  } finally {
    appState.isLoading = false;
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

    // Clear existing parts
    appState.parts.review = [];
    appState.parts.cnc = [];
    appState.parts.hand = [];
    appState.parts.completed = [];

    // Organize parts by category
    for (const part of allParts) {
      const category = part.category || "review"; // Default to review if no category
      if (appState.parts[category]) {
        appState.parts[category].push(part);
      }
    }
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
    appState.loadingTab = category;
    const response = await getParts({ category });
    appState.parts[category] = (response.parts || []).map(normalizePart);
  } catch (error) {
    console.error(`Failed to load ${category} parts:`, error);
    throw error;
  } finally {
    appState.loadingTab = null;
    // Re-render the current tab if it matches the loaded category
    if (appState.currentTab === category) {
      await reRenderCurrentTab();
    }
  }
}

/**
 * Load system statistics
 */
export async function loadStats() {
  try {
    appState.stats = await getStats();
  } catch (error) {
    console.error("Failed to load stats:", error);
    // Don't throw here - stats are not critical
    appState.stats = null;
  }
}

/**
 * Refresh all data from the backend
 */
export async function refreshData() {
  try {
    appState.isLoading = true;
    await Promise.all([loadAllParts(), loadStats()]);
  } catch (error) {
    console.error("Failed to refresh data:", error);
    throw error;
  } finally {
    appState.isLoading = false;
    // Re-render the current tab to show refreshed data
    await reRenderCurrentTab();
  }
}

/**
 * Set the current active tab
 * @param {string} tab - The tab to switch to
 */
export function setCurrentTab(tab) {
  appState.currentTab = tab;
}

/**
 * Set the search query
 * @param {string} query - The search query
 */
export function setSearchQuery(query) {
  appState.searchQuery = query;
}

/**
 * Toggle sort direction
 */
export function toggleSortDirection() {
  appState.sortDirection = appState.sortDirection === 1 ? -1 : 1;
}

/**
 * Set the API key and mark as authenticated
 * @param {string} apiKey - The API key to store
 */
export function setApiKey(apiKey) {
  appState.apiKey = apiKey;
  appState.isAuthenticated = true;
}

/**
 * Clear the API key and mark as unauthenticated
 */
export function clearApiKey() {
  appState.apiKey = null;
  appState.isAuthenticated = false;
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
  if (appState.parts[category]) {
    appState.parts[category].push(part);
  }
}

/**
 * Remove a part from a specific category by index
 * @param {string} category - The category to remove from
 * @param {number} index - The index of the part to remove
 */
export function removePartFromCategory(category, index) {
  if (appState.parts[category]?.[index]) {
    appState.parts[category].splice(index, 1);
  }
}

/**
 * Update a part in state by ID
 * @param {number} partId - Part ID to update
 * @param {Object} updatedPart - Updated part data
 */
export function updatePartInState(partId, updatedPart) {
  // Find and update the part in all categories
  for (const category of ["review", "cnc", "hand", "completed"]) {
    const parts = appState.parts[category];
    const index = parts.findIndex((part) => part.id === partId);
    if (index !== -1) {
      // If category changed, move to new category
      if (updatedPart.category === category) {
        // Update in place
        parts[index] = normalizePart({ ...parts[index], ...updatedPart });
      } else {
        parts.splice(index, 1); // Remove from current category
        if (appState.parts[updatedPart.category]) {
          appState.parts[updatedPart.category].push(normalizePart(updatedPart));
        }
      }
      break;
    }
  }
}

/**
 * Add a new part to the appropriate category
 * @param {Object} part - Part to add
 */
export function addPartToState(part) {
  const category = part.category || "review";
  if (appState.parts[category]) {
    appState.parts[category].push(normalizePart(part));
  }
}

/**
 * Remove a part from state by ID
 * @param {number} partId - Part ID to remove
 */
export function removePartFromState(partId) {
  for (const category of ["review", "cnc", "hand", "completed"]) {
    const parts = appState.parts[category];
    const index = parts.findIndex((part) => part.id === partId);
    if (index !== -1) {
      parts.splice(index, 1);
      break;
    }
  }
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
