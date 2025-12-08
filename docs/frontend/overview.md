# Frontend Documentation

## Overview

The frontend is a modern JavaScript single-page application that provides a web interface for managing manufacturing parts through a workflow system. It features a tabbed interface for different production stages and includes authentication, real-time updates, and 3D visualization capabilities.

## Architecture

- **Framework**: Vanilla JavaScript with ES6 modules
- **Styling**: Tailwind CSS with custom neumorphic design system
- **State Management**: Centralized state object with reactive updates
- **API Communication**: RESTful API client with authentication
- **Build System**: Vite for development and bundling

## Core Components

### Application Structure (`main.js`)
- **Entry Point**: Initializes the application and modules
- **Authentication Flow**: Handles user authentication and modal management
- **Global Exports**: Exports functions for HTML onclick handlers
- **Tailwind Config**: Custom color palette and shadow effects

### State Management (`modules/state.js`)
- **Central State**: Single source of truth for application data
- **Categories**: review, cnc, hand, completed (workflow stages)
- **Authentication State**: API key management and auth status
- **Loading States**: UI feedback during data operations
- **Reactive Updates**: Automatic re-rendering when state changes

### UI Components

#### Tabs System (`html/tabs.html`, `modules/tabs.js`)
- **Four Main Tabs**: Review, CNC/Laser, Hand Fabrication, Completed
- **Search Functionality**: Real-time filtering across all parts
- **Sorting**: Alphabetical and date-based sorting with toggle direction
- **Active State Management**: Visual feedback for current tab

#### Modals (`html/`, `modules/modals.js`)
- **Add/Edit Modal**: Form for creating and editing parts
- **Assign Modal**: User assignment interface
- **Settings Modal**: Application configuration
- **Auth Modal**: API key authentication
- **Unclaim/Complete Modals**: Confirmation dialogs

### Workflow Modules

#### Review Module (`modules/review.js`)
- **Part Approval**: Move parts from review to production stages
- **Assignment**: Assign parts to team members
- **Status Updates**: Track part progress

#### CNC Module (`modules/cnc.js`)
- **CNC-Specific Actions**: Download STEP files, mark in progress
- **File Management**: Handle CAD file downloads and conversions
- **Progress Tracking**: Update CNC machining status

#### Hand Fabrication (`modules/handFab.js`)
- **Manual Process Tracking**: Monitor hand-made parts
- **Assignment Management**: Team member coordination
- **Completion Marking**: Mark parts as finished

#### Completed Module (`modules/completed.js`)
- **Archive View**: Historical view of finished parts
- **Reversal Actions**: Move parts back to active status if needed
- **Statistics**: Completion metrics and reporting

### Data Layer

#### API Client (`utils/apiClient.js`)
- **HTTP Methods**: GET, POST, PUT, DELETE with authentication
- **Error Handling**: Comprehensive error management
- **File Upload**: Multipart form data support
- **Cookie Management**: Persistent authentication

#### Parts API (`utils/partsApi.js`)
- **CRUD Operations**: Complete part lifecycle management
- **Search & Filtering**: Advanced query capabilities
- **File Operations**: Upload, download, conversion
- **Workflow Actions**: Approve, assign, complete, unclaim

### Utilities

#### Authentication (`utils/auth.js`)
- **API Key Storage**: Secure cookie-based storage
- **Validation**: Backend authentication verification
- **Session Management**: Login/logout functionality

#### Helpers (`utils/helpers.js`)
- **Data Formatting**: Date, string, and number utilities
- **UI Utilities**: DOM manipulation helpers
- **Validation**: Form input validation

## UI/UX Features

### Design System
- **Neumorphic Design**: 3D-like buttons and cards with shadows
- **Dark Theme**: Modern dark color palette
- **Responsive Layout**: Mobile-friendly design
- **Custom Shadows**: Dynamic shadow effects for interactive elements

### User Experience
- **Real-time Search**: Instant filtering as you type
- **Loading States**: Visual feedback during operations
- **Error Handling**: User-friendly error messages
- **Keyboard Navigation**: Accessible controls

## Integration Points

### Backend API
- **RESTful Endpoints**: Full CRUD operations
- **Authentication**: API key validation
- **File Handling**: STEP file uploads and downloads
- **3D Visualization**: GLTF conversion for web viewing

### External Services
- **Onshape Integration**: CAD model links
- **File Conversion**: STEP to GLTF processing
- **Authentication**: Secure API access

## Development Features

- **Hot Reload**: Vite development server
- **ES6 Modules**: Modern JavaScript architecture
- **Linting**: Code quality enforcement
- **Modular Structure**: Organized, maintainable codebase