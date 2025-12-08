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
        elif key in ["DEBUG", "TESTING", "SQLALCHEMY_TRACK_MODIFICATIONS"]:
            return env_value.lower() in ("true", "1", "yes", "on")
        return env_value

    # Then config.json values
    json_config = load_config_from_json()
    json_value = json_config.get(key)
    if json_value is not None:
        return json_value

    # Finally defaults
    return default


class Config:
    """Base configuration class loaded from JSON."""

    # Flask settings
    SECRET_KEY = get_config_value("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = get_config_value("DEBUG", False)
    TESTING = get_config_value("TESTING", False)
    FLASK_ENV = get_config_value("FLASK_ENV", "development")

    # Database settings
    SQLALCHEMY_DATABASE_URI = get_config_value("DATABASE_URL", "sqlite:///parts.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = get_config_value(
        "SQLALCHEMY_TRACK_MODIFICATIONS", False
    )

    # CORS settings
    CORS_ORIGINS = get_config_value("CORS_ORIGINS", ["http://localhost:5000"])

    # File upload settings
    UPLOAD_FOLDER = os.path.join(
        os.path.dirname(__file__),
        get_config_value("UPLOAD_FOLDER", "uploads"),
    )
    MAX_FILE_SIZE = get_config_value("MAX_FILE_SIZE", None)
    ALLOWED_EXTENSIONS = set(
        get_config_value("ALLOWED_EXTENSIONS", ["step", "stp", "pdf"])
    )

    # Deployment settings
    BASE_PATH = get_config_value("BASE_PATH", "")

    # Onshape settings
    ONSHAPE_ACCESS_KEY = get_config_value("ONSHAPE_ACCESS_KEY", "")
    ONSHAPE_SECRET_KEY = get_config_value("ONSHAPE_SECRET_KEY", "")


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True
    SQLALCHEMY_DATABASE_URI = get_config_value("DATABASE_URL", "sqlite:///parts_dev.db")


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = get_config_value(
        "DATABASE_URL", "sqlite:///parts_test.db"
    )


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
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
