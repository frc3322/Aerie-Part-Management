# Part Management System - Frontend Rules

## Core Technologies & Patterns

### 🎯 Use These Technologies
- **JavaScript**: Vanilla ES6+ (no frameworks like React/Vue/Angular)
- **Build Tool**: Vite (not Webpack/Gulp/others)
- **Styling**: Tailwind CSS with neumorphic design system
- **State**: Custom reactive state (`reactiveState.js`)
- **DOM**: Event delegation system
- **Icons**: Font Awesome
- **3D**: Three.js for STEP/STP files
- **PDF**: Embedded iframes

### 🚫 Don't Use These
- React, Vue, Angular, or any component frameworks
- jQuery or DOM manipulation libraries
- Redux, Zustand, or other state libraries
- Direct event listeners (use event delegation)
- CSS frameworks other than Tailwind
- SVG sprites (use Font Awesome)

## Code Organization

### 📁 Directory Structure
```
src/
├── main.js              # App entry point
├── style.css           # Global styles (imports CSS modules)
├── css/                # Organized stylesheet modules
│   ├── base.css        # Tailwind import, body, scrollbar
│   ├── components.css  # Neumorphic design system
│   ├── status.css      # Status color classes
│   ├── animations.css  # Keyframe animations
│   ├── mobile.css      # Mobile-specific styles
│   ├── modals.css      # Modal dialogs styles
│   └── utilities.css   # Utility classes (tooltips, notifications)
├── core/               # Core utilities
│   ├── api/           # API client functions
│   ├── state/         # State management
│   └── dom/           # DOM utilities
├── features/          # Feature modules
│   ├── auth/          # Authentication logic
│   ├── parts/         # Parts management
│   ├── tabs/          # Tab navigation
│   └── modals/        # Modal dialogs
└── templates/         # HTML templates
```

### 📝 Naming Rules
- **Files**: `kebab-case.js` (e.g., `part-actions.js`)
- **Functions**: `camelCase` (e.g., `handleFormSubmit`)
- **Variables**: `camelCase` (e.g., `apiKey`, `isLoading`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- **CSS Classes**: `kebab-case` (e.g., `neumorphic-card`)

## State Management

### ✅ How to Manage State
```javascript
import { setState, getState } from '../core/state/reactiveState.js';

// Set state
setState('currentTab', 'review');
setState('isAuthenticated', true);

// Get state
const tab = getState('currentTab');
const auth = getState('isAuthenticated');
```

### ✅ Persistence
```javascript
import { saveCurrentTab, loadCurrentTab } from '../state/persistence.js';

// Save to localStorage
saveCurrentTab('review');

// Load from localStorage
const savedTab = loadCurrentTab();
```

### 🚫 Don't Do This
```javascript
// Don't use global variables
window.currentUser = user;

// Don't use localStorage directly
localStorage.setItem('tab', 'review');

// Don't mutate state directly
appState.currentTab = 'review';
```

## DOM Manipulation

### ✅ Event Handling (Event Delegation)
```javascript
// HTML: Use data-action attributes
<button data-action="savePart">Save</button>
<input data-action="handleSearch" />

// JavaScript: Register actions in main.js
const actionExports = {
  savePart: () => { /* logic */ },
  handleSearch: (event) => { /* logic */ }
};
```

### ✅ DOM Updates
```javascript
// Create elements
const card = document.createElement('div');
card.className = 'neumorphic-card';

// Update existing elements
const button = document.getElementById('save-btn');
button.disabled = true;
button.textContent = 'Saving...';

// Use classList for styling
element.classList.add('hidden');
element.classList.remove('active');
```

### 🚫 Don't Do This
```javascript
// Don't add direct event listeners
button.addEventListener('click', handleClick);

// Don't use innerHTML for user content
element.innerHTML = userInput; // XSS vulnerability

// Don't query DOM repeatedly
const elements = document.querySelectorAll('.item'); // Cache this
```

## API Communication

### ✅ API Calls
```javascript
import { getParts, createPart } from '../core/api/partsApi.js';

// GET request
const parts = await getParts({ category: 'review' });

// POST request
const newPart = await createPart({
  name: 'Widget',
  material: 'Aluminum'
});
```

### ✅ Error Handling
```javascript
try {
  const result = await apiCall();
  if (result.success) {
    // Handle success
  } else {
    alert(result.error);
  }
} catch (error) {
  console.error('API error:', error);
  alert('Network error, please try again');
}
```

## Feature Implementation

### ✅ Adding a New Feature (5 Steps)

1. **Create Feature Module**
```javascript
// features/new-feature/new-feature.js
export function showNewFeature() {
  // Logic here
}

export function hideNewFeature() {
  // Logic here
}
```

2. **Add State (if needed)**
```javascript
// In state.js, add to appState
export const appState = {
  // ... existing state
  newFeatureVisible: false,
};
```

3. **Add HTML Template (if needed)**
```html
<!-- templates/new-feature.html -->
<div id="new-feature-modal">
  <h2>New Feature</h2>
  <button data-action="hideNewFeature">Close</button>
</div>
```

4. **Register Actions**
```javascript
// In main.js
import { showNewFeature, hideNewFeature } from './features/new-feature/new-feature.js';

const actionExports = {
  // ... existing actions
  showNewFeature,
  hideNewFeature,
};
```

5. **Add to Initialization**
```javascript
// In main.js DOMContentLoaded
initializeNewFeature();
```

### ✅ Modal Implementation
```javascript
import { openModal, closeModal } from '../core/dom/modalManager.js';

// Open modal
openModal('settings-modal', {
  onOpen: () => hideActionIconKey(),
  focusSelector: '#settings-input'
});

// Close modal
closeModal('settings-modal', {
  onClose: () => showActionIconKey()
});
```

### ✅ Form Handling
```javascript
export async function handleFormSubmit(event) {
  event.preventDefault();

  const formData = extractFormData();
  const submitBtn = event.target.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const result = await createPart(formData);
    closeModal();
    // Refresh UI
  } catch (error) {
    alert('Failed to save: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save';
  }
}
```

## Styling Guidelines

### ✅ CSS Classes
```css
/* Use Tailwind utilities */
<button class="neumorphic-btn px-4 py-2 rounded-lg text-blue-400">

/* Custom neumorphic styles */
.neumorphic-card {
  box-shadow: 5px 5px 10px #1a1c24, -5px -5px 10px #2e3240;
}

/* Responsive design */
@media (max-width: 768px) {
  .mobile-hidden { display: none; }
}
```

### ✅ Responsive Design
```javascript
// Check mobile state
const isMobile = getState('isMobile');

// Conditional rendering
if (isMobile) {
  // Mobile-specific logic
} else {
  // Desktop logic
}
```

## Common Patterns

### ✅ Async Operations
```javascript
export async function loadData() {
  setState('isLoading', true);

  try {
    const data = await apiCall();
    setState('data', data);
  } catch (error) {
    setState('error', error.message);
  } finally {
    setState('isLoading', false);
  }
}
```

### ✅ List Rendering
```javascript
export function renderPartsList(parts) {
  const container = document.getElementById('parts-container');
  container.innerHTML = '';

  parts.forEach((part, index) => {
    const card = createPartCard(part, index);
    container.appendChild(card);
  });
}
```

### ✅ Search/Filtering
```javascript
export function handleSearch(eventOrQuery) {
  let query;
  if (typeof eventOrQuery === 'string') {
    query = eventOrQuery;
  } else {
    query = eventOrQuery.target.value;
  }

  setState('searchQuery', query);
  // Re-render filtered results
  renderFilteredParts();
}
```

## Performance Tips

### ✅ Optimize Rendering
- Use event delegation instead of multiple listeners
- Cache DOM queries
- Use `document.createDocumentFragment()` for bulk DOM updates
- Debounce search inputs (300ms delay)

### ✅ Memory Management
- Clean up event listeners when components are removed
- Use WeakMap for element references if needed
- Clear timeouts/intervals

### ✅ Bundle Optimization
- Vite automatically handles code splitting
- Use dynamic imports for large features
- Lazy load heavy libraries (Three.js, etc.)

## Testing Checklist

### ✅ Before Committing
- [ ] No console.log statements
- [ ] No unused imports
- [ ] Functions have proper error handling
- [ ] State updates are reactive (use setState)
- [ ] DOM manipulation uses event delegation
- [ ] Mobile responsiveness tested
- [ ] Build passes (`npm run build`)

### ✅ Feature Testing
- [ ] Happy path works
- [ ] Error cases handled
- [ ] Loading states shown
- [ ] Mobile/desktop both work
- [ ] Keyboard navigation works
- [ ] Accessibility considerations

Follow these rules for consistent, maintainable frontend code that matches the existing architecture.