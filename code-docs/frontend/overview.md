# Part Management System - Source Code Overview

## Overview

This document provides a comprehensive overview of the `src/` directory structure and organization for the Part Management System. This is a web-based application built with modern JavaScript, designed to manage engineering parts through their lifecycle from design review to completion.

## Directory Structure

```
src/
├── main.js                 # Application entry point and initialization
├── style.css              # Global styles and Tailwind configuration
├── components/            # Reusable UI components
│   └── threeDViewer.js    # 3D model visualization component (future)
├── html/                  # HTML templates for UI sections
│   ├── header.html        # Application header
│   ├── tabs.html          # Navigation tabs
│   ├── *-content.html     # Content templates for each tab
│   └── *-modal.html       # Modal dialog templates
├── modules/               # Core application logic (modular architecture)
│   ├── auth.js            # Authentication management
│   ├── state.js           # Central state management
│   ├── tabs.js            # Tab navigation and switching
│   ├── partActions.js     # Part manipulation operations
│   ├── formHandler.js     # Form submission handling
│   ├── modals.js          # Modal management
│   ├── review.js          # Review tab logic
│   ├── cnc.js             # CNC machining tab logic (includes STEP download)
│   ├── handFab.js         # Hand fabrication tab logic
│   └── completed.js       # Completed parts tab logic
├── utils/                 # Utility functions
│   └── partsApi.js        # API communication utilities
└── components/            # Specialized components
    └── threeDViewer.js    # 3D model visualization (future implementation)
```

## Architecture Overview

The application follows a **modular architecture** with clear separation of concerns:

- **Entry Point**: `main.js` initializes the application and sets up global event handlers
- **State Management**: Centralized in `state.js` with typed data structures
- **UI Components**: HTML templates in `html/` rendered dynamically by modules
- **Business Logic**: Organized by feature in `modules/` directory
- **Utilities**: Shared helper functions in `utils/` directory
- **Components**: Specialized UI components like 3D viewers

## Key Features

- **Authentication System**: API key-based authentication with modal login
- **Multi-tab Interface**: Review, CNC, Hand Fabrication, and Completed parts
- **Part Lifecycle Management**: From design review through completion
- **File Management**: STEP file upload and download capabilities
- **Search and Filtering**: Global search across all parts
- **3D Visualization**: Planned Three.js components for model viewing
- **Responsive Design**: Modern neumorphic UI with Tailwind CSS
- **Modal Management**: Dynamic forms and confirmation dialogs

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+ modules)
- **Styling**: Tailwind CSS with custom neumorphic design system
- **API Communication**: Fetch API with custom utilities
- **Authentication**: Modal-based API key management
- **File Handling**: Browser File API for uploads and downloads
- **3D Graphics**: Three.js (planned for future implementation)
- **Icons**: Font Awesome
- **Build Tool**: Vite

## Development Notes

- Uses ES6 modules for clean imports/exports
- Follows Google-style docstrings for documentation
- Implements TypeScript-style JSDoc type annotations
- Modular design enables easy testing and maintenance
- Authentication system integrated throughout the application
- API communication abstracted into reusable utilities
- No external state management libraries (vanilla JS approach)

## Related Documentation

- [Architecture Details](architecture.md) - Deep dive into system architecture
- [Modules Overview](modules.md) - Detailed breakdown of each module
- [UI Components](ui-components.md) - HTML templates and interface components
- [State Management](state-management.md) - How application state is handled
- [Utilities](utilities.md) - Helper functions and utilities

## Getting Started

The application initializes through `main.js`, which:
1. Sets up Tailwind configuration
2. Imports all necessary modules
3. Initializes application state with mock data
4. Sets up global event handlers for UI interactions

See individual module documentation for implementation details.

## Adding New Functionality

This section provides a step-by-step guide for adding new features to the Part Management System using the modernized architecture.

### Architecture Overview for New Features

The application uses a **modular, reactive architecture** with the following components:

- **Reactive State Management**: Changes to `appState` automatically trigger UI updates
- **Event Delegation**: Actions are dispatched via `data-action` attributes instead of onclick handlers
- **Utility Modules**: Shared functionality for common operations (DOM manipulation, API calls, modals)
- **Template Helpers**: Programmatic DOM creation for maintainable UI components

### Step-by-Step Guide to Add New Features

#### 1. Plan the Feature

**Define Requirements**:
- What user interaction triggers the feature?
- What state changes are needed?
- What UI updates are required?
- Are new API endpoints needed?

**Example**: Adding a "duplicate part" feature
- User clicks "Duplicate" button on part card
- Creates new part with copied data (but new ID)
- Updates state and refreshes current tab

#### 2. Update State Structure (if needed)

**Add new state properties** in `state.js`:
```javascript
// If adding new state properties
export const appState = {
    // ... existing properties
    isDuplicating: false,  // Loading state for duplication
    duplicateCount: 0      // Track duplication operations
};
```

**Use reactive state updates**:
```javascript
import { setState } from '../utils/reactiveState.js';

// Update state reactively
setState('isDuplicating', true);
setState('duplicateCount', (prev) => prev + 1);
```

#### 3. Create/Update Action Handlers

**Add action functions** in appropriate modules:
```javascript
// In partActions.js
export async function duplicatePart(partIndex) {
    const currentTab = getCurrentTab();
    const originalPart = appState.parts[currentTab][partIndex];

    // Create duplicate with new data
    const duplicateData = {
        ...originalPart,
        name: `${originalPart.name} (Copy)`,
        id: undefined,  // Let backend assign new ID
        status: 'Pending'
    };

    await withErrorHandling(
        async () => {
            const newPart = await createPart(duplicateData);
            setState(`parts.${currentTab}`, (parts) => [...parts, newPart]);
        },
        {
            loadingTargets: [duplicateButton],
            onSuccess: () => showToast('Part duplicated successfully'),
            onError: (error) => showToast(`Duplication failed: ${error.message}`)
        }
    );
}
```

**Register actions** in `main.js`:
```javascript
// Add to actionExports object
const actionExports = {
    // ... existing actions
    duplicatePart: partActions.duplicatePart
};

// Register with event delegation
registerActions(actionExports);
```

#### 4. Update HTML Templates

**Replace onclick with data-action**:
```html
<!-- OLD (don't use) -->
<button onclick="duplicatePart(5)">Duplicate</button>

<!-- NEW -->
<button data-action="duplicatePart" data-index="5">Duplicate</button>
```

**Add to existing templates** or create new ones:
```html
<!-- In review-content.html or similar -->
<div class="part-actions">
    <button data-action="editPart" data-index="{{index}}" class="edit-btn">
        <i class="fa fa-edit"></i> Edit
    </button>
    <button data-action="duplicatePart" data-index="{{index}}" class="duplicate-btn">
        <i class="fa fa-copy"></i> Duplicate
    </button>
</div>
```

#### 5. Update Rendering Logic

**Use reactive subscriptions** for automatic updates:
```javascript
// In tabs.js or feature modules
import { subscribe } from '../utils/reactiveState.js';

// Subscribe to state changes that affect your feature
subscribe('parts.review', (parts) => renderReview(parts));
subscribe('isDuplicating', (isDuplicating) => {
    // Update UI based on duplication state
    toggleDuplicationSpinner(isDuplicating);
});
```

**Use template helpers** for DOM creation:
```javascript
import { createElement, renderList } from '../utils/templateHelpers.js';

// Create UI elements programmatically
function createDuplicateButton(index) {
    return createElement('button', {
        className: 'neumorphic-btn duplicate-btn',
        dataset: { action: 'duplicatePart', index },
        children: [
            createElement('i', { className: 'fa fa-copy' }),
            createElement('span', { text: ' Duplicate' })
        ]
    });
}

// Render lists efficiently
renderList(container, parts, createPartCard);
```

#### 6. Use Modal Manager (if needed)

**For confirmation dialogs or forms**:
```javascript
import { openModal, closeModal } from '../utils/modalManager.js';

// Open confirmation modal
openModal('duplicate-confirm-modal', {
    onOpen: (modal) => {
        // Initialize modal content
        modal.querySelector('.part-name').textContent = part.name;
    }
});

// Handle confirmation
export function confirmDuplicate() {
    closeModal('duplicate-confirm-modal');
    // Proceed with duplication
}
```

#### 7. Add API Integration (if needed)

**Use existing API utilities** or extend them:
```javascript
// In partsApi.js - add new API function
export async function duplicatePart(partId, modifications = {}) {
    return makeRequest(`/parts/${partId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify(modifications)
    });
}
```

#### 8. Update Documentation

**Add to modules-reference.md**:
```markdown
### duplicatePart (partActions.js)
**Purpose**: Create a copy of an existing part

**Parameters**:
- `partIndex` (number): Index of part to duplicate in current tab

**Behavior**: Creates new part with copied data, updates state reactively
```

### Feature Development Patterns

#### Adding a New Tab

1. **Update state structure** to include new tab data
2. **Create tab rendering module** (e.g., `newFeature.js`)
3. **Add tab to HTML** with `data-action="switchTab" data-tab="newFeature"`
4. **Register render function** in `tabs.js`
5. **Add reactive subscriptions** for automatic updates

#### Adding Modal-Based Features

1. **Create modal HTML template** in `src/html/`
2. **Use modalManager** for open/close operations
3. **Add form handlers** with `data-action` attributes
4. **Implement validation** and error handling
5. **Add loading states** with `setModalLoading()`

#### Adding Search/Filter Features

1. **Add search state** to reactive state
2. **Create filter functions** in `utils/helpers.js`
3. **Subscribe to search changes** for automatic filtering
4. **Debounce search input** to prevent excessive updates
5. **Update URL/query params** for bookmarkable searches

### Best Practices

#### Code Organization
- Keep modules focused on single responsibilities
- Use utility modules for shared functionality
- Follow existing naming conventions

#### State Management
- Use `setState()` for all state mutations
- Subscribe to minimal state changes needed
- Keep state structure flat and normalized

#### Event Handling
- Always use `data-action` instead of onclick
- Pass data through `data-*` attributes
- Handle events at appropriate DOM levels

#### Error Handling
- Wrap API calls with `withErrorHandling()`
- Provide user-friendly error messages
- Handle loading states consistently

#### Performance
- Use `renderList()` for efficient list updates
- Subscribe to specific state paths when possible
- Debounce user input to prevent excessive operations

### Example: Complete Feature Implementation

Here's how the duplicate part feature would be fully implemented:

**1. State Setup**:
```javascript
// Add to state.js
export const appState = {
    // ... existing
    duplicateOperations: []
};
```

**2. Action Handler**:
```javascript
// Add to partActions.js
export async function duplicatePart(index) {
    const tab = getCurrentTab();
    const part = appState.parts[tab][index];

    await withErrorHandling(
        async () => {
            const newPart = await duplicatePartAPI(part.id);
            setState(`parts.${tab}`, parts => [...parts, newPart]);
            setState('duplicateOperations', ops => [...ops, {
                originalId: part.id,
                newId: newPart.id,
                timestamp: new Date()
            }]);
        },
        {
            loadingTargets: [event.target],
            onSuccess: () => showToast('Part duplicated'),
            fallbackMessage: 'Failed to duplicate part'
        }
    );
}
```

**3. UI Integration**:
```html
<!-- In part card template -->
<button data-action="duplicatePart" data-index="{{index}}" title="Duplicate Part">
    <i class="fa fa-copy"></i>
</button>
```

**4. Reactive Updates**:
```javascript
// In rendering module
subscribe('parts.review', renderReview);
subscribe('duplicateOperations', updateDuplicateHistory);
```

This architecture ensures maintainable, scalable, and consistent feature development across the application.
