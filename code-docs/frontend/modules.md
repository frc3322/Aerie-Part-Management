# Aerie Part Management - Modules Overview

## Module Organization

The `src/modules/` directory contains the core business logic, organized by feature and responsibility. Each module follows consistent patterns for imports, exports, and documentation. The architecture has been modernized with utility modules providing shared functionality and reactive state management for automatic UI updates.

## Core Modules

### 1. auth.js - Authentication Management

**Purpose**: Handle API authentication, modal management, and API key persistence

**Key Functions**:
- `initializeAuthModal()` - Sets up the authentication modal UI
- `showAuthModal()` - Displays the authentication modal to user
- `hideAuthModal()` - Hides the authentication modal
- `handleAuthSubmit()` - Processes authentication form submission
- `checkAuthentication()` - Validates current API key with backend
- `setApiKey(key)` - Stores API key in application state and local storage

**Authentication Flow**:
```javascript
// On app startup
checkAuthentication() // Returns promise<boolean>
  .then(isAuthenticated => {
    if (isAuthenticated) {
      initializeState(); // Load app data
    } else {
      showAuthModal(); // Show login form
    }
  });
```

**State Integration**:
- Stores API key in `appState.apiKey`
- Tracks authentication status in `appState.isAuthenticated`
- Persists API key in localStorage for session continuity

---

### 2. state.js - State Management

**Purpose**: Central state management and data persistence

**Key Functions**:
- `initializeState()` - Sets up initial application state with mock data
- `setCurrentTab(tab)` - Updates active tab
- `setSearchQuery(query)` - Updates search filter
- `getPartsByCategory(category)` - Retrieves parts by workflow stage
- `addPartToCategory(category, part)` - Adds new parts to state
- `removePartFromCategory(category, index)` - Removes parts from state

**Data Structure**:
```javascript
// Part object structure
{
  type?: "cnc" | "hand",
  name?: string,
  id?: string,
  subsystem?: string,
  assigned?: string,
  status: string,
  notes?: string,
  file?: string,
  onshapeUrl?: string,
  claimedDate?: Date
}
```

**State Object**:
```javascript
{
  currentTab: "review",
  searchQuery: "",
  sortDirection: 1,
  // Authentication state
  apiKey: null,
  isAuthenticated: false,
  // Loading states
  isLoading: false,
  loadingTab: null,
  // Parts data from API
  parts: {
    review: Part[],
    cnc: Part[],
    hand: Part[],
    completed: Part[]
  },
  // Statistics
  stats: null
}
```

### 2. tabs.js - Navigation Management

**Purpose**: Handles tab switching and navigation logic

**Key Functions**:
- `switchTab(tab)` - Changes active tab and updates UI
- `handleSearch(query)` - Processes search input and re-renders
- `getCurrentTab()` - Returns currently active tab
- `sortTable(key)` - Sorts hand fabrication table by column

**Dependencies**: Imports render functions from feature-specific modules

**UI Updates**: Manages tab button states and content visibility

### 3. partActions.js - Part Operations

**Purpose**: CRUD operations and part lifecycle management

**Key Functions**:
- `markCompleted(index)` - Moves part to completed status
- `markUncompleted(index)` - Reverts part status
- `approvePart(index)` - Approves part for production
- `editPart(index)` - Opens edit modal for part
- `deletePart(index)` - Removes part from system
- `markInProgress(index)` - Updates part status to in progress
- `confirmAssignment(index)` - Assigns part to user
- `unclaimPart(index)` - Removes user assignment
- `closeAssignModal()` / `closeUnclaimModal()` - Modal management

**Workflow Integration**: Handles transitions between different part states

### 4. formHandler.js - Form Processing

**Purpose**: Handles form submissions and data validation

**Key Functions**:
- `handleFormSubmit(event)` - Processes add/edit part forms
- Form validation and data sanitization
- Integration with state management for new part creation

**Form Types**: Add part forms and edit part forms

### 5. modals.js - Modal Management

**Purpose**: Controls modal dialogs and overlays

**Key Functions**:
- `openSettingsModal()` - Opens application settings
- `closeSettingsModal()` - Closes settings modal
- `toggleTabVisibility(tab)` - Shows/hides tabs in settings
- `openAddModal(forReview)` - Opens add part modal
- `closeModal()` - Generic modal closing
- `handleCategoryChange()` - Updates form based on category selection
- `updateFileName()` - Updates file input display

**Modal Types**: Settings, Add Part, Assign Part, Unclaim Part

## Utility Modules

### Utility Module Architecture

The `src/utils/` directory contains specialized utility modules that provide shared functionality across the application. These modules implement common patterns and reduce code duplication.

### Animation & Visual Effects

#### triggerNeumorphicAnimations() - Shadow Emergence System

**Purpose**: Triggers smooth shadow emergence animations for neumorphic UI elements after page load

**Location**: `main.js` (inline function)

**Integration Pattern**:
```javascript
// Automatically called after page initialization
// Triggers shadow animations for all neumorphic elements simultaneously
triggerNeumorphicAnimations();
```

**Animation Details**:
- Applies `animate-pop-up` class to `.neumorphic-card` elements (1s duration)
- Applies `animate-pop-up-btn` class to `.neumorphic-btn` elements (1.8s duration)
- Applies `animate-pop-up-input` class to `.neumorphic-input` elements (1.8s duration)
- Uses `will-change: box-shadow` for performance optimization
- Animates shadows from 0px to full neumorphic depth

**Benefits**: Creates polished visual entrance effect, prevents FOUC, enhances neumorphic design system

#### eventDelegation.js - Event Handling System

**Purpose**: Centralized event delegation system that replaces scattered onclick handlers

**Integration Pattern**:
```javascript
import { registerActions, initEventDelegation } from '../utils/eventDelegation.js';

// Register action handlers
const actions = {
    approvePart: (index) => approveAndMovePart(index),
    switchTab: (tab) => switchTab(tab),
    handleSearch: (query) => setState('searchQuery', query)
};

registerActions(actions);
initEventDelegation();
```

**Benefits**: Reduces DOM queries, cleaner HTML, consistent event handling

#### reactiveState.js - Reactive State Management

**Purpose**: Observer pattern for automatic UI updates on state changes

**Integration Pattern**:
```javascript
import { subscribe, setState } from '../utils/reactiveState.js';

// Reactive UI updates
subscribe('currentTab', (tab) => renderTabContent(tab));
subscribe('parts.review', (parts) => renderReviewList(parts));

// State updates trigger automatic re-renders
setState('currentTab', 'cnc');
```

**Benefits**: Automatic UI synchronization, granular updates, clean separation of concerns

#### templateHelpers.js - DOM Creation Utilities

**Purpose**: Programmatic DOM element creation and manipulation

**Integration Pattern**:
```javascript
import { createElement, renderList } from '../utils/templateHelpers.js';

// Create elements programmatically
const button = createElement('button', {
    className: 'neumorphic-btn',
    dataset: { action: 'approvePart', index: 5 },
    children: [createElement('i', { className: 'fa fa-check' })]
});

// Efficient list rendering
renderList(container, parts, (part, index) => createPartCard(part, index));
```

**Benefits**: Type-safe DOM creation, no innerHTML, maintainable templates

#### modalManager.js - Modal Dialog Management

**Purpose**: Centralized modal management with accessibility support

**Integration Pattern**:
```javascript
import { openModal, closeModal, setModalLoading } from '../utils/modalManager.js';

// Open modal with options
openModal('settings-modal', {
    onOpen: (modal) => initializeSettings(modal),
    focusSelector: '.settings-input'
});

// Loading states
setModalLoading('processing-modal', true);
await processData();
setModalLoading('processing-modal', false);
closeModal('processing-modal');
```

**Benefits**: Consistent UX, accessibility compliance, centralized modal logic

#### apiErrorHandler.js - Error Handling Wrapper

**Purpose**: Standardized error handling for API operations

**Integration Pattern**:
```javascript
import { withErrorHandling } from '../utils/apiErrorHandler.js';

// Wrap API calls with error handling
await withErrorHandling(
    async () => await deletePart(partId),
    {
        loadingTargets: [deleteButton],
        onError: (error) => showErrorMessage(error.message),
        onSuccess: () => refreshUI()
    }
);
```

**Benefits**: DRY error handling, consistent loading states, user-friendly errors

## Feature-Specific Modules

### 6. review.js - Review Tab Logic

**Purpose**: Manages the design review workflow

**Key Functions**:
- `renderReview()` - Renders review tab content
- Displays parts pending design review
- Handles review-specific actions and approvals

**Content**: Parts in "Pending" or "Reviewed" status

### 7. cnc.js - CNC Machining Tab Logic

**Purpose**: Manages CNC machining workflow and file operations

**Key Functions**:
- `renderCNC()` - Renders CNC tab with grid layout
- `downloadStepFile(partId)` - Downloads STEP files from backend
- Displays parts requiring CNC machining
- Special grid layout for CNC-specific information
- File download integration for CAD files

**Content**: Parts designated for CNC processing with STEP file access

**File Operations**:
- STEP file downloads triggered from part actions
- Browser-native download handling
- Error handling for missing files

### 8. handFab.js - Hand Fabrication Tab Logic

**Purpose**: Manages manual fabrication workflow

**Key Functions**:
- `renderHandFab()` - Renders hand fabrication table
- `createTableRow(part)` - Creates individual table rows
- Handles sorting and filtering for hand fab parts

**Content**: Parts requiring manual fabrication with detailed assignment tracking

### 9. completed.js - Completed Parts Tab Logic

**Purpose**: Displays completed parts archive

**Key Functions**:
- `renderCompleted()` - Renders completed parts list
- Shows final status of finished parts

**Content**: Parts with "Completed" status

## Module Dependencies Map

```
main.js
├── utils/
│   ├── eventDelegation.js (event handling system)
│   ├── reactiveState.js (reactive state management)
│   ├── modalManager.js (modal system)
│   ├── apiErrorHandler.js (error handling)
│   └── templateHelpers.js (DOM utilities)
├── state.js (core state + reactive wrapper)
├── tabs.js (navigation + reactive subscriptions)
│   ├── review.js → reactiveState, templateHelpers
│   ├── cnc.js → reactiveState, templateHelpers
│   ├── handFab.js → reactiveState, templateHelpers, helpers.js
│   └── completed.js → reactiveState, templateHelpers
├── partActions.js → reactiveState, modalManager, apiErrorHandler
├── modals.js → reactiveState, modalManager, templateHelpers, helpers.js
└── formHandler.js → reactiveState, modalManager, templateHelpers, helpers.js
```

## Common Patterns

### Function Signatures
All modules follow consistent patterns:
- JSDoc documentation with type annotations
- Descriptive parameter names
- Clear return types
- Error handling where appropriate

### State Access
- Direct read access to `appState` object
- Write access through dedicated functions
- Import state object at module top level

### DOM Manipulation
- Query selectors for element access
- InnerHTML updates for content rendering
- Event listener attachment for interactivity

### Data Processing
- Array methods for data manipulation
- Pure functions where possible
- Consistent data transformation patterns

## Testing Considerations

### Unit Testing
- Pure functions can be tested in isolation
- Mock state object for testing
- Test DOM manipulation with jsdom

### Integration Testing
- Test complete user workflows
- Verify state consistency across modules
- Test event handling and UI updates

## Performance Optimization

### Rendering Optimization
- Targeted re-renders instead of full page updates
- Efficient DOM queries and updates
- Minimal reflows and repaints

### Memory Management
- Cleanup of event listeners
- Efficient data structures
- Garbage collection friendly patterns

## Future Module Extensions

### Potential New Modules
- `api.js` - Backend communication
- `auth.js` - User authentication
- `notifications.js` - User notifications
- `export.js` - Data export functionality
- `import.js` - Data import functionality

### Module Splitting
- Large modules could be split by responsibility
- Shared logic extracted to utility modules
- Plugin architecture for extensibility
