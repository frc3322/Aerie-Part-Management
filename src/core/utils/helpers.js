// Utility Functions
// Common helper functions used throughout the application

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Escape attribute values for use in HTML
 * @param {string} str - Attribute value to escape
 * @returns {string} Escaped attribute value
 */
export function escapeAttr(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Validate if a string is a valid URL
 * @param {string} urlString - URL string to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidUrl(urlString) {
    if (!urlString) return false;
    try {
        const url = new URL(urlString);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Filter parts based on search query
 * @param {Array} list - The list of parts to filter
 * @param {string} searchQuery - The search query
 * @returns {Array} Filtered list of parts
 */
export function filterParts(list, searchQuery) {
    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter((part) => {
        return (
            part.name?.toLowerCase().includes(lowerQuery) ||
            String(part.id)?.toLowerCase().includes(lowerQuery) ||
            part.notes?.toLowerCase().includes(lowerQuery) ||
            part.subsystem?.toLowerCase().includes(lowerQuery) ||
            part.assigned?.toLowerCase().includes(lowerQuery) ||
            part.status?.toLowerCase().includes(lowerQuery) ||
            part.material?.toLowerCase().includes(lowerQuery)
        );
    });
}

/**
 * Get CSS class for status styling
 * @param {string} status - The status value
 * @returns {string} CSS class name for the status
 */
export function getStatusClass(status) {
    switch (status) {
        case "Pending":
            return "status-pending";
        case "Reviewed":
            return "status-reviewed";
        case "In Progress":
            return "status-inprogress";
        case "Completed":
            return "status-completed";
        case "Already Started":
            return "status-already-started";
        default:
            return "text-gray-400";
    }
}

/**
 * Sort array of objects by a specific key
 * @param {Array} array - The array to sort
 * @param {string} key - The key to sort by
 * @param {number} direction - Sort direction (1 for ascending, -1 for descending)
 * @returns {Array} Sorted array
 */
export function sortArrayByKey(array, key, direction = 1) {
    return array.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        // Handle serviceMethod from miscInfo
        if (key === "serviceMethod") {
            valA = a.miscInfo?.serviceMethod || a.misc_info?.serviceMethod;
            valB = b.miscInfo?.serviceMethod || b.misc_info?.serviceMethod;
        }
        
        // Handle amount as numeric
        if (key === "amount") {
            valA = Number(valA);
            valB = Number(valB);
            valA = Number.isFinite(valA) ? valA : 0;
            valB = Number.isFinite(valB) ? valB : 0;
        }
        
        // Default to empty string if undefined
        if (valA === undefined || valA === null) valA = "";
        if (valB === undefined || valB === null) valB = "";
        
        // Numeric comparison for numbers
        if (typeof valA === "number" && typeof valB === "number") {
            return (valA - valB) * direction;
        }
        
        // String comparison for everything else
        const normalizedA = valA.toString().toLowerCase();
        const normalizedB = valB.toString().toLowerCase();
        if (normalizedA < normalizedB) return -1 * direction;
        if (normalizedA > normalizedB) return 1 * direction;
        return 0;
    });
}

/**
 * Generate a unique ID for parts
 * @param {string} prefix - The prefix for the ID
 * @param {number} number - The number to append
 * @returns {string} Generated ID
 */
export function generatePartId(prefix, number) {
    return `${prefix}-${number.toString().padStart(3, "0")}`;
}

/**
 * Format date for display
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
}

/**
 * Calculate days between two dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Number of days between dates
 */
export function daysBetween(date1, date2) {
    const diffTime = Math.abs(new Date(date2) - new Date(date1));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check if a string is empty or null
 * @param {string} str - String to check
 * @returns {boolean} True if empty, false otherwise
 */
export function isEmpty(str) {
    return !str || str.trim().length === 0;
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Get lowercase file extension from a filename
 * @param {string} filename - Filename to parse
 * @returns {string} File extension without dot
 */
export function getFileExtension(filename) {
    if (!filename || !filename.includes(".")) return "";
    return filename.split(".").pop().toLowerCase();
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export function getInitials(name) {
    if (!name) return "?";
    return name
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Check if an element has a horizontal scrollbar and update scrollbar edge effect.
 * @param {HTMLElement} element - The element to check for scrollbar
 */
export function updateScrollbarEdgeEffect(element) {
    if (!element) return;

    // Skip scrollbar edge effect for leaderboard
    if (element.id === "content-leaderboard") {
        return;
    }

    element.classList.add("scrollbar-edge");

    let overlay = element._scrollbarEdgeOverlay;
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "scrollbar-edge-overlay";
        document.body.appendChild(overlay);
        element._scrollbarEdgeOverlay = overlay;
    }

    // Function to update overlay state and position
    const update = () => {
        if (!element || !overlay) return;

        const hasScrollbar = element.scrollWidth > element.clientWidth;
        element.classList.toggle("scrollbar-visible", hasScrollbar);

        if (!hasScrollbar) {
            overlay.classList.remove("is-visible");
            overlay.style.display = "none";
            overlay.style.height = "0";
            return;
        }

        // Set display first, then position, then show with opacity
        overlay.style.display = "block";

        const rect = element.getBoundingClientRect();
        const overlayWidth = 90; // Matches CSS width

        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.right - overlayWidth}px`;
        overlay.style.height = `${rect.height}px`;

        // Force reflow to ensure positioning is applied before opacity transition
        void overlay.offsetHeight;

        const isScrolledToEnd =
            Math.ceil(element.scrollLeft + element.clientWidth) >=
            element.scrollWidth - 2;

        if (!isScrolledToEnd) {
            overlay.classList.add("is-visible");
        } else {
            overlay.classList.remove("is-visible");
        }
    };

    // Attach listeners once
    if (!element._scrollbarEdgeBound) {
        element._scrollbarEdgeBound = true;
        element.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });
    }

    // Run immediately (both sync and async to ensure it appears on init)
    update();
    requestAnimationFrame(() => {
        update();
        // Double-check after a brief delay to catch late-rendering content
        setTimeout(() => update(), 100);
    });
}
