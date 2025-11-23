# Part Management System - State Management Overview

## State Architecture

The Part Management System uses a **centralized, in-memory state management** approach implemented in vanilla JavaScript. The `state.js` module serves as the single source of truth for all application data.

## Core State Structure

### Application State Object

```javascript
export const appState = {
    currentTab: "review",        // Currently active tab
    searchQuery: "",            // Global search filter
    sortDirection: 1,           // Sort direction (1 = asc, -1 = desc)
    parts: {
        review: [],             // Parts pending review
        cnc: [],                // Parts for CNC machining
        hand: [],               // Parts for hand fabrication
        completed: []           // Completed parts
    }
};
```

### Part Data Structure

```javascript
/**
 * @typedef {{
 *   type?: string,           // Part type: "cnc" | "hand"
 *   name?: string,           // Part name
 *   id?: string,             // Unique part identifier
 *   subsystem?: string,      // System subsystem
 *   assigned?: string,       // Assigned team member
 *   status: string,          // Current status
 *   notes?: string,          // Additional notes
 *   file?: string,           // Associated file name
 *   onshapeUrl?: string,     // Onshape URL
 *   claimedDate?: Date       // Date part was claimed
 * }} Part
 */
```

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

### Mock Data Setup

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
