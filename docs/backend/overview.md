# Backend Documentation

## Overview

The backend is a Flask-based REST API that manages parts in a manufacturing workflow system. It handles part lifecycle management, user assignments, and file processing for CAD files.

## Architecture

- **Framework**: Flask with SQLAlchemy ORM
- **Database**: SQLite (configurable for other databases)
- **Authentication**: API key-based authentication
- **File Processing**: STEP to GLTF conversion using cascadio library

## Key Components

### Configuration (`config.py`)
- Environment-based configuration with fallback to JSON config file
- Support for development, testing, and production environments
- Configurable settings for CORS, file uploads, database connections

### Data Model (`models/part.py`)
- **Part Model**: Core entity representing manufacturing parts
- **Fields**: ID, type, material, name, subsystem, assigned user, status, notes, file references, timestamps
- **Categories**: review, cnc, hand, completed (workflow stages)
- **Search**: Full-text search across multiple fields

### API Routes (`routes/parts.py`)
**Main Endpoints:**
- `GET /api/parts/` - List parts with filtering, search, sorting, pagination
- `POST /api/parts/` - Create new parts
- `GET /api/parts/<id>` - Get specific part
- `PUT /api/parts/<id>` - Update part
- `DELETE /api/parts/<id>` - Delete part
- `POST /api/parts/<id>/upload` - Upload files (STEP, PDF)
- `GET /api/parts/<id>/download/<filename>` - Download files
- `POST /api/parts/<id>/convert` - Convert STEP to GLTF
- `PUT /api/parts/<id>/assign` - Assign part to user
- `PUT /api/parts/<id>/status` - Update part status
- `PUT /api/parts/<id>/unclaim` - Unassign part

### Utilities

#### Authentication (`utils/auth.py`)
- API key validation via headers, query params, or request body
- Rate limiting for auth checks

#### STEP Converter (`utils/step_converter.py`)
- Converts STEP CAD files to GLTF/GLB format
- Uses cascadio library for 3D model processing
- Configurable tolerance settings for conversion quality

#### Validation (`utils/validation.py`)
- Input validation utilities for part data

## Workflow Categories

1. **Review**: Initial parts awaiting review
2. **CNC**: Parts assigned for CNC machining
3. **Hand**: Parts assigned for manual fabrication
4. **Completed**: Finished parts

## File Handling

- **Upload Directory**: Configurable upload folder
- **Supported Formats**: STEP (.step, .stp), PDF
- **3D Conversion**: Automatic STEP to GLTF conversion for 3D viewing
- **File Security**: Secure filename handling

## Configuration Options

- Database URL
- Secret key for API authentication
- CORS origins
- Upload folder path
- File size limits
- Allowed file extensions
- Base path for deployment