"""Configuration settings for the Part Management System backend."""

import json
import os
from typing import Dict, Any


def load_config_from_json() -> Dict[str, Any]:
    """Load configuration from config.json file.

    Returns:
        Dict containing configuration values from config.json, or empty dict if file doesn't exist
    """
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            # If config.json is corrupted, return empty dict to use defaults
            return {}
    return {}


def get_config_value(key: str, default: Any = None) -> Any:
    """Get configuration value with precedence: env var > config.json > default.

    Args:
        key: Configuration key to retrieve
        default: Default value if not found

    Returns:
        The configuration value
    """
    # Environment variables take highest precedence
    env_value = os.environ.get(key)
    if env_value is not None:
        # Handle special cases for lists and booleans from environment
        if key in ["CORS_ORIGINS", "ALLOWED_EXTENSIONS"]:
            try:
                return json.loads(env_value)
            except json.JSONDecodeError:
                return [item.strip() for item in env_value.split(",") if item.strip()]
        elif key in ["SQLALCHEMY_TRACK_MODIFICATIONS"]:
            return env_value.lower() in ("true", "1", "yes", "on")
        return env_value

    # Then config.json values
    json_config = load_config_from_json()
    json_value = json_config.get(key)
    if json_value is not None:
        return json_value

    # Finally defaults
    return default


def _resolve_backend_directory() -> str:
    """Get the absolute path to the backend directory.

    Returns:
        str: Absolute path to the backend directory
    """
    return os.path.dirname(os.path.abspath(__file__))


def _resolve_upload_folder() -> str:
    """Resolve the upload folder path relative to backend directory.

    Returns:
        str: Absolute path to the upload folder
    """
    backend_dir = _resolve_backend_directory()
    relative_path = get_config_value("UPLOAD_FOLDER", "uploads")
    return os.path.join(backend_dir, relative_path)


def _resolve_database_url() -> str:
    """Resolve database URL with absolute paths for SQLite.

    Returns:
        str: Database connection URL
    """
    # Try to get from environment or config first
    db_url = get_config_value("DATABASE_URL", None)
    
    # Handle external databases (PostgreSQL, MySQL) - return as-is
    if db_url and db_url.startswith(("postgresql", "mysql", "postgres")):
        return db_url
    
    # Handle SQLite - ensure absolute path
    if db_url and db_url.startswith("sqlite://"):
        # Check if it's already an absolute path
        # Format: sqlite:////absolute/path or sqlite:///relative/path
        if db_url.startswith("sqlite:////"):
            # Already absolute
            return db_url
        else:
            # Relative path - convert to absolute
            backend_dir = _resolve_backend_directory()
            # Extract filename from sqlite:///filename.db
            db_filename = db_url.replace("sqlite:///", "")
            db_path = os.path.join(backend_dir, db_filename)
            return f"sqlite:///{db_path}"
    
    # Default to SQLite in backend directory
    backend_dir = _resolve_backend_directory()

    # Use appropriate database name based on environment
    flask_env = get_config_value("FLASK_ENV", "production")
    if flask_env == "production":
        db_name = "parts_prod.db"
    else:
        db_name = "parts.db"

    db_path = os.path.join(backend_dir, db_name)
    # sqlite:////absolute/path/to/db.db (4 slashes: 3 for sqlite://, 1 for absolute path)
    return f"sqlite:///{db_path}"


class Config:
    """Base configuration class loaded from JSON.

    Path Resolution Strategy:
    - All file paths (uploads, database) are resolved relative to the backend directory
    - Absolute paths are used to ensure consistency regardless of CWD
    - This allows the application to work when executed from any directory
    """

    # Flask settings
    SECRET_KEY = get_config_value("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = False  # Always production
    TESTING = False  # Always production
    FLASK_ENV = get_config_value("FLASK_ENV", "production")

    # Database settings - resolved at class definition time to absolute path
    SQLALCHEMY_DATABASE_URI = _resolve_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = get_config_value(
        "SQLALCHEMY_TRACK_MODIFICATIONS", False
    )

    # CORS settings
    CORS_ORIGINS = get_config_value("CORS_ORIGINS", ["http://localhost:5000"])

    # File upload settings - resolved at class definition time to absolute path
    # This ensures uploads are stored in the backend directory regardless of CWD
    UPLOAD_FOLDER = _resolve_upload_folder()
    MAX_FILE_SIZE = get_config_value("MAX_FILE_SIZE", None)
    ALLOWED_EXTENSIONS = set(
        get_config_value("ALLOWED_EXTENSIONS", ["step", "stp", "pdf"])
    )

    # Deployment settings
    BASE_PATH = get_config_value("BASE_PATH", "")

    # Onshape settings
    ONSHAPE_ACCESS_KEY = get_config_value("ONSHAPE_ACCESS_KEY", "")
    ONSHAPE_SECRET_KEY = get_config_value("ONSHAPE_SECRET_KEY", "")


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False

    def __init__(self):
        super().__init__()
        # In production, require environment variables or config.json to be set
        database_url = get_config_value("DATABASE_URL")
        secret_key = get_config_value("SECRET_KEY")

        if not database_url:
            raise ValueError(
                "DATABASE_URL must be set in production (via environment variable or config.json)"
            )
        if not secret_key:
            raise ValueError(
                "SECRET_KEY must be set in production (via environment variable or config.json)"
            )

        self.SQLALCHEMY_DATABASE_URI = database_url
        self.SECRET_KEY = secret_key


# Configuration mapping
config = {
    "development": ProductionConfig,
    "testing": ProductionConfig,
    "production": ProductionConfig,
    "default": ProductionConfig,
}
