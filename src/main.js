import "./style.css";
import meowImageUrl from "./Meow.png";

// Tailwind config (moved from script tag)
globalThis.tailwind = {
    config: {
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
} from "./modules/state.js";
import {
    switchTab,
    handleSearch,
    sortTable,
    configureMobileUI,
} from "./modules/tabs.js";
import {
    openSettingsModal,
    closeSettingsModal,
    toggleTabVisibility,
    openAddModal,
    closeModal,
    handleCategoryChange,
    updateFileName,
} from "./modules/modals.js";
import {
    markCompleted,
    markUncompleted,
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
} from "./modules/partActions.js";
import { handleFormSubmit } from "./modules/formHandler.js";
import {
    initializeAuthModal,
    showAuthModal,
    handleAuthSubmit,
    checkAuthentication,
    hideAuthModal,
} from "./modules/auth.js";
import { downloadStepFile } from "./modules/cnc.js";
import {
    viewHandDrawing,
    closeDrawingModal,
    printDrawing,
    refreshDrawing,
} from "./modules/drawingViewer.js";
import { showPartInfo } from "./modules/infoModals.js";

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

/**
 * Apply persisted tab visibility settings to the UI
 */
function applyTabVisibilitySettings() {
    const tabs = ["review", "cnc", "hand", "completed"];
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

/**
 * Attach a map of UI actions to the global scope for legacy handlers.
 * @param {Record<string, Function>} actionMap
 */
function registerGlobalActions(actionMap) {
    globalThis.appActions = actionMap;
    Object.entries(actionMap).forEach(([key, value]) => {
        globalThis[key] = value;
    });
}

// Initialize application
document.addEventListener("DOMContentLoaded", async () => {
    initializeAuthModal();
    hideAuthModal();

    initializeTooltips();
    tooltipObserver.observe(document.body, { childList: true, subtree: true });
    renderCat();

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
});

globalThis.addEventListener("authenticated", () => {
    detectMobileDevice();
    initializeState();
    applyTabVisibilitySettings();
    configureMobileUI();
    switchTab(appState.currentTab);
    scheduleRefreshNotice();
});

globalThis.addEventListener("resize", () => {
    const wasMobile = appState.isMobile;
    detectMobileDevice();
    const modeChanged = wasMobile !== appState.isMobile;
    applyTabVisibilitySettings();
    configureMobileUI();
    if (
        modeChanged &&
        !appState.isMobile &&
        !["review", "cnc", "hand", "completed"].includes(appState.currentTab)
    ) {
        appState.currentTab = "review";
    }
    switchTab(appState.currentTab);
});

const actionExports = {
    openSettingsModal,
    closeSettingsModal,
    toggleTabVisibility,
    handleSearch,
    switchTab,
    openAddModal,
    closeModal,
    handleCategoryChange,
    updateFileName,
    handleFormSubmit,
    markCompleted,
    markUncompleted,
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

registerGlobalActions(actionExports);
