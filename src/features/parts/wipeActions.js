import { openModal, closeModal, setModalLoading } from "../../core/dom/modalManager.js";
import { wipeAllParts } from "../../core/api/partsApi.js";
import { initializeState } from "../state/state.js";
import { switchTab } from "../navigation/tabs.js";
import { showErrorNotification, showInfoNotification } from "../../core/dom/notificationManager.js";
import { hideActionIconKey, showActionIconKey } from "../auth/auth.js";
import { closeSettingsModal } from "../modals/modals.js";

let wipeStep = 1;

/**
 * Start the multi-step wipe process
 */
export function startWipeProcess() {
    closeSettingsModal();
    wipeStep = 1;
    updateWipeModalUI();
    
    openModal("wipe-modal", {
        onOpen: hideActionIconKey
    });
    
    // Set up the next button listener
    const nextBtn = document.getElementById("wipe-modal-next");
    if (nextBtn) {
        // Remove old listener if any
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener("click", handleWipeNext);
    }

    // Set up input listener for step 3
    const input = document.getElementById("wipe-modal-confirm-input");
    const passwordInput = document.getElementById("wipe-modal-password-input");
    
    const updateNextBtnState = () => {
        if (wipeStep === 3) {
            const nextBtn = document.getElementById("wipe-modal-next");
            if (nextBtn) {
                const textOk = input.value === "DELETE";
                const passwordOk = passwordInput.value.trim().length > 0;
                nextBtn.disabled = !(textOk && passwordOk);
            }
        }
    };

    if (input) {
        input.value = "";
        input.addEventListener("input", updateNextBtnState);
    }

    if (passwordInput) {
        passwordInput.value = "";
        passwordInput.addEventListener("input", updateNextBtnState);
        
        // Handle Enter key on password input
        passwordInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter" && wipeStep === 3) {
                const nextBtn = document.getElementById("wipe-modal-next");
                if (nextBtn && !nextBtn.disabled) {
                    handleWipeNext();
                }
            }
        });
    }

    if (input) {
        // Handle Enter key on text input
        input.addEventListener("keyup", (e) => {
            if (e.key === "Enter" && wipeStep === 3) {
                const nextBtn = document.getElementById("wipe-modal-next");
                if (nextBtn && !nextBtn.disabled) {
                    handleWipeNext();
                }
            }
        });
    }
}

/**
 * Close the wipe modal
 */
export function closeWipeModal() {
    closeModal("wipe-modal", {
        onClose: showActionIconKey
    });
}

/**
 * Handle the "Next" / "Continue" button click in the wipe modal
 */
async function handleWipeNext() {
    if (wipeStep === 1) {
        wipeStep = 2;
        updateWipeModalUI();
    } else if (wipeStep === 2) {
        wipeStep = 3;
        updateWipeModalUI();
        const input = document.getElementById("wipe-modal-confirm-input");
        if (input) {
            input.focus();
        }
    } else if (wipeStep === 3) {
        const input = document.getElementById("wipe-modal-confirm-input");
        const passwordInput = document.getElementById("wipe-modal-password-input");
        if (input?.value === "DELETE" && passwordInput?.value) {
            await executeWipe(passwordInput.value);
        }
    }
}

/**
 * Update the modal UI based on the current step
 */
function updateWipeModalUI() {
    const title = document.getElementById("wipe-modal-title");
    const desc = document.getElementById("wipe-modal-description");
    const inputContainer = document.getElementById("wipe-modal-input-container");
    const nextBtn = document.getElementById("wipe-modal-next");
    const iconContainer = document.getElementById("wipe-modal-icon-container");
    
    if (wipeStep === 1) {
        title.innerText = "Wipe All Data?";
        desc.innerText = "This action will permanently delete all parts and files. This cannot be undone.";
        inputContainer.classList.add("hidden");
        nextBtn.innerText = "Continue";
        nextBtn.disabled = false;
        iconContainer.className = "w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 shadow-3d-inset";
    } else if (wipeStep === 2) {
        title.innerText = "Are you REALLY sure?";
        desc.innerText = "Every single part across ALL tabs will be removed. You will lose all tracking data.";
        inputContainer.classList.add("hidden");
        nextBtn.innerText = "I am sure";
        nextBtn.disabled = false;
        iconContainer.className = "w-20 h-20 bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 shadow-3d-inset animate-pulse";
    } else if (wipeStep === 3) {
        title.innerText = "Final Confirmation";
        desc.innerText = 'Type "DELETE" and enter the system password below to wipe everything.';
        inputContainer.classList.remove("hidden");
        nextBtn.innerText = "WIPE EVERYTHING";
        nextBtn.disabled = true;
        iconContainer.className = "w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 shadow-3d-inset";
    }
}

/**
 * Execute the actual wipe API call
 */
async function executeWipe(password) {
    setModalLoading("wipe-modal", true);
    
    try {
        await wipeAllParts(password);
        
        showInfoNotification("System Reset", "All parts and files have been successfully wiped.");
        
        // Re-initialize state to clear everything locally
        await initializeState();
        
        // Switch to review tab (or whatever default)
        switchTab("review");
        
        closeWipeModal();
    } catch (error) {
        console.error("Wipe failed:", error);
        showErrorNotification("Wipe Failed", error.message || "An error occurred while wiping data.");
    } finally {
        setModalLoading("wipe-modal", false);
    }
}
