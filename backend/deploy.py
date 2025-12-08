#!/usr/bin/env python3
"""Deployment script for the Part Management System backend."""

import os
import sys
import socket
import subprocess
import argparse
import json
from typing import Optional, Any

# Constants for repeated values
DEFAULT_DATABASE_URL = "sqlite:///parts_prod.db"
DEFAULT_CORS_ORIGINS = ["http://localhost:5000"]
SECRET_KEY_WARNING = "   WARNING: Using auto-generated SECRET_KEY. Set SECRET_KEY environment variable in production!"


def load_config() -> dict:
    """Load configuration from config.json file if it exists.

    Returns:
        dict: Configuration dictionary, empty if config.json doesn't exist or is invalid
    """
    config_path = "config.json"
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                print(f"[DEPLOY] Loaded configuration from {config_path}")
                return config
        except (json.JSONDecodeError, IOError) as e:
            print(f"[DEPLOY] Warning: Failed to load {config_path}: {e}")
            return {}
    else:
        print("[DEPLOY] No config.json found, using defaults")
        return {}


def get_config_value(config: dict, key: str, default: Any = None) -> Any:
    """Get configuration value with precedence: env var > config > default.

    Args:
        config: Configuration dictionary from config.json
        key: Configuration key to retrieve
        default: Default value if not found in config or env

    Returns:
        The configuration value with empty strings treated as missing
    """
    env_value = os.environ.get(key)
    if env_value not in (None, ""):
        return env_value

    config_value = config.get(key)
    if config_value not in (None, ""):
        return config_value

    return default


def get_cors_origins(config: dict) -> list:
    """Get CORS origins with precedence: env var > config > default.

    Args:
        config: Configuration dictionary from config.json

    Returns:
        list: List of CORS origins
    """
    env_value = os.environ.get("CORS_ORIGINS")
    if env_value is not None:
        try:
            return json.loads(env_value)
        except json.JSONDecodeError:
            return [origin.strip() for origin in env_value.split(",") if origin.strip()]

    config_value = config.get("CORS_ORIGINS")
    if config_value is not None:
        return config_value

    return DEFAULT_CORS_ORIGINS


def parse_int(value: Any) -> Optional[int]:
    """Parse an integer value safely."""
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def resolve_port(mode: str, cli_port: Optional[int], config: dict) -> int:
    """Determine port with precedence: CLI > env > config > defaults."""
    if cli_port:
        return cli_port

    env_port = parse_int(os.environ.get("PORT"))
    if env_port:
        return env_port

    config_port = parse_int(config.get("PORT"))
    if config_port:
        return config_port

    return 5000 if mode == "dev" else 8000


def is_port_available(port: int) -> bool:
    """Check if a TCP port is available for binding.

    Args:
        port: Port number to check.

    Returns:
        True if the port is free, otherwise False.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("0.0.0.0", port))
        except OSError:
            return False
    return True


def get_base_path(config: dict) -> str:
    """Get BASE_PATH with precedence: env var > config > default.

    Args:
        config: Configuration dictionary from config.json

    Returns:
        str: The base path for deployment (e.g., /part-management-system or empty string)
    """
    env_value = os.environ.get("BASE_PATH")
    if env_value is not None:
        return env_value.rstrip("/")

    config_value = config.get("BASE_PATH", "")
    if config_value:
        return config_value.rstrip("/")

    return ""


def run_command(command: str, description: str, env: Optional[dict] = None) -> bool:
    """Run a shell command and return success status.

    Args:
        command: Command to execute
        description: Description of the command for logging
        env: Environment variables to set for the command

    Returns:
        bool: True if command succeeded, False otherwise
    """
    print(f"[DEPLOY] {description}")
    print(f"   Command: {command}")

    try:
        subprocess.run(command, shell=True, check=True, env=env)
        print("   SUCCESS")
        return True
    except subprocess.CalledProcessError as e:
        print(f"   FAILED with exit code {e.returncode}")
        return False


def check_uv() -> bool:
    """Check if uv is installed."""
    return run_command("uv --version", "Checking uv installation")


def install_dependencies() -> bool:
    """Install project dependencies using uv."""
    return run_command(
        "uv pip install -r requirements.txt", "Installing dependencies with uv"
    )


def build_frontend(config: dict) -> bool:
    """Build the frontend with Vite using configuration values."""
    env = os.environ.copy()

    # Set VITE_BASE_PATH from config for proper routing in built frontend
    base_path = get_base_path(config)
    if base_path:
        env["VITE_BASE_PATH"] = base_path
        print(f"   VITE_BASE_PATH: {base_path}")

    # Check if npm is available
    if not run_command("npm --version", "Checking npm installation"):
        print("ERROR: npm is required but not installed.")
        print("   Install Node.js and npm from: https://nodejs.org/")
        return False

    # Install frontend dependencies
    if not run_command("npm install", "Installing frontend dependencies"):
        return False

    # Build the frontend
    return run_command("npm run build", "Building frontend with Vite", env)


def run_development() -> bool:
    """Run the application in development mode."""
    return run_command("uv run python run.py", "Starting development server")


def run_production_multiworker(
    config: dict, workers: int = 4, port: int = 8000
) -> bool:
    """Run the application in production mode with multiple workers."""
    if sys.platform.startswith("win"):
        print(
            "[DEPLOY] Gunicorn is not available on Windows. "
            "Falling back to Waitress (threads)."
        )
        return run_production_waitress(config, port)

    env = os.environ.copy()

    # Set configuration values with precedence: env > config > defaults
    database_url = get_config_value(config, "DATABASE_URL", DEFAULT_DATABASE_URL)
    env["DATABASE_URL"] = database_url

    secret_key = get_config_value(config, "SECRET_KEY")
    if not secret_key:
        import secrets

        secret_key = secrets.token_hex(32)
        print(f"SECRET_KEY: {secret_key}")
        print(SECRET_KEY_WARNING)
    env["SECRET_KEY"] = secret_key

    flask_env = get_config_value(config, "FLASK_ENV", "production")
    env["FLASK_ENV"] = flask_env

    debug = get_config_value(config, "DEBUG", False)
    env["DEBUG"] = str(debug).lower()

    testing = get_config_value(config, "TESTING", False)
    env["TESTING"] = str(testing).lower()

    cors_origins = get_cors_origins(config)
    env["CORS_ORIGINS"] = json.dumps(cors_origins)

    base_path = get_base_path(config)
    if base_path:
        env["BASE_PATH"] = base_path
        print(f"   BASE_PATH: {base_path}")

    command = f"uv run gunicorn -w {workers} -b 0.0.0.0:{port} run_prod:app"
    return run_command(
        command, f"Starting production server (multi-worker, {workers} workers)", env
    )


def run_production_eventlet(config: dict, port: int = 8000) -> bool:
    """Run the application in production mode with eventlet (Linux/macOS only)."""
    env = os.environ.copy()

    # Set configuration values with precedence: env > config > defaults
    database_url = get_config_value(config, "DATABASE_URL", DEFAULT_DATABASE_URL)
    env["DATABASE_URL"] = database_url

    secret_key = get_config_value(config, "SECRET_KEY")
    if not secret_key:
        import secrets

        secret_key = secrets.token_hex(32)
        print(f"SECRET_KEY: {secret_key}")
        print(SECRET_KEY_WARNING)
    env["SECRET_KEY"] = secret_key

    flask_env = get_config_value(config, "FLASK_ENV", "production")
    env["FLASK_ENV"] = flask_env

    debug = get_config_value(config, "DEBUG", False)
    env["DEBUG"] = str(debug).lower()

    testing = get_config_value(config, "TESTING", False)
    env["TESTING"] = str(testing).lower()

    cors_origins = get_cors_origins(config)
    env["CORS_ORIGINS"] = json.dumps(cors_origins)

    base_path = get_base_path(config)
    if base_path:
        env["BASE_PATH"] = base_path
        print(f"   BASE_PATH: {base_path}")

    command = f"uv run gunicorn -k eventlet -w 1 -b 0.0.0.0:{port} run_prod:app"
    return run_command(
        command, "Starting production server (eventlet - Unix only)", env
    )


def run_production_gevent(config: dict, workers: int = 4, port: int = 8000) -> bool:
    """Run the application in production mode with gevent (Linux/macOS only)."""
    env = os.environ.copy()

    # Set configuration values with precedence: env > config > defaults
    database_url = get_config_value(config, "DATABASE_URL", DEFAULT_DATABASE_URL)
    env["DATABASE_URL"] = database_url

    secret_key = get_config_value(config, "SECRET_KEY")
    if not secret_key:
        import secrets

        secret_key = secrets.token_hex(32)
        print(f"SECRET_KEY: {secret_key}")
        print(SECRET_KEY_WARNING)
    env["SECRET_KEY"] = secret_key

    flask_env = get_config_value(config, "FLASK_ENV", "production")
    env["FLASK_ENV"] = flask_env

    debug = get_config_value(config, "DEBUG", False)
    env["DEBUG"] = str(debug).lower()

    testing = get_config_value(config, "TESTING", False)
    env["TESTING"] = str(testing).lower()

    cors_origins = get_cors_origins(config)
    env["CORS_ORIGINS"] = json.dumps(cors_origins)

    base_path = get_base_path(config)
    if base_path:
        env["BASE_PATH"] = base_path
        print(f"   BASE_PATH: {base_path}")

    command = f"uv run gunicorn -k gevent -w {workers} -b 0.0.0.0:{port} run_prod:app"
    return run_command(
        command,
        f"Starting production server (gevent, {workers} workers - Unix only)",
        env,
    )


def run_production_waitress(config: dict, port: int = 8000) -> bool:
    """Run the application in production mode with Waitress (cross-platform)."""
    # Set environment variables for the subprocess
    env = os.environ.copy()

    # Set configuration values with precedence: env > config > defaults
    database_url = get_config_value(config, "DATABASE_URL", DEFAULT_DATABASE_URL)
    env["DATABASE_URL"] = database_url

    secret_key = get_config_value(config, "SECRET_KEY")
    if not secret_key:
        # Generate a random secret key for development - NOT for production!
        import secrets

        secret_key = secrets.token_hex(32)
        print(f"SECRET_KEY: {secret_key}")
        print(SECRET_KEY_WARNING)
    env["SECRET_KEY"] = secret_key

    flask_env = get_config_value(config, "FLASK_ENV", "production")
    env["FLASK_ENV"] = flask_env

    debug = get_config_value(config, "DEBUG", False)
    env["DEBUG"] = str(debug).lower()

    testing = get_config_value(config, "TESTING", False)
    env["TESTING"] = str(testing).lower()

    cors_origins = get_cors_origins(config)
    env["CORS_ORIGINS"] = json.dumps(cors_origins)

    base_path = get_base_path(config)
    if base_path:
        env["BASE_PATH"] = base_path
        print(f"   BASE_PATH: {base_path}")

    command = f"uv run waitress-serve --host=0.0.0.0 --port={port} run_prod:app"
    return run_command(
        command, "Starting production server (Waitress - cross-platform)", env
    )


def main():
    """Main deployment script entry point."""
    parser = argparse.ArgumentParser(
        description="Deploy Part Management System backend"
    )
    parser.add_argument(
        "mode",
        choices=[
            "dev",
            "prod-multi",
            "prod-waitress",
            "prod-eventlet",
            "prod-gevent",
            "install",
        ],
        help="Deployment mode (production modes build the frontend automatically)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of workers for multi-worker modes (default: 4)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port to bind to (default: 8000 for prod, 5000 for dev). "
        "Env PORT or config PORT are used if not provided.",
    )

    args = parser.parse_args()

    # Load configuration from config.json
    config = load_config()

    # Resolve port with precedence CLI > env > config > defaults
    resolved_port = resolve_port(args.mode, args.port, config)

    # Fail fast if the port is already in use
    if not is_port_available(resolved_port):
        print(
            f"ERROR: Port {resolved_port} is already in use. "
            "Stop the existing process or choose a different port with --port or PORT."
        )
        sys.exit(1)
    print("DEPLOY: Part Management System Deployment")
    print(f"   Mode: {args.mode}")
    if args.mode.startswith("prod"):
        print("   Includes: Backend + Frontend build")
    print(f"   Port: {resolved_port}")
    if args.mode in ["prod-multi", "prod-gevent"]:
        print(f"   Workers: {args.workers}")
    print()

    # Check uv installation
    if not check_uv():
        print("ERROR: uv package manager is required but not installed.")
        print("   Install uv from: https://github.com/astral-sh/uv")
        sys.exit(1)

    # Install dependencies for all modes except dev (if already running)
    if args.mode != "dev" and not install_dependencies():
        print("ERROR: Failed to install dependencies")
        sys.exit(1)

    # Build frontend for production modes
    if args.mode != "dev" and not build_frontend(config):
        print("ERROR: Failed to build frontend")
        sys.exit(1)

    # Execute the requested mode
    success = False

    if args.mode == "install":
        success = install_dependencies()
    elif args.mode == "dev":
        success = run_development()
    elif args.mode == "prod-multi":
        success = run_production_multiworker(config, args.workers, resolved_port)
    elif args.mode == "prod-waitress":
        success = run_production_waitress(config, resolved_port)
    elif args.mode == "prod-eventlet":
        success = run_production_eventlet(config, resolved_port)
    elif args.mode == "prod-gevent":
        success = run_production_gevent(config, args.workers, resolved_port)

    if success:
        print("SUCCESS: Deployment completed successfully!")
    else:
        print("FAILED: Deployment failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
