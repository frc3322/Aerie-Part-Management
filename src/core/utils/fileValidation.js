/**
 * File Validation Utilities
 * Validates file types and sizes before upload
 */

// Allowed file extensions (must match backend configuration)
const ALLOWED_EXTENSIONS = ["step", "stp", "pdf"];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Get file extension from filename
 * @param {string} filename - The filename to extract extension from
 * @returns {string} The file extension in lowercase
 */
function getFileExtension(filename) {
    if (!filename || typeof filename !== "string") {
        return "";
    }
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Check if file extension is allowed
 * @param {string} filename - The filename to validate
 * @returns {boolean} True if extension is allowed
 */
export function isFileExtensionAllowed(filename) {
    const extension = getFileExtension(filename);
    return ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Check if file size is within limits
 * @param {number} fileSize - File size in bytes
 * @returns {boolean} True if file size is acceptable
 */
export function isFileSizeAllowed(fileSize) {
    return fileSize > 0 && fileSize <= MAX_FILE_SIZE;
}

/**
 * Validate a file for upload
 * @param {File} file - The file to validate
 * @returns {Object} Validation result with success flag and error message
 */
export function validateFile(file) {
    if (!file) {
        return {
            valid: false,
            error: "No file provided",
        };
    }

    // Check file extension
    if (!isFileExtensionAllowed(file.name)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(
                ", "
            )}`,
        };
    }

    // Check file size
    if (!isFileSizeAllowed(file.size)) {
        const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
        return {
            valid: false,
            error: `File too large. Maximum size: ${maxSizeMB}MB`,
        };
    }

    return {
        valid: true,
        error: null,
    };
}

/**
 * Get human-readable file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get allowed extensions list
 * @returns {string[]} Array of allowed extensions
 */
export function getAllowedExtensions() {
    return [...ALLOWED_EXTENSIONS];
}
