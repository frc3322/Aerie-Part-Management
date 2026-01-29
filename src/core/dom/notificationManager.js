/**
 * Notification System
 *
 * Provides beautiful, neumorphic-styled notifications for the application.
 * Automatically integrated with API error handling.
 *
 * Usage Examples:
 * ```javascript
 * import { showErrorNotification, showSuccessNotification, showWarningNotification, showInfoNotification } from './core/dom/notificationManager.js';
 *
 * // Show different types of notifications
 * showErrorNotification("Error Title", "Something went wrong!");
 * showSuccessNotification("Success", "Operation completed successfully!");
 * showWarningNotification("Warning", "Please check your input.");
 * showInfoNotification("Info", "Here's some information.");
 *
 * // Customize duration and dismissibility
 * showErrorNotification("Custom Error", "This stays longer", { duration: 10000, dismissible: false });
 * ```
 */

const notifications = new Map();
let notificationIdCounter = 0;
let container = null;

function createContainer() {
    if (container) return container;

    container = document.createElement("div");
    container.id = "notification-container";
    container.className = "fixed top-4 right-4 z-50 space-y-2 max-w-sm";
    document.body.appendChild(container);

    return container;
}

function getIcon(type) {
    const icons = {
        error: "❌",
        success: "✅",
        warning: "⚠️",
        info: "ℹ️",
    };
    return icons[type] || icons.info;
}

function getColorClasses(type) {
    const colors = {
        error: {
            bg: "linear-gradient(145deg, #4a1c23, #2d1217)",
            border: "rgba(252, 129, 129, 0.3)",
            shadow: "8px 8px 16px #1a0f11, -8px -8px 16px #5a2a31",
            text: "#fc8181",
        },
        success: {
            bg: "linear-gradient(145deg, #1f3a2a, #13261a)",
            border: "rgba(104, 211, 145, 0.3)",
            shadow: "8px 8px 16px #0f1a13, -8px -8px 16px #2f4a3a",
            text: "#68d391",
        },
        warning: {
            bg: "linear-gradient(145deg, #4a3a1c, #2d2612)",
            border: "rgba(246, 224, 94, 0.3)",
            shadow: "8px 8px 16px #1a160f, -8px -8px 16px #5a4a31",
            text: "#f6e05e",
        },
        info: {
            bg: "linear-gradient(145deg, #1c3a4a, #12262d)",
            border: "rgba(99, 179, 237, 0.3)",
            shadow: "8px 8px 16px #0f1a1d, -8px -8px 16px #2f4a5a",
            text: "#63b3ed",
        },
    };
    return colors[type] || colors.info;
}

function createNotificationElement(id, type, title, message, options = {}) {
    const { duration = 5000, dismissible = true } = options;
    const colors = getColorClasses(type);
    const icon = getIcon(type);

    const element = document.createElement("div");
    element.id = `notification-${id}`;
    element.className = "notification animate-fade-in";
    element.style.cssText = `
        background: ${colors.bg};
        border: 1px solid ${colors.border};
        box-shadow: ${colors.shadow};
        border-radius: 13px;
        padding: 12px 16px;
        color: #e2e8f0;
        backdrop-filter: blur(8px);
        position: relative;
        overflow: hidden;
        min-width: 280px;
        max-width: 400px;
    `;

    element.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0 text-lg" style="color: ${
                colors.text
            };">${icon}</div>
            <div class="flex-1 min-w-0">
                ${
                    title
                        ? `<div class="font-semibold text-sm mb-1" style="color: #e2e8f0;">${title}</div>`
                        : ""
                }
                <div class="text-sm leading-relaxed" style="color: #cbd5e0;">${message}</div>
            </div>
            ${
                dismissible
                    ? `
                <button class="dismiss-btn flex-shrink-0 ml-2 p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity" style="color: #cbd5e0;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `
                    : ""
            }
        </div>
        ${
            duration > 0
                ? `<div class="progress-bar" style="position: absolute; bottom: 0; left: 0; height: 2px; background: ${colors.text}; border-radius: 0 0 12px 12px;"></div>`
                : ""
        }
    `;

    // Add dismiss functionality
    if (dismissible) {
        const dismissBtn = element.querySelector(".dismiss-btn");
        dismissBtn.addEventListener("click", () => {
            try {
                dismissNotification(id);
            } catch (error) {
                console.error("Error dismissing notification:", error);
            }
        });
    }

    // Add progress bar animation if duration is set
    if (duration > 0) {
        const progressBar = element.querySelector(".progress-bar");
        progressBar.style.width = "100%";
        progressBar.style.transition = `width ${duration}ms linear`;
        setTimeout(() => {
            progressBar.style.width = "0%";
        }, 10);
    }

    return element;
}

function dismissNotification(id) {
    try {
        const notification = notifications.get(id);
        if (!notification) return;

        const element = notification.element;
        element.style.animation = "slideOut 0.3s ease-out forwards";

        setTimeout(() => {
            try {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                notifications.delete(id);
            } catch (error) {
                console.error("Error removing notification element:", error);
                notifications.delete(id);
            }
        }, 300);
    } catch (error) {
        console.error("Error in dismissNotification:", error);
    }
}

function showNotification(type, title, message, options = {}) {
    const id = ++notificationIdCounter;
    const container = createContainer();
    const element = createNotificationElement(
        id,
        type,
        title,
        message,
        options
    );

    notifications.set(id, { element, type, options });

    // Add to container
    container.appendChild(element);

    // Auto dismiss if duration is set
    const { duration = 5000 } = options;
    if (duration > 0) {
        setTimeout(() => {
            if (notifications.has(id)) {
                dismissNotification(id);
            }
        }, duration);
    }

    return id;
}

export function showErrorNotification(title, message, options = {}) {
    return showNotification("error", title, message, {
        duration: 7000,
        ...options,
    });
}

export function showSuccessNotification(title, message, options = {}) {
    return showNotification("success", title, message, {
        duration: 5000,
        ...options,
    });
}

export function showWarningNotification(title, message, options = {}) {
    return showNotification("warning", title, message, {
        duration: 6000,
        ...options,
    });
}

export function showInfoNotification(title, message, options = {}) {
    return showNotification("info", title, message, {
        duration: 5000,
        ...options,
    });
}

export function dismissAllNotifications() {
    notifications.forEach((_, id) => dismissNotification(id));
}

// Cleanup function for when the app unloads
window.addEventListener("beforeunload", dismissAllNotifications);
