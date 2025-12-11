# Part Management System - State Management Overview

## State Architecture

The Part Management System uses a **reactive state management** approach implemented in vanilla JavaScript. The system combines a centralized state object with an observer pattern that automatically triggers UI updates when state changes. This provides the benefits of reactive frameworks without external dependencies.

## Core State Structure

### Application State Object

```javascript
export const appState = {
    currentTab: "review",        // Currently active tab
    searchQuery: "",            // Global search filter
    sortDirection: 1,           // Sort direction (1 = asc, -1 = desc)

    // Authentication state
    apiKey: null,               // Current API key
    isAuthenticated: false,     // Authentication status

    // Loading states
    isLoading: false,           // Global loading indicator
    loadingTab: null,           // Which tab is currently loading

    // Parts data from API
    parts: {
        review: [],             // Parts pending review
        cnc: [],                // Parts for CNC machining
        hand: [],               // Parts for hand fabrication
        completed: []           // Completed parts
    },

    // Statistics from API
    stats: null                 // System statistics
};
```

### Part Data Structure

```javascript
/**
 * @typedef {{
 *   id?: number,             // Unique part identifier
 *   type?: string,           // Part type: "cnc" | "hand"
 *   name?: string,           // Part name
 *   subsystem?: string,      // System subsystem
 *   assigned?: string,       // Assigned team member
 *   status: string,          // Current workflow status
 *   notes?: string,          // Additional notes
 *   file?: string,           // Associated file name
 *   onshapeUrl?: string,     // Onshape URL
 *   claimedDate?: string,    // Date part was claimed (ISO format)
 *   category?: string,       // Workflow category
 *   createdAt?: string,      // Creation timestamp (ISO format)
 *   updatedAt?: string       // Last update timestamp (ISO format)
 * }} Part
 */
```

## Reactive State System

The application uses a reactive state management system (`reactiveState.js`) that provides automatic UI updates when state changes. This system wraps the central state object and provides subscription-based reactivity.

### Core Reactive Functions

#### `initReactiveState(state)` - Initialize reactivity

```javascript
/**
 * Initialize reactive state wrapper
 * @param {Object} state - State object to make reactive
 * @returns {Object} Reactive state reference
 */
export function initReactiveState(state) {
    // Sets up reactive state infrastructure
}
```

#### `setState(path, value)` - Reactive state updates

```javascript
/**
 * Update state reactively at specified path
 * @param {string} path - Dot-notation path (e.g., "currentTab", "parts.review")
 * @param {*} value - New value or updater function
 */
export function setState(path, value) {
    // Updates state and notifies subscribers
}
```

**Update Patterns**:
```javascript
// Direct value assignment
setState("currentTab", "review");

// Nested object updates
setState("parts.review", []);

// Functional updates
setState("searchQuery", (prev) => prev + " filter");

// Deep property updates
setState("parts.hand.0.status", "In Progress");
```

#### `subscribe(path, callback)` - State change subscriptions

```javascript
/**
 * Subscribe to state changes at specific path
 * @param {string} path - Path to watch ("*" for all changes)
 * @param {Function} callback - Callback function (value, fullState)
 * @returns {Function} Unsubscribe function
 */
export function subscribe(path, callback) {
    // Registers reactive callback
}
```

**Subscription Examples**:
```javascript
// Subscribe to tab changes
subscribe("currentTab", (tab) => switchTab(tab));

// Subscribe to parts updates
subscribe("parts.review", (parts) => renderReview(parts));

// Subscribe to all state changes
subscribe("*", (change, state) => {
    console.log("State changed:", change.path, change.value);
});
```

### Reactive Integration Pattern

**Module Integration**:
```javascript
// In tabs.js - reactive tab switching
subscribe("currentTab", (tab) => {
    // Update UI when currentTab changes
    switchTab(tab);
});

// In review.js - reactive part list updates
subscribe("parts.review", (parts) => {
    // Re-render when review parts change
    renderReview();
});

// In state.js - reactive search filtering
subscribe("searchQuery", (query) => {
    // Apply search filter when query changes
    applySearchFilter(query);
});
```

### Benefits of Reactive State

- **Automatic UI Updates**: Components automatically reflect state changes
- **Performance**: Targeted re-renders instead of full page updates
- **Clean Architecture**: Clear separation between state logic and UI updates
- **Developer Experience**: No manual DOM synchronization required
- **Memory Efficient**: Granular subscriptions prevent unnecessary updates

## State Management Patterns

### 1. Direct State Access

**Reading State**:
```javascript
import { appState } from "./modules/state.js";

// Direct access to state properties
const currentTab = appState.currentTab;
const reviewParts = appState.parts.review;
```

**Benefits**:
- Simple and direct
- No abstraction overhead
- Immediate access to current state

### 2. State Update Functions

**Dedicated Setters**:
```javascript
export function setCurrentTab(tab) {
    appState.currentTab = tab;
}

export function setSearchQuery(query) {
    appState.searchQuery = query;
}
```

**Benefits**:
- Centralized update logic
- Validation opportunities
- Consistent state mutations

### 3. State Query Functions

**Computed State**:
```javascript
export function getPartsByCategory(category) {
    return appState.parts[category] || [];
}

export function getCurrentTab() {
    return appState.currentTab;
}
```

**Benefits**:
- Encapsulated state logic
- Easy testing
- Abstraction of state structure

## State Initialization

### API Data Loading

```javascript
export function initializeState() {
    // Initialize with sample data for demonstration
    appState.parts.review = [
        {
            type: "cnc",
            name: "Drive Gear",
            status: "Pending",
            notes: "Check tooth profile",
            file: "gear.stl",
            onshapeUrl: "#",
        },
        // ... more parts
    ];

    // Add claimed date demo
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    appState.parts.hand[0].claimedDate = threeDaysAgo;
}
```

### Initialization Flow

1. **Application Start**: `main.js` calls `initializeState()`
2. **Mock Data**: Sample parts loaded for each category
3. **Default Tab**: Starts with "review" tab active
4. **UI Render**: Initial render based on loaded state

## State Mutation Operations

### Adding Parts

```javascript
export function addPartToCategory(category, part) {
    if (appState.parts[category]) {
        appState.parts[category].push(part);
    }
}
```

### Removing Parts

```javascript
export function removePartFromCategory(category, index) {
    if (appState.parts[category]?.[index]) {
        appState.parts[category].splice(index, 1);
    }
}
```

### Updating Parts

Parts are updated through direct manipulation of the array elements:
```javascript
// Update part status
appState.parts.hand[index].status = "In Progress";

// Update assignment
appState.parts.hand[index].assigned = "John Doe";
```

## State Synchronization

### UI State Binding

**Immediate Updates**: State changes trigger immediate UI re-renders

**Tab Switching**:
```javascript
export function setCurrentTab(tab) {
    appState.currentTab = tab;
    // UI update happens in tabs.js switchTab()
}
```

**Search Filtering**:
```javascript
export function setSearchQuery(query) {
    appState.searchQuery = query;
    // UI re-render triggered in tabs.js handleSearch()
}
```

### Event-Driven Updates

**User Actions → State Changes → UI Updates**:

1. **User clicks tab** → `switchTab()` → State update → `renderReview()`/etc.
2. **User searches** → `handleSearch()` → State update → Re-render current tab
3. **User adds part** → `handleFormSubmit()` → `addPartToCategory()` → Re-render
4. **User edits part** → Modal updates → Direct state mutation → Re-render

## State Persistence

### Current Implementation

**In-Memory Only**: State persists only during session

**No Persistence Layer**: Data lost on page refresh

### Future Persistence Options

**Local Storage**:
```javascript
// Potential localStorage integration
export function saveState() {
    localStorage.setItem('partManagerState', JSON.stringify(appState));
}

export function loadState() {
    const saved = localStorage.getItem('partManagerState');
    if (saved) {
        Object.assign(appState, JSON.parse(saved));
    }
}
```

**Backend API**:
```javascript
// Potential API integration
export async function syncWithBackend() {
    const response = await fetch('/api/parts', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    appState.parts = await response.json();
}
```

## State Validation

### Type Safety

**JSDoc Type Definitions**: Provide compile-time-like type checking

**Runtime Validation**: Currently minimal, could be enhanced:

```javascript
function validatePart(part) {
    if (!part.status) throw new Error('Part must have status');
    if (part.type && !['cnc', 'hand'].includes(part.type)) {
        throw new Error('Invalid part type');
    }
    return true;
}
```

### Data Integrity

**Consistent IDs**: Parts should have unique identifiers

**Status Transitions**: Valid state transitions (Pending → Reviewed → In Progress → Completed)

**Required Fields**: Ensure critical data is present

## Performance Considerations

### State Access Patterns

**Direct Access**: Fast reads, immediate updates

**Large Datasets**: Current implementation handles moderate data sizes

**Memory Usage**: In-memory storage suitable for client-side application

### Optimization Strategies

**Selective Updates**: Only re-render affected components

**Efficient Queries**: Fast array operations for filtering/sorting

**Debounced Updates**: Prevent excessive re-renders during rapid state changes

## Testing State Management

### Unit Testing

**Pure Functions**:
```javascript
// Test state query functions
describe('getPartsByCategory', () => {
    it('returns parts for valid category', () => {
        expect(getPartsByCategory('review')).toEqual([]);
    });
});
```

**State Mutations**:
```javascript
// Test state update functions
describe('addPartToCategory', () => {
    it('adds part to specified category', () => {
        const part = { name: 'Test Part', status: 'Pending' };
        addPartToCategory('review', part);
        expect(appState.parts.review).toContain(part);
    });
});
```

### Integration Testing

**State-UI Consistency**: Verify UI reflects state changes

**Workflow Testing**: Test complete user journeys

**Data Persistence**: Test state survives UI interactions

## Future State Enhancements

### Advanced State Management

**Immutable Updates**:
```javascript
export function updatePart(category, index, updates) {
    appState.parts[category][index] = {
        ...appState.parts[category][index],
        ...updates
    };
}
```

**State History**:
```javascript
const stateHistory = [];
export function commitState() {
    stateHistory.push(JSON.parse(JSON.stringify(appState)));
}
```

**Undo/Redo**:
```javascript
export function undo() {
    if (stateHistory.length > 0) {
        Object.assign(appState, stateHistory.pop());
        renderCurrentTab();
    }
}
```

### Reactive State

**Observer Pattern**:
```javascript
class StateObserver {
    constructor() {
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(appState));
    }
}
```

**Automatic Re-rendering**: Components automatically update when state changes

### Distributed State

**Real-time Synchronization**: WebSocket-based state sync across clients

**Conflict Resolution**: Handle concurrent state modifications

**Offline Support**: Service worker state caching
