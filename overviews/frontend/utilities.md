# Part Management System - Utilities Overview

## Utility Functions Architecture

The `src/utils/` directory contains shared helper functions used throughout the application. These utilities follow functional programming principles and provide common operations for data manipulation, formatting, and user interface enhancements.

## Core Utilities (helpers.js)

### 1. Data Filtering

**filterParts(list, searchQuery)** - Filters parts based on search criteria

```javascript
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
            part.id?.toLowerCase().includes(lowerQuery) ||
            part.notes?.toLowerCase().includes(lowerQuery) ||
            part.subsystem?.toLowerCase().includes(lowerQuery) ||
            part.assigned?.toLowerCase().includes(lowerQuery) ||
            part.status?.toLowerCase().includes(lowerQuery)
        );
    });
}
```

**Search Fields**: Searches across name, ID, notes, subsystem, assigned user, and status

**Case Insensitive**: Converts both query and data to lowercase for matching

### 2. Status Styling

**getStatusClass(status)** - Returns CSS class for status visualization

```javascript
/**
 * Get CSS class for status styling
 * @param {string} status - The status value
 * @returns {string} CSS class name for the status
 */
export function getStatusClass(status) {
    switch (status) {
        case "Pending": return "status-pending";
        case "Reviewed": return "status-reviewed";
        case "In Progress": return "status-inprogress";
        case "Completed": return "status-completed";
        case "Already Started": return "status-already-started";
        default: return "text-gray-400";
    }
}
```

**Status Mapping**:
- `Pending` → Yellow/amber styling
- `Reviewed` → Blue styling
- `In Progress` → Green styling
- `Completed` → Gray styling
- `Already Started` → Special styling

### 3. Data Sorting

**sortArrayByKey(array, key, direction)** - Generic array sorting function

```javascript
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
```

**Features**:
- Handles null/undefined values safely
- Case-insensitive string sorting
- Configurable sort direction
- Returns new sorted array (non-destructive)

### 4. ID Generation

**generatePartId(prefix, number)** - Creates standardized part IDs

```javascript
/**
 * Generate a unique ID for parts
 * @param {string} prefix - The prefix for the ID
 * @param {number} number - The number to append
 * @returns {string} Generated ID
 */
export function generatePartId(prefix, number) {
    return `${prefix}-${number.toString().padStart(3, "0")}`;
}
```

**Format**: `{PREFIX}-{NUMBER}` (e.g., "CNC-001", "HF-042")

**Padding**: Zero-padded to 3 digits for consistent formatting

### 5. Date Formatting

**formatDate(date)** - Formats dates for display

```javascript
/**
 * Format date for display
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
}
```

**Safety**: Handles null/undefined dates gracefully

**Localization**: Uses browser's locale for date formatting

### 6. Date Calculations

**daysBetween(date1, date2)** - Calculates days between dates

```javascript
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
```

**Absolute Value**: Always returns positive number

**Ceiling**: Rounds up to next whole day

### 7. Function Debouncing

**debounce(func, wait)** - Limits function call frequency

```javascript
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
```

**Use Cases**: Search input, window resize, scroll events

**Cleanup**: Clears previous timeout on each call

### 8. String Utilities

**isEmpty(str)** - Checks for empty/null strings

```javascript
/**
 * Check if a string is empty or null
 * @param {string} str - String to check
 * @returns {boolean} True if empty, false otherwise
 */
export function isEmpty(str) {
    return !str || str.trim().length === 0;
}
```

**Trimming**: Removes whitespace before checking length

**Null Safety**: Handles null/undefined inputs

**capitalize(str)** - Capitalizes first letter

```javascript
/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
```

**Safety**: Handles empty strings gracefully

### 9. Text Processing

**getInitials(name)** - Extracts initials from names

```javascript
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
```

**Multi-word Support**: Handles first and last names

**Fallback**: Returns "?" for missing names

**Length Limit**: Maximum 2 characters

## Utility Usage Patterns

### In Modules

**Import Pattern**:
```javascript
import {
    filterParts,
    getStatusClass,
    sortArrayByKey
} from "../utils/helpers.js";
```

**Common Usage**:
```javascript
// Filter parts for display
const filteredParts = filterParts(appState.parts.review, appState.searchQuery);

// Get styling for status display
const statusClass = getStatusClass(part.status);

// Sort hand fabrication parts
const sortedParts = sortArrayByKey(appState.parts.hand, "assigned", appState.sortDirection);
```

### In Components

**Dynamic Styling**:
```javascript
// Apply status-based CSS classes
const statusClass = getStatusClass(part.status);
element.className = `part-card ${statusClass}`;
```

**Data Formatting**:
```javascript
// Format dates for display
const formattedDate = formatDate(part.claimedDate);
dateElement.textContent = formattedDate;
```

## Performance Considerations

### Efficient Operations

**Array Methods**: Uses native JavaScript array methods for optimal performance

**String Operations**: Efficient string manipulation with built-in methods

**Memory Management**: Functions don't create unnecessary object allocations

### Optimization Opportunities

**Memoization**: Could add memoization for expensive computations

**Web Workers**: Heavy computations could be moved to background threads

**Lazy Evaluation**: Defer computations until needed

## Testing Utilities

### Unit Test Examples

**Filter Function**:
```javascript
describe('filterParts', () => {
    it('filters by name', () => {
        const parts = [{ name: 'Gear', status: 'Pending' }];
        expect(filterParts(parts, 'gear')).toHaveLength(1);
    });

    it('returns all when no query', () => {
        const parts = [{ name: 'Gear' }];
        expect(filterParts(parts, '')).toEqual(parts);
    });
});
```

**Status Class**:
```javascript
describe('getStatusClass', () => {
    it('returns correct class for status', () => {
        expect(getStatusClass('Pending')).toBe('status-pending');
        expect(getStatusClass('Completed')).toBe('status-completed');
    });
});
```

**Date Functions**:
```javascript
describe('daysBetween', () => {
    it('calculates days correctly', () => {
        const date1 = new Date('2023-01-01');
        const date2 = new Date('2023-01-03');
        expect(daysBetween(date1, date2)).toBe(2);
    });
});
```

## Future Utility Enhancements

### Additional Utilities

**Validation Functions**:
```javascript
export function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function validatePartId(id) {
    const regex = /^[A-Z]+-\d{3}$/;
    return regex.test(id);
}
```

**Formatting Functions**:
```javascript
export function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}
```

**Data Transformation**:
```javascript
export function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

export function flattenObject(obj, prefix = '') {
    let flattened = {};
    for (let key in obj) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            Object.assign(flattened, flattenObject(obj[key], newKey));
        } else {
            flattened[newKey] = obj[key];
        }
    }
    return flattened;
}
```

### Integration with External Libraries

**Potential Enhancements**:
- **date-fns** for advanced date operations
- **lodash** for additional utility functions
- **validator.js** for comprehensive validation
- ** numeral.js** for number formatting

### Performance Monitoring

**Usage Tracking**:
```javascript
export function timeFunction(func, ...args) {
    const start = performance.now();
    const result = func(...args);
    const end = performance.now();
    console.log(`${func.name} took ${end - start} milliseconds`);
    return result;
}
```

This completes the comprehensive overview of the Part Management System's source code structure and organization.
