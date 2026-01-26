#!/usr/bin/env python3
"""Main entry point for the Part Management System backend."""

import os
import sys
from app import create_app # type: ignore
from migrations import run_migrations_from_config
from config import Config

# Run migrations before starting the app
print("[RUN] Running database migrations...")
try:
    if run_migrations_from_config(Config.SQLALCHEMY_DATABASE_URI):
        print("[RUN] ✓ Database migrations completed")
    else:
        print("[RUN] ✗ Database migrations failed")
        sys.exit(1)
except Exception as e:
    print(f"[RUN] ✗ Database migrations failed: {e}")
    sys.exit(1)

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=False  # Always production mode
    )
