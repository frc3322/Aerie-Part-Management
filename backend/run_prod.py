#!/usr/bin/env python3
"""Production entry point for the Part Management System backend using Gunicorn."""

import sys
from app import create_app # type: ignore
from migrations import run_migrations_from_config
from config import Config

# Run migrations before creating the app
print("[PROD] Running database migrations...")
try:
    if run_migrations_from_config(Config.SQLALCHEMY_DATABASE_URI):
        print("[PROD] ✓ Database migrations completed")
    else:
        print("[PROD] ✗ Database migrations failed")
        sys.exit(1)
except Exception as e:
    print(f"[PROD] ✗ Database migrations failed: {e}")
    sys.exit(1)

# Create the Flask application for production
app = create_app("production")

if __name__ == "__main__":
    # This file is meant to be run with Gunicorn, not directly
    print("This file should be run with Gunicorn. Use one of the following commands:")
    print()
    print("# Multi-worker setup (Linux/macOS only - limited Windows support)")
    print("uv run gunicorn -w 4 -b 0.0.0.0:8000 run_prod:app")
    print()
    print("# Waitress setup (RECOMMENDED for Windows - cross-platform)")
    print("uv run waitress-serve --host=0.0.0.0 --port=8000 run_prod:app")
    print()
    print("# Eventlet async setup (Linux/macOS only - NOT Windows compatible)")
    print("uv run gunicorn -k eventlet -w 1 -b 0.0.0.0:8000 run_prod:app")
    print()
    print("# Gevent async setup (Linux/macOS only - NOT Windows compatible)")
    print("uv run gunicorn -k gevent -w 4 -b 0.0.0.0:8000 run_prod:app")
    sys.exit(1)
