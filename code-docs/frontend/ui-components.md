# Part Management System - UI Components Overview

## HTML Template Structure

The `src/html/` directory contains modular HTML templates that form the user interface. Each template corresponds to a specific UI component or section, following consistent naming conventions.

## Core UI Components

### 1. header.html - Application Header

**Purpose**: Main application header with navigation and global controls

**Structure**:
```html
<header class="mb-8 flex justify-between items-center neumorphic-card p-6">
  <div class="flex items-center gap-4">
    <!-- Logo and title -->
    <div class="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center text-blue-400 shadow-3d">
      <i class="fa-solid fa-gears text-2xl"></i>
    </div>
    <h1 class="text-3xl font-bold tracking-wider text-blue-400">
      PART MANAGER
    </h1>
  </div>
  <div class="flex gap-4 items-center">
    <!-- Settings button -->
    <!-- Search input -->
    <!-- Add part button -->
  </div>
</header>
```

**Features**:
- Application branding and logo
- Global search functionality
- Settings access
- Add new part button
- Responsive design with neumorphic styling

### 2. tabs.html - Navigation Tabs

**Purpose**: Tab navigation for switching between different workflow stages

**Structure**:
```html
<div class="flex gap-2 mb-6">
  <button id="tab-review" class="neumorphic-tab">Review</button>
  <button id="tab-cnc" class="neumorphic-tab">CNC</button>
  <button id="tab-hand" class="neumorphic-tab">Hand Fab</button>
  <button id="tab-completed" class="neumorphic-tab">Completed</button>
</div>
```

**Features**:
- Four main workflow tabs
- Active tab highlighting
- Click handlers for tab switching
- Consistent neumorphic button styling

## Content Templates

### 3. review-content.html - Review Tab Content

**Purpose**: Displays parts pending design review

**Structure**:
```html
<div id="content-review" class="space-y-4">
  <!-- Dynamically populated review items -->
</div>
```

**Features**:
- Card-based layout for review items
- Approval/rejection actions
- Part details display
- Status indicators

### 4. cnc-content.html - CNC Tab Content

**Purpose**: Displays parts for CNC machining

**Structure**:
```html
<div id="content-cnc" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- CNC part cards in grid layout -->
</div>
```

**Features**:
- Grid layout optimized for CNC workflow
- Visual part cards with machining details
- Status tracking for CNC operations

### 5. hand-content.html - Hand Fabrication Content

**Purpose**: Displays parts for manual fabrication

**Structure**:
```html
<div id="content-hand" class="neumorphic-card p-6">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-xl font-semibold text-blue-400">Hand Fabrication Queue</h2>
    <!-- Sort controls -->
  </div>
  <table class="w-full">
    <thead>
      <tr class="border-b border-gray-700">
        <!-- Column headers with sort buttons -->
      </tr>
    </thead>
    <tbody id="hand-table-body">
      <!-- Dynamic table rows -->
    </tbody>
  </table>
</div>
```

**Features**:
- Detailed table view with sorting
- Assignment tracking
- Due date management
- Progress indicators

### 6. completed-content.html - Completed Parts Content

**Purpose**: Archive view of finished parts

**Structure**:
```html
<div id="content-completed" class="space-y-4">
  <!-- Completed part cards -->
</div>
```

**Features**:
- Historical view of completed work
- Final status display
- Archive functionality

## Modal Templates

### 7. auth-modal.html - Authentication Modal

**Purpose**: API key authentication interface for backend access

**Structure**:
```html
<div id="auth-modal" class="modal-overlay">
  <div class="modal-content neumorphic-card">
    <div class="modal-header">
      <h2 class="text-2xl font-bold text-blue-400">Authentication Required</h2>
      <p class="text-gray-300 mt-2">Please enter your API key to access the system.</p>
    </div>
    <form id="auth-form" class="modal-body">
      <div class="form-group">
        <label for="api-key" class="block text-sm font-medium text-gray-300 mb-2">
          API Key
        </label>
        <input
          type="password"
          id="api-key"
          name="api_key"
          class="neumorphic-input w-full"
          placeholder="Enter your API key"
          required
        />
      </div>
      <div class="flex gap-3 mt-6">
        <button type="submit" class="neumorphic-button flex-1">
          Authenticate
        </button>
      </div>
    </form>
  </div>
</div>
```

**Features**:
- Password-type input for API key security
- Form validation and submission handling
- Error display for authentication failures
- Modal overlay with backdrop dismissal disabled
- Persistent until successful authentication

---

### 8. add-modal.html - Add Part Modal

**Purpose**: Form for adding new parts to the system

**Structure**:
```html
<div id="add-modal" class="modal-overlay">
  <div class="modal-content neumorphic-card">
    <div class="modal-header">
      <h2>Add Part for Review</h2>
      <button onclick="closeModal()">×</button>
    </div>
    <form onsubmit="handleFormSubmit(event)">
      <!-- Form fields for part details -->
      <div class="form-group">
        <label>Part Type</label>
        <select name="type" onchange="handleCategoryChange()">
          <option value="cnc">CNC Machining</option>
          <option value="hand">Hand Fabrication</option>
        </select>
      </div>
      <!-- Additional form fields -->
    </form>
  </div>
</div>
```

**Features**:
- Dynamic form fields based on part type
- File upload capabilities
- Onshape URL integration
- Form validation

### 9. assign-modal.html - Assignment Modal

**Purpose**: Modal for assigning parts to team members

**Structure**:
```html
<div id="assign-modal" class="modal-overlay">
  <div class="modal-content neumorphic-card">
    <h2>Assign Part</h2>
    <div class="space-y-4">
      <div>
        <label>Assign to:</label>
        <select id="assign-select">
          <!-- Team member options -->
        </select>
      </div>
      <div class="flex gap-2">
        <button onclick="confirmAssignment()">Assign</button>
        <button onclick="closeAssignModal()">Cancel</button>
      </div>
    </div>
  </div>
</div>
```

**Features**:
- Team member selection
- Assignment confirmation
- Integration with part tracking

### 10. unclaim-modal.html - Unclaim Modal

**Purpose**: Confirmation dialog for removing part assignments

**Structure**:
```html
<div id="unclaim-modal" class="modal-overlay">
  <div class="modal-content neumorphic-card">
    <h2>Unclaim Part</h2>
    <p>Are you sure you want to unclaim this part?</p>
    <div class="flex gap-2">
      <button onclick="confirmUnclaim()">Yes, Unclaim</button>
      <button onclick="closeUnclaimModal()">Cancel</button>
    </div>
  </div>
</div>
```

**Features**:
- Confirmation dialog pattern
- Safe unassignment process
- Prevents accidental data loss

### 11. settings-modal.html - Settings Modal

**Purpose**: Application configuration and preferences

**Structure**:
```html
<div id="settings-modal" class="modal-overlay">
  <div class="modal-content neumorphic-card">
    <div class="modal-header">
      <h2>Settings</h2>
      <button onclick="closeSettingsModal()">×</button>
    </div>
    <div class="space-y-6">
      <!-- Tab visibility settings -->
      <div>
        <h3>Tab Visibility</h3>
        <!-- Toggle switches for each tab -->
      </div>
      <!-- Other settings -->
    </div>
  </div>
</div>
```

**Features**:
- Tab visibility controls
- User preferences
- Configuration management

## CSS Classes and Styling

### Neumorphic Design System

**Core Classes**:
- `neumorphic-card` - Main container styling
- `neumorphic-btn` - Button components
- `neumorphic-input` - Form inputs
- `neumorphic-tab` - Tab navigation
- `shadow-3d` - 3D shadow effects
- `shadow-3d-inset` - Inset shadow effects

**Status Classes**:
- `status-pending` - Yellow/amber styling
- `status-reviewed` - Blue styling
- `status-inprogress` - Green styling
- `status-completed` - Gray styling

### Responsive Design

**Breakpoint Classes**:
- `md:block` - Medium screen visibility
- `lg:grid-cols-3` - Large screen grid layout
- `hidden md:block` - Mobile hiding, desktop showing

## Component Integration

### JavaScript Integration

**Global Handlers**: All onclick handlers reference global functions defined in `main.js`

**Dynamic Rendering**: Content areas populated by corresponding JavaScript modules

**State-Driven UI**: Visual states reflect application state from `state.js`

### Template Loading

**Static Inclusion**: HTML templates included in main `index.html`

**Dynamic Updates**: Content modified through JavaScript DOM manipulation

## Accessibility Considerations

### Semantic HTML
- Proper heading hierarchy
- Semantic form elements
- ARIA labels where needed
- Keyboard navigation support

### Visual Indicators
- Clear focus states
- Color-coded status indicators
- Consistent icon usage
- Readable typography

## Performance Optimization

### Template Efficiency
- Minimal DOM elements
- Efficient CSS selectors
- Optimized for repaint/reflow
- Lazy loading where appropriate

### Bundle Optimization
- Modular HTML loading
- Conditional template rendering
- Efficient asset delivery

## Future UI Enhancements

### Potential Improvements
- Component-based architecture (React/Vue)
- Dark/light theme switching
- Advanced filtering UI
- Drag-and-drop functionality
- Real-time notifications
- Mobile-responsive redesign

### Template Extensions
- Additional modal types
- New content layouts
- Enhanced form components
- Custom component library
