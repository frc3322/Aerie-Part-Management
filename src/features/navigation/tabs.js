// Tab Management Module
// Handles tab switching and navigation

import {
    appState,
    loadAllParts,
    loadPartsForCategory,
    setSearchQuery,
} from "../state/state.js";
import { renderReview } from "../tabs/review.js";
import { renderHandFab } from "../tabs/handFab.js";

// Dynamically import renderCNC when needed
const loadRenderCNC = async () => {
    const { renderCNC } = await import("../tabs/cnc.js");
    return renderCNC;
};
import { renderCompleted } from "../tabs/completed.js";
import { renderLeaderboard, loadLeaderboard } from "../tabs/leaderboard.js";
import { saveCurrentTab } from "../state/persistence.js";
import { updateScrollbarEdgeEffect } from "../../core/utils/helpers.js";
import {
    getState,
    subscribe,
    setState,
} from "../../core/state/reactiveState.js";
import { cleanupAllViewers } from "../../components/threeDViewer.js";

// Debounce timer for search
let searchDebounceTimer = null;
const DESKTOP_TABS = ["review", "cnc", "hand", "misc", "completed", "leaderboard"];
const MOBILE_TABS = ["hand", "completed"];
let mobileGesturesAttached = false;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeTargets = []; // Store targets for cleanup

function getAllowedTabs() {
    return appState.isMobile ? MOBILE_TABS : DESKTOP_TABS;
}

function updateMobileNavActive(tab) {
    const handBtn = document.getElementById("mobile-tab-hand");
    const completedBtn = document.getElementById("mobile-tab-completed");
    const buttons = [
        { element: handBtn, tab: "hand" },
        { element: completedBtn, tab: "completed" },
    ];
    buttons.forEach(({ element, tab: buttonTab }) => {
        if (!element) return;
        if (buttonTab === tab) {
            element.classList.add("mobile-tab-active");
        } else {
            element.classList.remove("mobile-tab-active");
        }
    });
}

function toggleMobileNavVisibility() {
    const nav = document.getElementById("mobile-tab-nav");
    if (!nav) return;
    nav.classList.toggle("hidden", !appState.isMobile);
}

function toggleDesktopTabsVisibility() {
    const desktopRow = document.getElementById("desktop-tab-row");
    if (!desktopRow) return;
    desktopRow.classList.toggle("hidden", appState.isMobile);
}

function toggleAddButtonVisibility() {
    const addBtn = document.getElementById("add-part-btn");
    if (!addBtn) return;
    addBtn.classList.toggle("hidden", appState.isMobile);
}

function toggleSettingsButtonVisibility() {
    const settingsBtn = document.getElementById("settings-btn");
    if (!settingsBtn) return;
    settingsBtn.classList.toggle("hidden", appState.isMobile);
}

function handleSwipeDirection(direction) {
    const order = getAllowedTabs();
    const currentIndex = order.indexOf(appState.currentTab);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= order.length) return;
    switchTab(order[nextIndex]);
}

function onTouchStart(event) {
    if (!appState.isMobile) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
}

function onTouchEnd(event) {
    if (!appState.isMobile) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaY) > 60) return;
    handleSwipeDirection(deltaX < 0 ? 1 : -1);
}

function attachSwipeHandlers() {
    if (mobileGesturesAttached) return;
    const targets = ["content-hand", "content-completed"]
        .map((id) => document.getElementById(id))
        .filter(Boolean);
    swipeTargets = targets; // Store for cleanup
    targets.forEach((target) => {
        target.addEventListener("touchstart", onTouchStart, { passive: true });
        target.addEventListener("touchend", onTouchEnd, { passive: true });
    });
    mobileGesturesAttached = true;
}

function detachSwipeHandlers() {
    swipeTargets.forEach((target) => {
        target.removeEventListener("touchstart", onTouchStart);
        target.removeEventListener("touchend", onTouchEnd);
    });
    swipeTargets = [];
    mobileGesturesAttached = false;
}

export function configureMobileUI() {
    toggleMobileNavVisibility();
    toggleDesktopTabsVisibility();
    toggleAddButtonVisibility();
    toggleSettingsButtonVisibility();
    if (appState.isMobile) {
        attachSwipeHandlers();
        updateMobileNavActive(appState.currentTab);
    }
}

/**
 * Switch to a specific tab
 * @param {string} tab - The tab to switch to
 */
export async function switchTab(tab) {
    // Clean up 3D viewer event listeners before switching tabs
    cleanupAllViewers();

    let targetTab = tab;
    const allowedTabs = getAllowedTabs();
    if (!allowedTabs.includes(targetTab)) {
        targetTab = allowedTabs[0];
    }
    setState("currentTab", targetTab);

    // Save current tab to localStorage
    saveCurrentTab(targetTab);

    // Reset UI
    for (const t of DESKTOP_TABS) {
        const btn = document.getElementById(`tab-${t}`);
        const content = document.getElementById(`content-${t}`);
        if (!btn || !content) continue;

        if (t === targetTab) {
            btn.classList.add("active-tab", "text-blue-400");
            btn.classList.remove("text-gray-400");
            content.classList.remove("hidden");
        } else {
            btn.classList.remove("active-tab", "text-blue-400");
            btn.classList.add("text-gray-400");
            content.classList.add("hidden");
        }
    }
    updateMobileNavActive(targetTab);

    // Fetch fresh data from server (only if authenticated)
    if (appState.isAuthenticated) {
        try {
            if (targetTab === "review") {
                // Load all parts for review tab to ensure proper categorization
                await loadAllParts();
            } else if (targetTab === "leaderboard") {
                // Load leaderboard data
                await loadLeaderboard();
                renderLeaderboard();
            } else {
                // Load fresh data for specific category
                await loadPartsForCategory(targetTab);
            }
        } catch (error) {
            console.error(`Failed to load ${targetTab} data:`, error);
            // Still render with current data if fetch fails
        }
    }

    // Update scrollbar edge effect for current tab after switching
    const currentContent = document.getElementById(`content-${targetTab}`);
    updateScrollbarEdgeEffect(currentContent);
}

/**
 * Handle search functionality with debouncing
 * @param {Event|string} eventOrQuery - Keyup event or search query string
 */
export function handleSearch(eventOrQuery) {
    let query;
    if (typeof eventOrQuery === "string") {
        query = eventOrQuery;
    } else if (eventOrQuery && eventOrQuery.target) {
        query = eventOrQuery.target.value;
    } else {
        return;
    }
    setSearchQuery(query);

    // Clear existing timer
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    // Set new timer to debounce search
    searchDebounceTimer = setTimeout(async () => {
        // Re-render current tab after debounce delay
        const currentTab = getCurrentTab();

        if (currentTab === "review") {
            renderReview();
        } else if (currentTab === "cnc") {
            (await loadRenderCNC())();
        } else if (currentTab === "hand") {
            renderHandFab();
        } else if (currentTab === "misc") {
            const { renderMisc } = await import("../tabs/misc.js");
            renderMisc();
        } else if (currentTab === "completed") {
            renderCompleted();
        }

        searchDebounceTimer = null;
    }, 300); // 300ms debounce delay
}

/**
 * Get the current active tab
 * @returns {string} The current tab name
 */
export function getCurrentTab() {
    return getState("currentTab");
}

function getSortValue(part, key) {
    if (key === "partId") return part.partId || part.id || part.name || "";
    if (key === "name") return part.name || part.partId || part.id || "";
    if (key === "assigned") return part.assigned || "";
    if (key === "status") return part.status || "";
    if (key === "subsystem") return part.subsystem || "";
    if (key === "material") return part.material || "";
    if (key === "type") return part.type || "";
    if (key === "file") return part.file || "";
    if (key === "notes") return part.notes || "";
    if (key === "serviceMethod") return part.miscInfo?.serviceMethod || part.misc_info?.serviceMethod || "";
    if (key === "amount") {
        const amount = Number(part.amount);
        return Number.isFinite(amount) ? amount : 0;
    }
    return part[key] || "";
}

function updateSortState(category, key) {
    const current = appState.sortState?.[category] || {
        key: null,
        direction: 1,
    };
    
    // Three-state cycle: ascending (1) -> descending (-1) -> no sort (null)
    let newKey = key;
    let newDirection = 1;
    
    if (current.key === key) {
        if (current.direction === 1) {
            // Currently ascending, switch to descending
            newDirection = -1;
        } else if (current.direction === -1) {
            // Currently descending, turn off sorting
            newKey = null;
            newDirection = 1;
        }
    } else {
        // Different key, start with ascending
        newKey = key;
        newDirection = 1;
    }
    
    appState.sortState[category] = { key: newKey, direction: newDirection };
    appState.sortDirection = newDirection;
    return { key: newKey, direction: newDirection };
}

function updateSortIndicators(category, activeKey, direction) {
    const actionName = `sort${category.toUpperCase()}`;
    const buttons = document.querySelectorAll(`[data-action="${actionName}"]`);
    
    buttons.forEach((button) => {
        const buttonKey = button.dataset.sortKey;
        const icon = button.querySelector('.sort-icon');
        
        if (!icon) return;
        
        // Reset icon classes using classList
        icon.classList.remove("fa-sort", "fa-sort-up", "fa-sort-down");
        
        // Reset button classes - remove blue styling
        button.classList.remove("text-blue-400");
        button.classList.add("text-gray-300");
        
        if (buttonKey === activeKey && activeKey !== null) {
            // Active sorting - make button blue and show appropriate arrow
            button.classList.remove("text-gray-300");
            button.classList.add("text-blue-400");
            
            if (direction === 1) {
                icon.classList.add("fa-sort-up");
            } else {
                icon.classList.add("fa-sort-down");
            }
        } else {
            // Not sorting - show default sort icon
            icon.classList.add("fa-sort");
        }
    });
}

function sortParts(category, key, direction) {
    // If key is null, don't sort (maintain original order)
    if (key === null) {
        return;
    }
    
    const parts = appState.parts[category] || [];
    parts.sort((a, b) => {
        const valA = getSortValue(a, key);
        const valB = getSortValue(b, key);
        if (typeof valA === "number" && typeof valB === "number") {
            return (valA - valB) * direction;
        }
        const normalizedA = valA.toString().toLowerCase();
        const normalizedB = valB.toString().toLowerCase();
        if (normalizedA < normalizedB) return -1 * direction;
        if (normalizedA > normalizedB) return 1 * direction;
        return 0;
    });
}

async function renderSortedCategory(category) {
    if (category === "hand") {
        renderHandFab();
    } else if (category === "review") {
        renderReview();
    } else if (category === "completed") {
        renderCompleted();
    } else if (category === "cnc") {
        (await loadRenderCNC())();
    } else if (category === "misc") {
        const { renderMisc } = await import("../tabs/misc.js");
        renderMisc();
    }
}

/**
 * Sort a table by category and key
 * @param {string} category - The tab category
 * @param {string} key - The key to sort by
 */
export async function sortTable(category, key) {
    const { key: newKey, direction } = updateSortState(category, key);
    sortParts(category, newKey, direction);
    await renderSortedCategory(category);
    // Update indicators after render completes
    setTimeout(() => updateSortIndicators(category, newKey, direction), 0);
}

/**
 * Sort CNC parts by a specific key
 * @param {string|Object} keyOrPayload - The key to sort by or event payload
 */
export async function sortCNC(keyOrPayload) {
    const key = typeof keyOrPayload === 'string' ? keyOrPayload : keyOrPayload.sortKey;
    await sortTable("cnc", key);
}

/**
 * Sort MISC parts by a specific key
 * @param {string|Object} keyOrPayload - The key to sort by or event payload
 */
export async function sortMISC(keyOrPayload) {
    const key = typeof keyOrPayload === 'string' ? keyOrPayload : keyOrPayload.sortKey;
    await sortTable("misc", key);
}

subscribe("currentTab", (tab) => {
    updateMobileNavActive(tab);
});

subscribe("isMobile", () => {
    configureMobileUI();
});

subscribe("parts.review", () => {
    renderReview();
});

subscribe("parts.cnc", async () => {
    (await loadRenderCNC())();
});

subscribe("parts.hand", () => {
    renderHandFab();
});

subscribe("parts.misc", async () => {
    const { renderMisc } = await import("../tabs/misc.js");
    renderMisc();
});

subscribe("parts.completed", () => {
    renderCompleted();
    // Refresh leaderboard when completed parts change
    if (getCurrentTab() === "leaderboard") {
        loadLeaderboard();
    }
});

subscribe("leaderboard", () => {
    renderLeaderboard();
});

// Cleanup on page unload
if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
        detachSwipeHandlers();
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
    });
}
