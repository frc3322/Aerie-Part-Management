// Utility Functions
// Common helper functions used throughout the application

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
    let valA = a[key] || "";
    let valB = b[key] || "";
    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();
    if (valA < valB) return -1 * direction;
    if (valA > valB) return 1 * direction;
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
