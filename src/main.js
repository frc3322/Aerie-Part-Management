import "./style.css";

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
import { initializeState, appState } from "./modules/state.js";
import { switchTab, handleSearch, sortTable } from "./modules/tabs.js";
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

  tabs.forEach((tab) => {
    const btn = document.getElementById(`tab-${tab}`);
    const checkbox = document.getElementById(`check-${tab}`);
    const isVisible = appState.tabVisibility[tab];

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
  // Initialize authentication modal first and ensure it's hidden initially
  initializeAuthModal();
  hideAuthModal(); // Ensure modal is hidden at startup

  initializeTooltips();
  tooltipObserver.observe(document.body, { childList: true, subtree: true });

  // Check if user is authenticated by validating with backend (will show modal if not)
  const isAuthenticated = await checkAuthentication();
  if (isAuthenticated) {
    // User is authenticated, initialize the app
    initializeState();
    applyTabVisibilitySettings();
    switchTab(appState.currentTab); // Use the persisted current tab
  }
  // If not authenticated, the modal will be shown and app initialization will happen after authentication
});

// Listen for successful authentication to initialize the app
globalThis.addEventListener("authenticated", () => {
  initializeState();
  applyTabVisibilitySettings();
  switchTab(appState.currentTab); // Use the persisted current tab instead of hardcoded "review"
});

// Export global functions for HTML onclick handlers
globalThis.openSettingsModal = openSettingsModal;
globalThis.closeSettingsModal = closeSettingsModal;
globalThis.toggleTabVisibility = toggleTabVisibility;
globalThis.handleSearch = handleSearch;
globalThis.switchTab = switchTab;
globalThis.openAddModal = openAddModal;
globalThis.closeModal = closeModal;
globalThis.handleCategoryChange = handleCategoryChange;
globalThis.updateFileName = updateFileName;
globalThis.handleFormSubmit = handleFormSubmit;
globalThis.markCompleted = markCompleted;
globalThis.markUncompleted = markUncompleted;
globalThis.approvePart = approvePart;
globalThis.editPart = editPart;
globalThis.deletePart = deletePart;
globalThis.markInProgress = markInProgress;
globalThis.confirmAssignment = confirmAssignment;
globalThis.closeAssignModal = closeAssignModal;
globalThis.unclaimPart = unclaimPart;
globalThis.closeUnclaimModal = closeUnclaimModal;
globalThis.confirmUnclaim = confirmUnclaim;
globalThis.closeCompleteAmountModal = closeCompleteAmountModal;
globalThis.confirmCompleteAmount = confirmCompleteAmount;
globalThis.sortTable = sortTable;
globalThis.viewHandDrawing = viewHandDrawing;
globalThis.closeDrawingModal = closeDrawingModal;
globalThis.printDrawing = printDrawing;
globalThis.refreshDrawing = refreshDrawing;
globalThis.viewPartInfo = viewPartInfo;
globalThis.showPartInfo = showPartInfo;

// Authentication functions
globalThis.showAuthModal = showAuthModal;
globalThis.hideAuthModal = hideAuthModal;
globalThis.handleAuthSubmit = handleAuthSubmit;

// File download function
globalThis.downloadStepFile = downloadStepFile;
