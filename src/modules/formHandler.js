// Form Handler Module
// Handles form submission, data extraction, and part creation

import { appState, updatePartInState, addPartToState } from "./state.js";
import { renderReview } from "./review.js";
import { renderCNC } from "./cnc.js";
import { renderHandFab } from "./handFab.js";
import { renderCompleted } from "./completed.js";
import { closeModal } from "./modals.js";
import { switchTab } from "./tabs.js";
import {
  createPart as apiCreatePart,
  updatePart as apiUpdatePart,
  uploadPartFile,
  getPart,
} from "../utils/partsApi.js";

/**
 * Extract form data from the part form
 * @returns {Object} Form data object
 */
export function extractFormData() {
  return {
    isEdit: document.getElementById("edit-mode").value === "true",
    index: Number.parseInt(document.getElementById("edit-index").value),
    originTab: document.getElementById("edit-origin-tab").value,
    type: document.getElementById("input-category").value,
    name: document.getElementById("input-name").value,
    material: document.getElementById("input-material").value,
    amount: Number.parseInt(document.getElementById("input-amount").value, 10),
    subsystem: document.getElementById("input-subsystem").value,
    assigned: document.getElementById("input-assigned").value,
    status: document.getElementById("input-status").value,
    notes: document.getElementById("input-notes").value,
    onshapeUrl: document.getElementById("input-onshape").value,
    fileInput: document.getElementById("input-file"),
  };
}

/**
 * Prepare data for API submission
 * @param {Object} formData - The form data
 * @returns {Object} Data formatted for API
 */
function prepareApiData(formData) {
  const apiData = {
    type: formData.type,
    material: formData.material,
    subsystem: formData.subsystem,
    amount:
      Number.isFinite(formData.amount) && formData.amount > 0
        ? formData.amount
        : 1,
    status: formData.status,
    notes: formData.notes,
    onshapeUrl: formData.onshapeUrl,
  };

  // Handle category - for new parts, default to review
  if (!formData.isEdit) {
    apiData.category = "review";
  }

  // Handle type-specific fields
  if (formData.type === "cnc") {
    apiData.name = formData.name;
    // Handle file if uploaded
    if (formData.fileInput.files.length > 0) {
      apiData.file = formData.fileInput.files[0].name;
    }
  } else {
    // For hand fabrication parts, name field is used as ID
    apiData.name = formData.name;
    apiData.assigned = formData.assigned;
  }

  return apiData;
}

/**
 * Handle file upload for a part
 * @param {number} partId - The part ID
 * @param {File} file - The file to upload
 * @returns {Object|null} Updated part data or null if upload failed
 */
async function handleFileUpload(partId, file) {
  try {
    await uploadPartFile(partId, file);
    const updatedPart = await getPart(partId);
    updatePartInState(partId, updatedPart);
    return updatedPart;
  } catch (error) {
    console.error("Failed to upload file:", error);
    alert("Part saved but file upload failed. Please try uploading again.");
    return null;
  }
}

/**
 * Handle editing an existing part
 * @param {Object} formData - The form data
 * @param {Object} apiData - The prepared API data
 */
async function handleEditPart(formData, apiData) {
  const existingPart = appState.parts[formData.originTab][formData.index];
  const result = await apiUpdatePart(existingPart.id, apiData);
  updatePartInState(existingPart.id, result);

  if (formData.type === "cnc" && formData.fileInput.files.length > 0) {
    await handleFileUpload(existingPart.id, formData.fileInput.files[0]);
  }
}

/**
 * Handle creating a new part
 * @param {Object} formData - The form data
 * @param {Object} apiData - The prepared API data
 */
async function handleCreatePart(formData, apiData) {
  const result = await apiCreatePart(apiData);
  addPartToState(result);

  if (formData.type === "cnc" && formData.fileInput.files.length > 0) {
    await handleFileUpload(result.id, formData.fileInput.files[0]);
  }

  // Switch to review tab for new parts
  switchTab("review");
}

/**
 * Perform post-submit actions like re-rendering tabs
 */
function performPostSubmitActions() {
  renderReview();
  renderCNC();
  renderHandFab();
  renderCompleted();
  closeModal();
}

/**
 * Handle form submission
 * @param {Event} e - The form submission event
 */
export async function handleFormSubmit(e) {
  e.preventDefault();

  const submitButton =
    e.target.querySelector('button[type="submit"]') ||
    e.target.querySelector(".submit-btn");
  if (submitButton) submitButton.disabled = true;

  try {
    const formData = extractFormData();
    const trimmedMaterial = formData.material.trim();
    const trimmedSubsystem = formData.subsystem.trim();
    if (trimmedMaterial.length === 0) {
      alert("Material is required.");
      return;
    }
    if (trimmedSubsystem.length === 0) {
      alert("Subsystem is required.");
      return;
    }
    if (!Number.isFinite(formData.amount) || formData.amount <= 0) {
      alert("Amount must be at least 1.");
      return;
    }
    formData.material = trimmedMaterial;
    formData.subsystem = trimmedSubsystem;
    const apiData = prepareApiData(formData);

    if (formData.isEdit) {
      await handleEditPart(formData, apiData);
    } else {
      await handleCreatePart(formData, apiData);
    }

    performPostSubmitActions();
  } catch (error) {
    console.error("Failed to save part:", error);
    alert("Failed to save part. Please try again.");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}
