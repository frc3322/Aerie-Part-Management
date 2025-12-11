# Part Management System - Backend Overview

## Overview

This document provides a comprehensive overview of the backend architecture for the Part Management System, a Flask-based REST API that provides complete part lifecycle management and database persistence for the frontend application.

## System Architecture

The backend follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────┐
│   API Routes    │  ← REST endpoints
├─────────────────┤
│  Business Logic │  ← Data processing & validation
├─────────────────┤
│   Data Models   │  ← Database abstraction
├─────────────────┤
│    Database     │  ← Data persistence
└─────────────────┘
```

## Technology Stack

- **Framework**: Flask 2.3+ (micro web framework)
- **Database**: SQLAlchemy ORM with SQLite (production-ready for PostgreSQL/MySQL)
- **Authentication**: Custom API key authentication with rate limiting
- **File Processing**: cascadio library for STEP to GLTF/GLB conversion
- **Validation**: Custom validation layer with comprehensive error handling
- **CORS**: Cross-origin resource sharing for frontend integration
- **Environment**: Configurable environments (development, testing, production)
- **Package Management**: uv for fast Python dependency management

## Core Components

### 1. Application Factory (`app/`)
- Flask application initialization
- Extension setup (SQLAlchemy, CORS)
- Blueprint registration
- Development data seeding

### 2. Data Models (`models/`)
- Part entity with full lifecycle support
- Database relationships and constraints
- Automatic timestamp management
- Query optimization with indexing

### 3. API Routes (`routes/`)
- RESTful endpoint definitions
- Request/response handling
- Error management and status codes
- Comprehensive CRUD operations

### 4. Utilities (`utils/`)
- **Authentication** (`auth.py`): API key validation and security
- **Validation** (`validation.py`): Data validation and sanitization
- **STEP Converter** (`step_converter.py`): 3D model conversion utilities
- Business logic helpers and input processing utilities

### 5. Configuration (`config.py`)
- Environment-specific settings
- Database connection management
- Security configurations
- CORS and API settings

## Key Features

### Part Lifecycle Management
- **Review Phase**: Parts pending design review
- **Production Phase**: CNC machining or hand fabrication
- **Completion Phase**: Finished parts archive
- **Assignment Tracking**: User assignment and claiming

### File Management & 3D Visualization
- **STEP File Upload**: Support for .step and .stp file formats
- **Automatic Conversion**: Real-time STEP to GLTF/GLB conversion using cascadio
- **3D Model Serving**: Converted models served for frontend visualization
- **File Persistence**: Secure file storage with organized directory structure

### Authentication & Security
- **API Key Authentication**: Secure key-based authentication system
- **Rate Limiting**: Protection against authentication abuse (2-second minimum delay)
- **Multiple Auth Methods**: Header, query parameter, and request body authentication
- **Input Validation**: Comprehensive validation with business rule enforcement

### Advanced Querying
- Global search across multiple fields
- Category-based filtering
- Sorting and pagination
- Real-time statistics

### Full-Stack Capabilities
- **Frontend Serving**: Built-in static file serving for single-server deployment
- **SPA Routing**: Automatic routing for single-page applications
- **Base Path Support**: Configurable subpath deployments
- **CORS Integration**: Cross-origin resource sharing for frontend integration

### Data Validation
- Type checking and constraint validation
- Business rule enforcement
- Input sanitization
- Error aggregation and reporting

### Production Ready
- Environment-based configuration
- Database migration support
- Logging and error tracking
- Security headers and CORS

## API Design Principles

### RESTful Design
- Resource-based URLs (`/api/parts/`, `/api/parts/<id>`)
- HTTP methods for operations (GET, POST, PUT, DELETE)
- Consistent response formats
- Proper status codes

### Data Consistency
- Atomic operations with transaction support
- Validation before database operations
- Error rollback on failures
- Timestamp tracking for audit trails

### Performance Optimization
- Database indexing on frequently queried fields
- Efficient query patterns
- Pagination for large result sets
- Connection pooling (configurable)

## Database Schema

### Part Entity
```sql
CREATE TABLE parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50),                    -- 'cnc' or 'hand'
    name VARCHAR(200),                   -- Part name
    subsystem VARCHAR(100),              -- System subsystem
    assigned VARCHAR(100),               -- Assigned user
    status VARCHAR(50) NOT NULL,         -- Workflow status
    notes TEXT,                          -- Additional notes
    file VARCHAR(200),                   -- File reference
    onshape_url VARCHAR(500),            -- External URL
    claimed_date DATETIME,               -- Assignment timestamp
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(20) NOT NULL        -- Workflow category
);
```

## Development Workflow

### Local Development
1. Create virtual environment: `uv venv .venv`
2. Install dependencies: `uv pip install -r requirements.txt`
3. Run application: `python run.py`
4. API available at `http://localhost:5000`
5. Frontend available at `http://localhost:5000` (served by backend)

### Environment Configuration
- **Development**: SQLite database, debug mode, sample data
- **Testing**: Isolated test database, no debug mode
- **Production**: External database, optimized settings

## Integration with Frontend

The backend is designed to seamlessly integrate with the existing frontend:

- **State Synchronization**: API responses match frontend state structure
- **Error Handling**: Frontend-compatible error responses
- **Workflow Operations**: Direct mapping to frontend actions
- **Search & Filtering**: Compatible with frontend search implementation

## Security Considerations

### Authentication & Authorization
- API key-based authentication system
- Rate limiting on authentication endpoints (2-second minimum delay)
- Multiple authentication methods (header, query, body)
- Secure key storage and validation

### Data Protection
- Input validation and sanitization
- SQL injection prevention through ORM
- XSS protection via proper data handling
- Secure configuration management
- File upload validation and secure storage

### API Security
- CORS configuration for allowed origins
- Request size limits and file type validation
- Error message sanitization
- Audit logging capabilities
- Secure file serving with proper MIME types

## Performance Characteristics

### Query Performance
- Indexed category field for fast filtering
- Optimized search queries with ILIKE operations
- Efficient pagination with LIMIT/OFFSET
- Connection reuse and pooling

### Scalability
- Stateless API design
- Database connection pooling
- Horizontal scaling support
- CDN-ready static asset handling

## Testing Strategy

### Unit Testing
- Model validation and business logic
- API endpoint testing
- Utility function verification
- Error condition handling

### Integration Testing
- End-to-end API workflows
- Database operation verification
- Cross-component interaction
- Performance benchmarking

## Deployment Considerations

### Containerization
- Docker support with multi-stage builds
- Lightweight Python images
- Environment variable configuration
- Health check endpoints

### Production Environment
- WSGI server (Gunicorn/uWSGI)
- Reverse proxy (Nginx)
- SSL/TLS termination
- Monitoring and logging

## Related Documentation

- [Backend Architecture](backend-architecture.md) - Detailed architectural decisions
- [API Endpoints](backend-api.md) - Complete API reference
- [Database Models](backend-models.md) - Data model specifications
- [Utilities](backend-utils.md) - Utility function documentation
- [Configuration](backend-config.md) - Environment and deployment config

## Getting Started

1. **Prerequisites**: Python 3.8+, uv package manager
2. **Setup**: `uv venv .venv && uv pip install -r requirements.txt`
3. **Run**: `python run.py`
4. **Test**: API available at `http://localhost:5000/api/parts/`
5. **Frontend**: Available at `http://localhost:5000` (served by backend)

The backend initializes with sample data in development mode, providing immediate testing capabilities for the frontend integration.
