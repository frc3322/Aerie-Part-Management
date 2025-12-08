# Configuration and Deployment

## Overview

The Part Management System supports multiple deployment configurations for different environments (development, testing, production) with flexible configuration management through environment variables, JSON config files, and deployment scripts.

## Configuration System

### Backend Configuration (`backend/config.py`)

**Configuration Sources (in precedence order):**
1. Environment variables (highest priority)
2. `config.json` file
3. Default values (lowest priority)

**Key Configuration Options:**

#### Flask Settings
- `SECRET_KEY`: API authentication key (required in production)
- `DEBUG`: Enable/disable debug mode
- `FLASK_ENV`: Environment (development/testing/production)
- `TESTING`: Enable testing mode

#### Database
- `DATABASE_URL`: SQLAlchemy database URI (default: SQLite)
- `SQLALCHEMY_TRACK_MODIFICATIONS`: Track object changes (default: false)

#### Security & CORS
- `CORS_ORIGINS`: Allowed origins for cross-origin requests
- `BASE_PATH`: Application base path for reverse proxy deployments

#### File Handling
- `UPLOAD_FOLDER`: Directory for file uploads
- `MAX_FILE_SIZE`: Maximum upload file size
- `ALLOWED_EXTENSIONS`: Permitted file extensions (STEP, PDF)

### Frontend Configuration (`vite.config.js`)

**Build Configuration:**
- `base`: Base path for deployment (configurable via `VITE_BASE_PATH`)
- `server.port`: Development server port (3000)
- `build.minify`: Terser minification with console/debugger removal
- `build.target`: ES2020 for modern browser optimization

**Features:**
- Tailwind CSS integration
- Handlebars templating for HTML partials
- Optimized chunk splitting (Three.js separated)
- Content hashing for cache busting

## Deployment Scripts

### Backend Deployment (`backend/deploy.py`)

**Deployment Modes:**
- `dev`: Development server with auto-reload
- `prod`: Production Gunicorn server
- `prod-multi`: Multi-worker production server

**Command Examples:**
```bash
# Development
uv run python deploy.py dev

# Production single worker
uv run python deploy.py prod --port 5000

# Production multi-worker
uv run python deploy.py prod-multi --port 5000
```

**Features:**
- Automatic configuration loading
- Database initialization
- Gunicorn server management
- Environment validation

### Frontend Build (`package.json`)

**Build Scripts:**
- `npm run dev`: Start Vite development server
- `npm run build`: Production build with minification
- `npm run build:analyze`: Build with bundle analysis
- `npm run preview`: Preview production build

**Dependencies:**
- Vite: Fast build tool and dev server
- Tailwind CSS: Utility-first CSS framework
- Three.js: 3D visualization library
- Handlebars: Template engine for HTML partials

## Systemd Service

### Service File (`part-management-backend-EXAMPLE.service`)

**Service Configuration:**
```ini
[Unit]
Description=Part Management System Backend
After=network.target

[Service]
Type=simple
User=dark
WorkingDirectory=/home/dark/part-management-system/backend
ExecStart=/home/dark/.local/bin/uv run python /home/dark/part-management-system/backend/deploy.py prod-multi --port 5000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Installation:**
```bash
# Copy service file
sudo cp part-management-backend-EXAMPLE.service /etc/systemd/system/part-management-backend.service

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable part-management-backend
sudo systemctl start part-management-backend
```

## Environment Variables

### Backend Environment Variables
```bash
# Flask Configuration
SECRET_KEY=your-secret-key-here
DEBUG=false
FLASK_ENV=production
TESTING=false

# Database
DATABASE_URL=sqlite:///parts_prod.db

# CORS
CORS_ORIGINS=["https://yourdomain.com"]

# File Upload
UPLOAD_FOLDER=uploads
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=["step","stp","pdf"]

# Deployment
BASE_PATH=/part-management-system
```

### Frontend Environment Variables
```bash
# Build Configuration
VITE_BASE_PATH=/part-management-system
```

## Development Setup

### Local Development
```bash
# Backend
cd backend
uv run python run.py  # or uv run python deploy.py dev

# Frontend (separate terminal)
npm run dev
```

### Production Deployment
```bash
# Build frontend
npm run build

# Deploy backend
uv run python deploy.py prod-multi --port 5000
```

## Configuration Validation

The deployment script validates critical configuration in production:
- `SECRET_KEY` must be set
- `DATABASE_URL` must be configured
- Warns about auto-generated secrets
- Ensures secure defaults

## File Structure

```
backend/
├── config.py                 # Configuration management
├── deploy.py                 # Deployment script
├── run.py                    # Development runner
├── config.json               # JSON configuration (optional)
└── part-management-backend-EXAMPLE.service  # Systemd service template

frontend/
├── package.json              # NPM dependencies and scripts
├── vite.config.js           # Build configuration
└── dist/                    # Production build output
```