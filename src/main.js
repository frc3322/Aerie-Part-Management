// Prevent FOUC by showing content after CSS loads
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        // Small delay to ensure CSS is applied
        setTimeout(() => {
            document.body.classList.add("loaded");
        }, 50);
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        document.body.classList.add("loaded");
    }, 50);
}

import "./style.css";
import meowImageUrl from "./Meow.webp";

// Tailwind config (moved from script tag)
globalThis.tailwind = {
    config: {
        content: [
            "./index.html",
            "./src/**/*.{js,html,css}",
            "./src/templates/**/*.{html}",
        ],
        theme: {
            extend: {
                colors: {
                    gray: {
                        750: "#2d3748",
                        850: "#1a202c",
                        900: "#171923",
                    },
                    blue: {
                        450: "#5bc0de", // Custom light blue
                        550: "#31b0d5",
                    },
                },
                boxShadow: {
                    "3d": "5px 5px 10px #1a1c24, -5px -5px 10px #2e3240",
                    "3d-inset":
                        "inset 5px 5px 10px #1a1c24, inset -5px -5px 10px #2e3240",
                    "3d-hover": "7px 7px 14px #1a1c24, -7px -7px 14px #2e3240",
                },
            },
        },
    },
};

// Import all modules
import {
    initializeState,
    appState,
    detectMobileDevice,
} from "./features/state/state.js";
import {
    switchTab,
    handleSearch,
    sortTable,
    configureMobileUI,
} from "./features/navigation/tabs.js";
import {
    openSettingsModal,
    closeSettingsModal,
    toggleTabVisibility,
    toggleDisable3JS,
    openAddModal,
    closeModal,
    handleCategoryChange,
    handleMaterialChange,
    updateFileName,
} from "./features/modals/modals.js";
import {
    markCompleted,
    markUncompleted,
    markCompletedIncorrectly,
    approvePart,
    editPart,
    deletePart,
    markInProgress,
    confirmAssignment,
    closeAssignModal,
    unclaimPart,
    closeUnclaimModal,
    confirmUnclaim,
    closeCompleteAmountModal,
    confirmCompleteAmount,
    viewPartInfo,
} from "./features/parts/partActions.js";
import { handleFormSubmit } from "./features/forms/formHandler.js";
import {
    initializeAuthModal,
    showAuthModal,
    handleAuthSubmit,
    checkAuthentication,
    hideAuthModal,
} from "./features/auth/auth.js";
import { downloadStepFile } from "./features/tabs/cnc.js";
import {
    viewHandDrawing,
    closeDrawingModal,
    printDrawing,
    refreshDrawing,
} from "./features/parts/drawingViewer.js";
import { showPartInfo } from "./features/modals/infoModals.js";
import { updateScrollbarEdgeEffect } from "./core/utils/helpers.js";
import {
    initEventDelegation,
    registerActions,
} from "./core/dom/eventDelegation.js";

const REFRESH_NOTICE_DELAY_MS = 5 * 60 * 1000;
let refreshNoticeTimerId = null;
let refreshNoticeElement = null;
let refreshNoticeVisible = false;

function applyTooltip(element) {
    const tooltipText = element.getAttribute("title");
    if (!tooltipText || element.dataset.tooltipInitialized === "true") return;
    element.dataset.tooltip = tooltipText;
    element.dataset.tooltipInitialized = "true";
    element.removeAttribute("title");
    element.classList.add("tooltip-target");
}

function triggerNeumorphicAnimations() {
    // Animate all neumorphic elements at once (shadows/highlights only)
    document
        .querySelectorAll(".neumorphic-card, .parts-list-surface, .cnc-card")
        .forEach((card) => card.classList.add("animate-pop-up"));

    document
        .querySelectorAll(".neumorphic-btn")
        .forEach((button) => button.classList.add("animate-pop-up-btn"));

    document
        .querySelectorAll(".neumorphic-input")
        .forEach((input) => input.classList.add("animate-pop-up-input"));
}

/**
 * Apply persisted tab visibility settings to the UI
 */
function applyTabVisibilitySettings() {
    const tabs = ["review", "cnc", "hand", "completed", "leaderboard"];
    const forcedHidden = appState.isMobile ? ["review", "cnc"] : [];

    tabs.forEach((tab) => {
        const btn = document.getElementById(`tab-${tab}`);
        const checkbox = document.getElementById(`check-${tab}`);
        const isVisible =
            appState.tabVisibility[tab] && !forcedHidden.includes(tab);

        if (btn && checkbox) {
            checkbox.checked = isVisible;
            if (isVisible) {
                btn.classList.remove("hidden");
            } else {
                btn.classList.add("hidden");
            }
        }
    });
}

function initializeTooltips(root = document) {
    const titledElements = root.querySelectorAll("[title]");
    titledElements.forEach(applyTooltip);
}

function renderCat() {
    if (document.getElementById("cat")) return;
    const shell = document.createElement("div");
    shell.id = "cat";
    shell.className = "cat";
    const image = document.createElement("img");
    image.src = meowImageUrl;
    image.alt = "Hello from my gf!";
    image.loading = "lazy";
    shell.append(image);
    document.body.append(shell);
}

function buildRefreshNotice() {
    if (refreshNoticeElement) return refreshNoticeElement;
    const wrapper = document.createElement("div");
    wrapper.id = "refresh-notice";
    wrapper.className = "refresh-notice animate-fade-in shadow-3d";

    const header = document.createElement("div");
    header.className = "refresh-notice__header";

    const dismissButton = document.createElement("button");
    dismissButton.type = "button";
    dismissButton.className = "refresh-notice__dismiss";
    dismissButton.setAttribute("aria-label", "Dismiss refresh reminder");
    dismissButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    dismissButton.addEventListener("click", () => {
        wrapper.remove();
        refreshNoticeVisible = false;
    });

    header.append(dismissButton);

    const title = document.createElement("div");
    title.className = "refresh-notice__title";
    title.textContent = "New data may be available";

    const message = document.createElement("p");
    message.className = "refresh-notice__message";
    message.textContent = "Refresh to see the latest parts.";

    const actions = document.createElement("div");
    actions.className = "refresh-notice__actions";

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "refresh-notice__button neumorphic-btn";
    refreshButton.innerHTML =
        '<i class="fa-solid fa-arrows-rotate mr-2"></i><span>Refresh now</span>';
    refreshButton.addEventListener("click", () => {
        window.location.reload();
    });

    actions.append(refreshButton);

    wrapper.append(header, title, message, actions);
    refreshNoticeElement = wrapper;
    return wrapper;
}

function showRefreshNotice() {
    if (refreshNoticeVisible) return;
    const notice = buildRefreshNotice();
    document.body.append(notice);
    refreshNoticeVisible = true;
}

function scheduleRefreshNotice() {
    clearTimeout(refreshNoticeTimerId);
    refreshNoticeTimerId = window.setTimeout(
        showRefreshNotice,
        REFRESH_NOTICE_DELAY_MS
    );
}

const tooltipObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            initializeTooltips(node);
        });
    }
});

// Initialize application
document.addEventListener("DOMContentLoaded", async () => {
    initializeAuthModal();
    hideAuthModal();

    initializeTooltips();
    tooltipObserver.observe(document.body, { childList: true, subtree: true });
    renderCat();

    // Handle action key click-through behavior when faded
    const actionKey = document.getElementById("action-key");
    if (actionKey) {
        actionKey.addEventListener("click", (e) => {
            // If the element is faded (opacity < 0.1), let clicks pass through
            const opacity = Number.parseFloat(
                getComputedStyle(actionKey).opacity
            );
            if (opacity < 0.1) {
                e.stopPropagation();
                // Create a new event at the same position to pass through
                const newEvent = new MouseEvent(e.type, {
                    bubbles: true,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    button: e.button,
                    buttons: e.buttons,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    altKey: e.altKey,
                    metaKey: e.metaKey,
                });
                // Dispatch the event to the element underneath
                document
                    .elementFromPoint(e.clientX, e.clientY)
                    ?.dispatchEvent(newEvent);
                e.preventDefault();
            }
        });
    }

    detectMobileDevice();
    configureMobileUI();

    const isAuthenticated = await checkAuthentication();
    if (isAuthenticated) {
        initializeState();
        applyTabVisibilitySettings();
        configureMobileUI();
        switchTab(appState.currentTab);
        scheduleRefreshNotice();
    }

    // Add scroll and resize listeners for scrollbar effects
    window.addEventListener("scroll", updateAllScrollbarEdgeEffects);
    window.addEventListener("resize", updateAllScrollbarEdgeEffects);

    // Trigger neumorphic pop-up animations after initialization
    setTimeout(() => {
        triggerNeumorphicAnimations();
    }, 100);
});

globalThis.addEventListener("authenticated", () => {
    detectMobileDevice();
    initializeState();
    applyTabVisibilitySettings();
    configureMobileUI();
    switchTab(appState.currentTab);
    scheduleRefreshNotice();
    updateAllScrollbarEdgeEffects();
});

globalThis.addEventListener("resize", () => {
    const wasMobile = appState.isMobile;
    const oldTab = appState.currentTab;
    detectMobileDevice();
    const modeChanged = wasMobile !== appState.isMobile;
    applyTabVisibilitySettings();
    configureMobileUI();

    let tabChanged = false;
    if (
        modeChanged &&
        !appState.isMobile &&
        !["review", "cnc", "hand", "completed", "leaderboard"].includes(
            appState.currentTab
        )
    ) {
        appState.currentTab = "review";
        tabChanged = true;
    }

    // Only switch tabs and load data if authenticated and tab actually changed
    if (appState.isAuthenticated && tabChanged) {
        switchTab(appState.currentTab);
    }

    // Update scrollbar edge effects on resize
    updateAllScrollbarEdgeEffects();
});

const actionExports = {
    openSettingsModal,
    closeSettingsModal,
    toggleTabVisibility,
    toggleDisable3JS,
    handleSearch,
    switchTab,
    openAddModal,
    closeModal,
    handleCategoryChange,
    handleMaterialChange,
    updateFileName,
    handleFormSubmit,
    markCompleted,
    markUncompleted,
    markCompletedIncorrectly,
    approvePart,
    editPart,
    deletePart,
    markInProgress,
    confirmAssignment,
    closeAssignModal,
    unclaimPart,
    closeUnclaimModal,
    confirmUnclaim,
    closeCompleteAmountModal,
    confirmCompleteAmount,
    sortTable,
    viewHandDrawing,
    closeDrawingModal,
    printDrawing,
    refreshDrawing,
    viewPartInfo,
    showPartInfo,
    showAuthModal,
    hideAuthModal,
    handleAuthSubmit,
    downloadStepFile,
};

/**
 * Update scrollbar edge effects for all tab content areas
 */
function updateAllScrollbarEdgeEffects() {
    const tabContents = ["content-review", "content-hand", "content-completed"];

    // Clean up orphaned overlays
    const allOverlays = document.querySelectorAll(".scrollbar-blur-overlay");
    allOverlays.forEach((overlay) => {
        const elementId = overlay.parentElement?.id;
        if (!elementId || !tabContents.includes(elementId)) {
            overlay.remove();
        }
    });

    tabContents.forEach((contentId) => {
        const element = document.getElementById(contentId);
        updateScrollbarEdgeEffect(element);
    });
}

registerActions(actionExports);
initEventDelegation();
