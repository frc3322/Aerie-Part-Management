"""Helper script to create config.json file for deployment configuration."""

import json
import os
import secrets
from typing import Dict, Any


def create_default_config() -> Dict[str, Any]:
    """Create default configuration dictionary.

    Returns:
        Dict containing default configuration values
    """
    return {
        # Flask settings
        "SECRET_KEY": secrets.token_hex(32),
        "DEBUG": False,
        "TESTING": False,
        "FLASK_ENV": "production",
        # Database settings
        "DATABASE_URL": "sqlite:///parts_prod.db",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        # CORS settings
        "CORS_ORIGINS": ["http://localhost:3000"],
        # File upload settings
        "UPLOAD_FOLDER": "uploads",
        "MAX_FILE_SIZE": None,  # No limit, but validate reasonable sizes
        "ALLOWED_EXTENSIONS": ["step", "stp", "pdf"],
        # Deployment settings
        "BASE_PATH": "",
        # Onshape settings
        "ONSHAPE_ACCESS_KEY": "",
        "ONSHAPE_SECRET_KEY": "",
    }


def prompt_for_value(key: str, default: str, description: str) -> str:
    """Prompt user for configuration value.

    Args:
        key: Configuration key name
        default: Default value
        description: Description of what this value does

    Returns:
        str: User input or default value
    """
    print(f"\n{key}:")
    print(f"  Description: {description}")
    print(f"  Default: {default}")
    print(f"  Current: {os.environ.get(key, 'Not set')}")

    try:
        response = input("  Enter new value (or press Enter for default): ").strip()
        return response if response else default
    except EOFError:
        # Non-interactive mode, use default
        print(f"  Using default: {default}")
        return default


def prompt_for_bool(key: str, default: bool, description: str) -> bool:
    """Prompt user for boolean configuration value.

    Args:
        key: Configuration key name
        default: Default boolean value
        description: Description of what this value does

    Returns:
        bool: User input or default value
    """
    print(f"\n{key}:")
    print(f"  Description: {description}")
    print(f"  Default: {default}")
    print(f"  Current: {os.environ.get(key, 'Not set')}")

    try:
        while True:
            response = (
                input("  Enter true/false (or press Enter for default): ")
                .strip()
                .lower()
            )
            if not response:
                return default
            elif response in ["true", "yes", "y", "1", "on"]:
                return True
            elif response in ["false", "no", "n", "0", "off"]:
                return False
            else:
                print("  Please enter 'true' or 'false'")
    except EOFError:
        # Non-interactive mode, use default
        print(f"  Using default: {default}")
        return default


def prompt_for_list(key: str, default: list, description: str) -> list:
    """Prompt user for list configuration value.

    Args:
        key: Configuration key name
        default: Default list value
        description: Description of what this value does

    Returns:
        list: User input or default value
    """
    print(f"\n{key}:")
    print(f"  Description: {description}")
    print(f"  Default: {', '.join(default)}")
    print(f"  Current: {os.environ.get(key, 'Not set')}")

    try:
        response = input(
            "  Enter comma-separated values (or press Enter for default): "
        ).strip()
    except EOFError:
        # Non-interactive mode, use default
        print(f"  Using default: {', '.join(default)}")
        response = ""

    if not response:
        return default

    return [item.strip() for item in response.split(",") if item.strip()]


def prompt_for_cors_origins(default: list) -> list:
    """Prompt user for CORS origins configuration.

    Args:
        default: Default CORS origins list

    Returns:
        list: CORS origins list
    """
    print("\nCORS_ORIGINS:")
    print(
        "  Description: Comma-separated list of allowed CORS origins (e.g., https://example.com,https://app.example.com)"
    )
    print(f"  Default: {','.join(default)}")
    print(f"  Current: {os.environ.get('CORS_ORIGINS', 'Not set')}")

    try:
        response = input(
            "  Enter new values (comma-separated, or press Enter for default): "
        ).strip()
    except EOFError:
        # Non-interactive mode, use default
        print(f"  Using default: {','.join(default)}")
        response = ""

    if not response:
        return default

    return [origin.strip() for origin in response.split(",") if origin.strip()]


def main():
    """Main function to create config.json file."""
    print("CONFIG HELPER: Part Management System Configuration Creator")
    print("=" * 60)

    # Load existing config if it exists
    config_path = "config.json"
    if os.path.exists(config_path):
        print(f"Existing {config_path} found. Loading current values...")
        try:
            with open(config_path, "r") as f:
                existing_config = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not read existing {config_path}: {e}")
            print("Starting with defaults...")
            existing_config = {}
    else:
        print(f"No existing {config_path} found. Starting with defaults...")
        existing_config = {}

    # Get default config
    config = create_default_config()

    # Override defaults with existing config values
    config.update(existing_config)

    print("\nConfiguration Options:")
    print("-" * 30)

    # Prompt for each configuration value
    config["DATABASE_URL"] = prompt_for_value(
        "DATABASE_URL",
        config["DATABASE_URL"],
        "Database connection URL (e.g., sqlite:///parts_prod.db or postgresql://user:pass@localhost/db)",
    )

    config["SECRET_KEY"] = prompt_for_value(
        "SECRET_KEY",
        config["SECRET_KEY"],
        "Secret key for Flask sessions and security (should be random and kept secret)",
    )

    config["FLASK_ENV"] = prompt_for_value(
        "FLASK_ENV", config["FLASK_ENV"], "Flask environment (production, development)"
    )

    config["CORS_ORIGINS"] = prompt_for_cors_origins(
        config.get("CORS_ORIGINS", ["http://localhost:3000"])
    )

    config["BASE_PATH"] = prompt_for_value(
        "BASE_PATH",
        config.get("BASE_PATH", ""),
        "URL subpath for deployment (e.g., /part-management-system for Cloudflare tunnels, leave empty for root deployment)",
    )

    config["DEBUG"] = prompt_for_bool(
        "DEBUG",
        config.get("DEBUG", False),
        "Enable debug mode (shows detailed error messages and reloads on code changes)",
    )

    config["TESTING"] = prompt_for_bool(
        "TESTING",
        config.get("TESTING", False),
        "Enable testing mode (uses test database and disables some features)",
    )

    config["UPLOAD_FOLDER"] = prompt_for_value(
        "UPLOAD_FOLDER",
        config.get("UPLOAD_FOLDER", "uploads"),
        "Directory path for file uploads (relative to backend directory)",
    )

    config["ALLOWED_EXTENSIONS"] = prompt_for_list(
        "ALLOWED_EXTENSIONS",
        config.get("ALLOWED_EXTENSIONS", ["step", "stp", "pdf"]),
        "Comma-separated list of allowed file extensions for uploads",
    )

    config["ONSHAPE_ACCESS_KEY"] = prompt_for_value(
        "ONSHAPE_ACCESS_KEY",
        config.get("ONSHAPE_ACCESS_KEY", ""),
        "Onshape access key for drawing downloads",
    )

    config["ONSHAPE_SECRET_KEY"] = prompt_for_value(
        "ONSHAPE_SECRET_KEY",
        config.get("ONSHAPE_SECRET_KEY", ""),
        "Onshape secret key for drawing downloads",
    )

    # Write config to file
    try:
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)

        print(f"\nSUCCESS: Configuration saved to {config_path}")
        print("\nConfiguration Summary:")
        for key, value in config.items():
            if key == "SECRET_KEY" and len(str(value)) > 10:
                print(f"  {key}: {str(value)[:10]}...")
            elif key in ["CORS_ORIGINS", "ALLOWED_EXTENSIONS"] and isinstance(
                value, list
            ):
                print(f"  {key}: {', '.join(value)}")
            elif key == "MAX_FILE_SIZE" and value is None:
                print(f"  {key}: No limit")
            else:
                print(f"  {key}: {value}")

        print("\nYou can now run deployment with: python deploy.py <mode>")
        print(f"Configuration will be loaded from {config_path}")

    except IOError as e:
        print(f"ERROR: Failed to write {config_path}: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
