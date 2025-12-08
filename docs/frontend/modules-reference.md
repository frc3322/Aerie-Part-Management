# Frontend Modules Reference

## Core Modules

### state.js - State Management
**Purpose**: Central application state management and data operations

**Key Functions**:
- `initializeState()`: Load all data from backend
- `loadAllParts()`: Fetch and organize parts by category
- `refreshData()`: Reload all data from server
- `updatePartInState()`: Update part data across categories
- `setCurrentTab()`: Change active tab
- `setApiKey()`: Store authentication token

**State Structure**:
```javascript
{
  currentTab: "review",
  searchQuery: "",
  sortDirection: 1,
  apiKey: null,
  isAuthenticated: false,
  isLoading: false,
  parts: {
    review: [...],
    cnc: [...],
    hand: [...],
    completed: [...]
  },
  stats: null
}
```

### tabs.js - Navigation System
**Purpose**: Tab switching, search, and sorting functionality

**Key Functions**:
- `switchTab(tabName)`: Change active tab and render content
- `handleSearch()`: Filter parts by search query
- `sortTable()`: Sort parts alphabetically or by date

### modals.js - Modal Management
**Purpose**: Handle all modal dialogs and forms

**Key Functions**:
- `openAddModal()`: Show add/edit part modal
- `openSettingsModal()`: Show settings configuration
- `closeModal()`: Generic modal closing
- `handleCategoryChange()`: Update form when category changes
- `updateFileName()`: Handle file input changes

## Workflow Modules

### review.js - Review Stage
**Purpose**: Manage parts awaiting review and approval

**Key Functions**:
- `renderReview()`: Display review queue
- `approvePart()`: Move part to CNC or Hand category
- `editPart()`: Open edit modal for part

### cnc.js - CNC/Laser Processing
**Purpose**: Handle CNC machining workflow

**Key Functions**:
- `renderCNC()`: Display CNC parts table
- `downloadStepFile()`: Download CAD files
- `markInProgress()`: Update part status
- `markCompleted()`: Move to completed category

### handFab.js - Hand Fabrication
**Purpose**: Manage manual fabrication process

**Key Functions**:
- `renderHandFab()`: Display hand fabrication parts
- `confirmAssignment()`: Assign parts to team members
- `unclaimPart()`: Remove part assignment

### completed.js - Completed Parts
**Purpose**: Archive and view finished parts

**Key Functions**:
- `renderCompleted()`: Display completed parts table
- `markUncompleted()`: Move parts back to active status

## Utility Modules

### formHandler.js - Form Processing
**Purpose**: Handle form submissions and validation

**Key Functions**:
- `handleFormSubmit()`: Process add/edit forms
- `validateForm()`: Form field validation
- `submitPartData()`: Send data to backend

### partActions.js - Part Operations
**Purpose**: Common part manipulation actions

**Key Functions**:
- `deletePart()`: Remove part from system
- `markCompleted()`: Complete part processing
- `confirmUnclaim()`: Confirm unassignment

### auth.js - Authentication
**Purpose**: Handle user authentication flow

**Key Functions**:
- `initializeAuthModal()`: Setup auth modal
- `checkAuthentication()`: Verify API key with backend
- `handleAuthSubmit()`: Process login form
- `showAuthModal()`: Display auth dialog

## HTML Components

### tabs.html - Navigation Tabs
Four main workflow tabs with icons and active state styling

### add-modal.html - Part Creation/Edit
Comprehensive form for part data entry with validation

### assign-modal.html - User Assignment
Simple interface for assigning parts to team members

### settings-modal.html - Configuration
Application settings and preferences

### auth-modal.html - Authentication
API key input and validation

## Utility Files

### apiClient.js - HTTP Client
**Purpose**: Low-level API communication

**Functions**:
- `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()`
- `apiPostMultipart()`: File uploads
- `apiDownloadFile()`: File downloads

### partsApi.js - Parts API
**Purpose**: High-level parts operations

**Functions**:
- `getParts()`, `createPart()`, `updatePart()`, `deletePart()`
- `assignPart()`, `unclaimPart()`, `completePart()`
- `uploadFile()`, `downloadFile()`, `convertStepFile()`

### auth.js (utils) - Auth Utilities
**Purpose**: Authentication helpers

**Functions**:
- `getApiKeyFromCookie()`, `setApiKeyInCookie()`, `clearApiKeyCookie()`

### helpers.js - General Utilities
**Purpose**: Common helper functions

**Functions**:
- Date formatting, string manipulation, DOM utilities