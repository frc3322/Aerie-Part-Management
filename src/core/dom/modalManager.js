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

    // Remove any previous exit animation classes
    modal.classList.remove("animate-fade-out");
    const content = modal.querySelector(".neumorphic-card");
    if (content) content.classList.remove("animate-scale-out");

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    modal.classList.add("animate-fade-in");

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

    modal.classList.add("animate-fade-out");
    const content = modal.querySelector(".neumorphic-card");
    if (content) content.classList.add("animate-scale-out");

    // Wait for animation to finish before hiding
    setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        modal.classList.remove("animate-fade-out");
        if (content) content.classList.remove("animate-scale-out");

        const idx = openStack.lastIndexOf(id);
        if (idx !== -1) {
            openStack.splice(idx, 1);
        }
        if (typeof options.onClose === "function") {
            options.onClose(modal);
        }
    }, 200); // Matches .animate-fade-out duration
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
