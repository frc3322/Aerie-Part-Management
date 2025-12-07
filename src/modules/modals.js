// Modal Management Module
// Handles all modal dialogs and UI interactions

/**
 * Open the settings modal
 */
export function openSettingsModal() {
  const modal = document.getElementById("settings-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

/**
 * Close the settings modal
 */
export function closeSettingsModal() {
  const modal = document.getElementById("settings-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/**
 * Toggle tab visibility in settings
 * @param {string} tab - The tab to toggle
 */
export function toggleTabVisibility(tab) {
  const checkbox = document.getElementById(`check-${tab}`);
  const btn = document.getElementById(`tab-${tab}`);
  const isVisible = checkbox.checked;

  if (isVisible) {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
    // If we just hid the active tab, switch to another
    const currentTab = getCurrentTab();
    if (currentTab === tab) {
      const tabs = ["review", "cnc", "hand", "completed"];
      const nextVisible = tabs.find(
        (t) => document.getElementById(`check-${t}`).checked
      );
      if (nextVisible) switchTab(nextVisible);
    }
  }
}

/**
 * Get the current active tab
 * @returns {string} The current tab name
 */
function getCurrentTab() {
  const activeTab = document.querySelector(".active-tab");
  return activeTab ? activeTab.id.replace("tab-", "") : "review";
}

/**
 * Switch to a different tab
 * @param {string} tab - The tab to switch to
 */
function switchTab(tab) {
  if (typeof globalThis.switchTab === "function") {
    globalThis.switchTab(tab);
  }
}

/**
 * Open the add/edit part modal
 * @param {boolean} isNew - Whether this is a new part (true) or editing existing (false)
 */
export function openAddModal(isNew = false) {
  const modal = document.getElementById("modal");
  const form = document.getElementById("part-form");

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  if (isNew) {
    document.getElementById("modal-title").innerText = "Add Part for Review";
    form.reset();
    document.getElementById("edit-mode").value = "false";
    document.getElementById("edit-index").value = "";
    document.getElementById("edit-origin-tab").value = "review";
    document.getElementById("input-status").value = "Pending";
    document
      .getElementById("input-status")
      .parentElement.classList.add("hidden");
    document.getElementById("input-category").disabled = false;
    document.getElementById("input-category").value = "cnc";
    document.getElementById("file-name-display").innerText = "No file chosen";
    document.getElementById("input-onshape").value = "";
    document.getElementById("input-amount").value = "1";
    handleCategoryChange("cnc");
  }

  setTimeout(() => document.getElementById("input-name").focus(), 100);
}

/**
 * Close the add/edit part modal
 */
export function closeModal() {
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("modal").classList.remove("flex");
}

/**
 * Handle category change in the form
 * @param {string} type - The category type ('cnc' or 'hand')
 */
export function handleCategoryChange(type) {
  const subField = document.getElementById("field-subsystem");
  const assignField = document.getElementById("field-assigned");
  const fileField = document.getElementById("field-file");
  const fileLabel = document.getElementById("label-file");
  const nameLabel = document.getElementById("label-name");
  const isEdit = document.getElementById("edit-mode").value === "true";
  const originTab = document.getElementById("edit-origin-tab").value;

  if (type === "cnc") {
    subField.classList.add("hidden");
    assignField.classList.add("hidden");
    fileField.classList.remove("hidden");
    fileLabel.innerText = "3D Model (STEP)";
    nameLabel.innerText = "Part Name";
    const fileInput = document.getElementById("input-file");
    if (fileInput) {
      fileInput.setAttribute("accept", ".step,.stp");
    }
  } else {
    subField.classList.remove("hidden");
    fileField.classList.add("hidden");
    if (isEdit && originTab !== "review" && originTab !== "completed") {
      assignField.classList.remove("hidden");
    } else {
      assignField.classList.add("hidden");
      document.getElementById("input-assigned").value = "";
    }
    nameLabel.innerText = "Part ID";
  }
}

/**
 * Update the file name display
 */
export function updateFileName() {
  const input = document.getElementById("input-file");
  const display = document.getElementById("file-name-display");
  if (input.files.length > 0) display.innerText = input.files[0].name;
}
