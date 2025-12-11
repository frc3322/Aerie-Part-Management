const openStack = [];
let keyListenerAttached = false;

function getModal(id) {
    if (!id) return null;
    return document.getElementById(id);
}

function focusFirst(modal, selector) {
    if (!modal) return;
    const target =
        (selector && modal.querySelector(selector)) ||
        modal.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
    if (target) target.focus();
}

function toggleControls(modal, disabled) {
    if (!modal) return;
    const elements = modal.querySelectorAll("button, input, select, textarea");
    elements.forEach((el) => {
        if (el.dataset.modalPersist === "true") return;
        el.disabled = disabled;
    });
}

function handleEscape(event) {
    if (event.key !== "Escape") return;
    const lastModalId = openStack[openStack.length - 1];
    if (!lastModalId) return;
    closeModal(lastModalId);
}

function ensureKeyListener() {
    if (keyListenerAttached) return;
    document.addEventListener("keydown", handleEscape);
    keyListenerAttached = true;
}

export function openModal(id, options = {}) {
    const modal = getModal(id);
    if (!modal) {
        console.warn(`Modal "${id}" not found`);
        return;
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    openStack.push(id);
    ensureKeyListener();
    if (typeof options.onOpen === "function") {
        options.onOpen(modal);
    }
    focusFirst(modal, options.focusSelector);
}

export function closeModal(id, options = {}) {
    const modal = getModal(id);
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    const idx = openStack.lastIndexOf(id);
    if (idx !== -1) {
        openStack.splice(idx, 1);
    }
    if (typeof options.onClose === "function") {
        options.onClose(modal);
    }
}

export function setModalLoading(id, isLoading) {
    const modal = getModal(id);
    if (!modal) return;
    toggleControls(modal, Boolean(isLoading));
    if (isLoading) {
        modal.dataset.loading = "true";
    } else {
        delete modal.dataset.loading;
    }
}
