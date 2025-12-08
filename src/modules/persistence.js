// Persistence Module
// Handles client-side persistence using localStorage

const STORAGE_KEYS = {
  CURRENT_TAB: "partManagement_currentTab",
  TAB_VISIBILITY: "partManagement_tabVisibility",
};

/**
 * Save the current active tab to localStorage
 * @param {string} tab - The current tab name
 */
export function saveCurrentTab(tab) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_TAB, tab);
  } catch (error) {
    console.warn("Failed to save current tab to localStorage:", error);
  }
}

/**
 * Load the saved current tab from localStorage
 * @returns {string|null} The saved tab name, or null if not found
 */
export function loadCurrentTab() {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_TAB);
  } catch (error) {
    console.warn("Failed to load current tab from localStorage:", error);
    return null;
  }
}

/**
 * Save tab visibility settings to localStorage
 * @param {Object} visibility - Object with tab names as keys and boolean visibility as values
 */
export function saveTabVisibility(visibility) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.TAB_VISIBILITY,
      JSON.stringify(visibility)
    );
  } catch (error) {
    console.warn("Failed to save tab visibility to localStorage:", error);
  }
}

/**
 * Load tab visibility settings from localStorage
 * @returns {Object|null} Object with tab visibility settings, or null if not found
 */
export function loadTabVisibility() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TAB_VISIBILITY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Failed to load tab visibility from localStorage:", error);
    return null;
  }
}

/**
 * Clear all persisted data (useful for logout or reset)
 */
export function clearPersistedData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_TAB);
    localStorage.removeItem(STORAGE_KEYS.TAB_VISIBILITY);
  } catch (error) {
    console.warn("Failed to clear persisted data:", error);
  }
}
