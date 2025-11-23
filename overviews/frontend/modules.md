# Part Management System - Modules Overview

## Module Organization

The `src/modules/` directory contains the core business logic, organized by feature and responsibility. Each module follows consistent patterns for imports, exports, and documentation.

## Core Modules

### 1. state.js - State Management

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
  parts: {
    review: Part[],
    cnc: Part[],
    hand: Part[],
    completed: Part[]
  }
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

## Feature-Specific Modules

### 6. review.js - Review Tab Logic

**Purpose**: Manages the design review workflow

**Key Functions**:
- `renderReview()` - Renders review tab content
- Displays parts pending design review
- Handles review-specific actions and approvals

**Content**: Parts in "Pending" or "Reviewed" status

### 7. cnc.js - CNC Machining Tab Logic

**Purpose**: Manages CNC machining workflow

**Key Functions**:
- `renderCNC()` - Renders CNC tab with grid layout
- Displays parts requiring CNC machining
- Special grid layout for CNC-specific information

**Content**: Parts designated for CNC processing

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
├── state.js (core state)
├── tabs.js
│   ├── review.js → state.js
│   ├── cnc.js → state.js
│   ├── handFab.js → state.js, utils/helpers.js
│   └── completed.js → state.js
├── partActions.js → state.js, tabs.js
├── modals.js → state.js, utils/helpers.js
└── formHandler.js → state.js, tabs.js, utils/helpers.js
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
