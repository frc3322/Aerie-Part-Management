# Part Management System - Backend Configuration

## Overview

The backend configuration system provides environment-specific settings that control application behavior, database connections, security settings, and operational parameters. The system uses a hierarchical configuration approach with sensible defaults and environment variable overrides.

## Configuration Architecture

### Configuration Classes

The system uses class-based configuration with inheritance for different environments:

```python
class Config:
    """Base configuration class with default settings."""

class DevelopmentConfig(Config):
    """Development-specific overrides."""

class TestingConfig(Config):
    """Testing environment configuration."""

class ProductionConfig(Config):
    """Production environment configuration."""
```

### Configuration Mapping

```python
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```

## Core Configuration Options

### Application Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `SECRET_KEY` | Generated | Flask secret key for sessions and security |
| `DEBUG` | False | Enable debug mode |
| `TESTING` | False | Enable testing mode |
| `JSON_SORT_KEYS` | False | Sort JSON keys in responses |

### Database Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///parts.db` | Database connection string |
| `SQLALCHEMY_TRACK_MODIFICATIONS` | False | Track object modifications |
| `SQLALCHEMY_ENGINE_OPTIONS` | {} | Engine-specific options |

### Security Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `SESSION_COOKIE_SECURE` | False | HTTPS-only session cookies |
| `SESSION_COOKIE_HTTPONLY` | True | Prevent JavaScript cookie access |
| `SESSION_COOKIE_SAMESITE` | 'Lax' | CSRF protection level |
| `PERMANENT_SESSION_LIFETIME` | 31 days | Session duration |

### CORS Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `CORS_ORIGINS` | `['http://localhost:3000']` | Allowed origins |
| `CORS_METHODS` | `['GET', 'POST', 'PUT', 'DELETE']` | Allowed HTTP methods |
| `CORS_ALLOW_HEADERS` | `['Content-Type', 'Authorization', 'X-API-Key']` | Allowed headers |

### File Upload Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `UPLOAD_FOLDER` | `'uploads'` | Directory for file uploads |
| `ALLOWED_EXTENSIONS` | `{'step', 'stp'}` | Allowed file extensions |
| `MAX_CONTENT_LENGTH` | `16MB` | Maximum upload file size |

### Deployment Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `BASE_PATH` | `''` | Base path for subpath deployments (e.g., `/part-management-system`) |

## Environment-Specific Configurations

### Development Configuration

```python
class DevelopmentConfig(Config):
    """Development configuration with debug features enabled."""

    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///parts_dev.db'

    # Enable CORS for local development
    CORS_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000'
    ]
```

**Characteristics**:
- Debug mode enabled
- Local SQLite database
- Sample data initialization
- Relaxed CORS for development tools
- Detailed error pages

### Testing Configuration

```python
class TestingConfig(Config):
    """Testing configuration for automated tests."""

    TESTING = True
    DEBUG = False
    WTF_CSRF_ENABLED = False

    SQLALCHEMY_DATABASE_URI = 'sqlite:///parts_test.db'

    # Disable external dependencies during testing
    CORS_ORIGINS = []
```

**Characteristics**:
- Testing mode enabled
- Isolated test database
- CSRF disabled for test automation
- No external service calls
- Minimal logging

### Production Configuration

```python
class ProductionConfig(Config):
    """Production configuration with security hardening."""

    DEBUG = False
    TESTING = False

    # Require environment variables for sensitive settings
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

    # Security hardening
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = 'Strict'

    # Restrictive CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '').split(',')

    # Production database options
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
```

**Characteristics**:
- Security hardening enabled
- External database required
- HTTPS enforcement
- Restrictive CORS policy
- Connection pooling
- Error logging to external service

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FLASK_ENV` | Environment name | `production` |
| `SECRET_KEY` | Flask secret key | `your-secret-key-here` |
| `DATABASE_URL` | Database connection | `postgresql://user:pass@host/db` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | localhost | Comma-separated allowed origins |
| `PORT` | 5000 | Server port |
| `LOG_LEVEL` | INFO | Logging level |
| `BASE_PATH` | (empty) | Base path for subpath deployments |
| `UPLOAD_FOLDER` | uploads | Directory for file uploads |

### Database-Specific Variables

For PostgreSQL/MySQL deployments:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_TYPE` | Database type | `postgresql` |
| `DB_USER` | Database user | `parts_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `DB_HOST` | Database host | `localhost` |
| `DB_NAME` | Database name | `parts_db` |

## Configuration Loading

### Application Factory Pattern

```python
def create_app(config_name='default'):
    """Create and configure Flask application."""
    app = Flask(__name__)

    # Load configuration
    config_class = config[config_name]
    app.config.from_object(config_class)

    # Override with environment variables
    app.config.from_prefixed_env(prefix='PARTS_')

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])

    return app
```

### Environment Variable Overrides

The system supports overriding configuration with environment variables using a `PARTS_` prefix:

```bash
export PARTS_SECRET_KEY="override-secret"
export PARTS_DATABASE_URL="postgresql://..."
export PARTS_CORS_ORIGINS="https://app.example.com"
```

### Configuration Validation

```python
def validate_config(app):
    """Validate configuration on startup."""
    required_settings = ['SECRET_KEY', 'SQLALCHEMY_DATABASE_URI']

    for setting in required_settings:
        if not app.config.get(setting):
            raise ValueError(f"Required configuration '{setting}' is not set")

    # Validate database URL format
    db_url = app.config['SQLALCHEMY_DATABASE_URI']
    if not db_url.startswith(('sqlite://', 'postgresql://', 'mysql://')):
        raise ValueError("Invalid database URL format")
```

## Database Configuration

### SQLite (Development)

```python
SQLALCHEMY_DATABASE_URI = 'sqlite:///parts_dev.db'
```

**Pros**: Simple, file-based, no server required
**Cons**: Limited concurrency, not suitable for production

### PostgreSQL (Production)

```python
SQLALCHEMY_DATABASE_URI = 'postgresql://user:password@localhost/parts_db'

SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_pre_ping': True,
    'pool_recycle': 300,
}
```

**Features**: Connection pooling, automatic reconnection, prepared for high load

### MySQL (Alternative Production)

```python
SQLALCHEMY_DATABASE_URI = 'mysql://user:password@localhost/parts_db'

SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}
```

## Deployment Configurations

### Docker Configuration

```dockerfile
FROM python:3.9-slim

# Set environment
ENV FLASK_ENV=production
ENV PARTS_SECRET_KEY=your-secret-key
ENV PARTS_DATABASE_URL=postgresql://...

# Copy application
COPY . /app
WORKDIR /app

# Install dependencies
RUN pip install -r requirements.txt

# Expose port
EXPOSE 5000

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      - FLASK_ENV=production
      - PARTS_SECRET_KEY=${SECRET_KEY}
      - PARTS_DATABASE_URL=postgresql://parts:password@db/parts
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=parts
      - POSTGRES_USER=parts
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parts-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: parts-backend:latest
        env:
        - name: FLASK_ENV
          value: "production"
        - name: PARTS_DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: database-url
        ports:
        - containerPort: 5000
```

## Runtime Configuration

### Dynamic Configuration Updates

```python
def update_cors_origins(app, new_origins):
    """Dynamically update CORS origins."""
    app.config['CORS_ORIGINS'] = new_origins
    # Reinitialize CORS with new origins
    CORS(app, origins=new_origins)
```

### Feature Flags

```python
class Config:
    # Feature flags
    ENABLE_ADVANCED_SEARCH = True
    ENABLE_AUDIT_LOGGING = False
    ENABLE_RATE_LIMITING = False

    # Environment-specific overrides
    @classmethod
    def init_app(cls, app):
        if os.environ.get('ENABLE_AUDIT_LOGGING'):
            cls.ENABLE_AUDIT_LOGGING = True
```

## Monitoring and Observability

### Logging Configuration

```python
import logging
from logging.handlers import RotatingFileHandler

def configure_logging(app):
    """Configure application logging."""
    if not app.debug:
        # Production logging
        handler = RotatingFileHandler('logs/parts.log', maxBytes=10000000, backupCount=5)
        handler.setLevel(logging.INFO)
        app.logger.addHandler(handler)

    # Structured logging
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
```

### Health Checks

```python
@app.route('/health')
def health_check():
    """Application health check endpoint."""
    try:
        # Check database connectivity
        db.session.execute('SELECT 1')

        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503
```

### Metrics Collection

```python
from flask import g, request
import time

@app.before_request
def start_timer():
    g.start = time.time()

@app.after_request
def log_request(response):
    duration = time.time() - g.start
    app.logger.info(f'{request.method} {request.path} - {response.status_code} - {duration:.3f}s')
    return response
```

## Security Configuration

### HTTPS Enforcement

```python
class ProductionConfig(Config):
    # SSL/TLS settings
    PREFERRED_URL_SCHEME = 'https'

    @classmethod
    def init_app(cls, app):
        # Redirect HTTP to HTTPS
        @app.before_request
        def enforce_https():
            if not request.is_secure and request.headers.get('X-Forwarded-Proto') != 'https':
                url = request.url.replace('http://', 'https://', 1)
                return redirect(url, code=301)
```

### Content Security Policy

```python
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response
```

## Configuration Testing

### Configuration Validation Tests

```python
def test_config_validation():
    """Test configuration validation."""
    app = create_app('testing')

    # Test required settings
    assert app.config['SECRET_KEY'] is not None
    assert 'SQLALCHEMY_DATABASE_URI' in app.config

    # Test environment-specific settings
    assert app.config['DEBUG'] is False
    assert app.testing is True
```

### Environment Variable Tests

```python
def test_environment_override(monkeypatch):
    """Test environment variable overrides."""
    monkeypatch.setenv('PARTS_SECRET_KEY', 'test-key')

    app = create_app('testing')
    assert app.config['SECRET_KEY'] == 'test-key'
```

This configuration system provides flexibility, security, and maintainability across different deployment environments while keeping sensitive settings separate from code.
