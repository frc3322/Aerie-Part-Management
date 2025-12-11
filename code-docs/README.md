# Part Management System Documentation

## Overview

The Part Management System is a web-based application for managing manufacturing parts through a workflow system. It supports the complete lifecycle of parts from initial design review through CNC machining, hand fabrication, and completion tracking.

## Architecture

The system consists of three main components:

### Backend (Python/Flask)
- RESTful API for part management
- SQLite database with SQLAlchemy ORM
- File upload and processing (STEP to GLTF conversion)
- Authentication via API keys

### Frontend (JavaScript)
- Single-page application with tabbed interface
- Real-time search and filtering
- 3D visualization support (Three.js)
- Responsive design with neumorphic UI

### Configuration & Deployment
- Environment-based configuration
- Multiple deployment modes (dev/prod)
- Systemd service support
- Docker-ready architecture

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- uv package manager

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd part-management-system

# Backend setup
cd backend
uv pip install -r requirements.txt

# Frontend setup
cd ..
npm install

# Start development servers
# Terminal 1 - Backend
cd backend
uv run python run.py

# Terminal 2 - Frontend
npm run dev
```

### Production Deployment

```bash
# Build frontend
npm run build

# Deploy backend
cd backend
uv run python deploy.py prod-multi --port 5000
```

## Project Structure

```
part-management-system/
├── backend/                 # Python Flask API
│   ├── models/             # Database models
│   ├── routes/             # API endpoints
│   ├── utils/              # Backend utilities
│   ├── config.py           # Configuration management
│   └── deploy.py           # Deployment script
├── src/                    # Frontend application
│   ├── modules/            # JavaScript modules
│   ├── html/               # HTML components
│   ├── utils/              # Frontend utilities
│   └── main.js             # Application entry point
├── docs/                   # Documentation
│   ├── backend/            # Backend documentation
│   ├── frontend/           # Frontend documentation
│   ├── config/             # Configuration docs
│   ├── assets/             # Assets documentation
│   └── utils/              # Utilities documentation
├── favicon/                # Web app icons
└── package.json            # Frontend dependencies
```

## Workflow

The system manages parts through four main workflow stages:

1. **Review**: Initial parts awaiting approval and categorization
2. **CNC**: Parts assigned for CNC/laser machining
3. **Hand**: Parts assigned for manual fabrication
4. **Completed**: Finished parts archive

## Key Features

### Part Management
- Create, edit, and delete parts
- File upload (STEP files, PDFs)
- 3D visualization with automatic STEP to GLTF conversion
- Search and filtering across all fields

### Workflow Tracking
- Visual workflow stages with tabbed interface
- Part assignment to team members
- Status updates and progress tracking
- Completion marking with quantity tracking

### User Interface
- Modern neumorphic design
- Dark theme optimized
- Real-time search
- Responsive layout for mobile devices

### API Features
- RESTful JSON API
- API key authentication
- Comprehensive CRUD operations
- File download and upload support

## Configuration

### Environment Variables
```bash
# Backend
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///parts.db
CORS_ORIGINS=["http://localhost:3000"]

# Frontend
VITE_BASE_PATH=/part-management-system
```

### Configuration File
Create `backend/config.json`:
```json
{
  "SECRET_KEY": "your-secret-key",
  "DATABASE_URL": "sqlite:///parts.db",
  "CORS_ORIGINS": ["http://localhost:3000"],
  "UPLOAD_FOLDER": "uploads"
}
```

## API Reference

### Authentication
All API requests require authentication:
```
X-API-Key: your-api-key
```

### Main Endpoints
- `GET /api/parts/` - List parts with filtering
- `POST /api/parts/` - Create new part
- `PUT /api/parts/{id}` - Update part
- `DELETE /api/parts/{id}` - Delete part
- `POST /api/parts/{id}/upload` - Upload files
- `PUT /api/parts/{id}/assign` - Assign part to user

## Development

### Code Quality
- Python: Type hints, Google-style docstrings
- JavaScript: ES6 modules, modern syntax
- Linting: Built-in Cursor linter integration

### Testing
- Manual testing recommended
- No automated test suite currently implemented
- API testing via tools like Postman or curl

## Deployment Options

### Development
- Hot reload for both frontend and backend
- SQLite database for easy setup
- Local file storage for uploads

### Production
- Gunicorn WSGI server with multiple workers
- Environment variable configuration
- Systemd service integration
- Reverse proxy ready (nginx/apache)

### Docker (Future)
- Containerized deployment planned
- Multi-stage builds for optimization
- Volume mounts for persistent storage

## Contributing

1. Follow existing code style and patterns
2. Add documentation for new features
3. Test changes in both development and production modes
4. Update configuration documentation for new settings

## Troubleshooting

### Common Issues
- **API Authentication**: Ensure SECRET_KEY is set and API key is provided
- **File Uploads**: Check upload folder permissions and file size limits
- **CORS Errors**: Verify CORS_ORIGINS configuration
- **Database Issues**: Check DATABASE_URL and file permissions

### Logs
- Backend logs to console by default
- Check browser developer tools for frontend errors
- Use `uv run python deploy.py dev` for detailed logging

## License

ISC License - See package.json for details

## Support

For issues and questions:
- Check existing documentation
- Review configuration examples
- Test with provided deployment scripts
- Check browser console and server logs for errors