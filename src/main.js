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
import { initializeState } from "./modules/state.js";
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

// Initialize application
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize authentication modal first and ensure it's hidden initially
  initializeAuthModal();
  hideAuthModal(); // Ensure modal is hidden at startup

  // Check if user is authenticated by validating with backend (will show modal if not)
  const isAuthenticated = await checkAuthentication();
  if (isAuthenticated) {
    // User is authenticated, initialize the app
    initializeState();
    switchTab("review");
  }
  // If not authenticated, the modal will be shown and app initialization will happen after authentication
});

// Listen for successful authentication to initialize the app
globalThis.addEventListener("authenticated", () => {
  initializeState();
  switchTab("review");
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
globalThis.sortTable = sortTable;

// Authentication functions
globalThis.showAuthModal = showAuthModal;
globalThis.hideAuthModal = hideAuthModal;
globalThis.handleAuthSubmit = handleAuthSubmit;

// File download function
globalThis.downloadStepFile = downloadStepFile;
