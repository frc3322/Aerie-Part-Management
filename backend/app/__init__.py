"""Flask application factory and initialization."""

import os
import logging
from flask import Flask, send_from_directory  # type: ignore
from flask_cors import CORS  # type: ignore
from sqlalchemy import inspect, text  # type: ignore
from sqlalchemy.exc import OperationalError  # type: ignore
from flask_sqlalchemy import SQLAlchemy  # type: ignore
from config import config  # type: ignore
from models import db  # type: ignore
from routes import parts_bp  # type: ignore
from utils.logging import setup_flask_logging  # type: ignore


def create_app(config_name: str = "default") -> Flask:
    """Create and configure the Flask application.

    Args:
        config_name (str): Configuration name to use

    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=app.config["CORS_ORIGINS"])

    # Configure non-blocking logging for Flask with request/response logging
    setup_flask_logging(
        app,
        log_dir="logs",
        log_filename="flask_app.log",
        enable_console=True,
        level=logging.INFO,
    )

    # Get base path from environment or config for subpath deployments (e.g., /part-management-system)
    base_path = os.getenv("BASE_PATH", "").rstrip("/")

    # Register blueprints with base path prefix if configured
    api_url_prefix = f"{base_path}/api" if base_path else "/api"
    app.register_blueprint(parts_bp, url_prefix=api_url_prefix + "/parts")

    # Health check endpoint
    @app.route("/health")
    def health_check():
        """Health check endpoint."""
        return {"status": "healthy"}

    # Register health endpoint at base path if configured
    if base_path:
        app.add_url_rule(f"{base_path}/health", "health_check_subpath", health_check)

    # Configure static file serving for frontend
    # Get the project root (parent of backend directory)
    backend_dir = os.path.dirname(__file__)  # backend/app/
    project_root = os.path.dirname(backend_dir)  # backend/
    project_root = os.path.dirname(project_root)  # project root
    dist_folder = os.path.join(project_root, "dist")

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        """Serve frontend files and handle SPA routing."""

        # If deployed at a subpath, strip the base path from the incoming request
        request_path = path
        if base_path and path.startswith(base_path.lstrip("/")):
            # Remove the base path prefix from the request
            request_path = path[len(base_path.lstrip("/")) :]
            if request_path.startswith("/"):
                request_path = request_path[1:]

        # Try to serve the requested file
        if request_path and os.path.exists(os.path.join(dist_folder, request_path)):
            return send_from_directory(dist_folder, request_path)

        # For SPA routing, serve index.html for non-API routes
        if not request_path.startswith("api/"):
            return send_from_directory(dist_folder, "index.html")

        # Return 404 for unknown API routes
        return {"error": "Not found"}, 404

    # Create database tables and run lightweight migrations
    with app.app_context():
        _ensure_schema(db)

        # Create uploads directory if it doesn't exist
        # UPLOAD_FOLDER is now an absolute path from config.py
        upload_folder = app.config.get("UPLOAD_FOLDER")
        if upload_folder:
            # Ensure the directory exists
            os.makedirs(upload_folder, exist_ok=True)
        else:
            # Fallback to backend directory + uploads
            backend_dir = os.path.dirname(os.path.dirname(__file__))
            upload_folder = os.path.join(backend_dir, "uploads")
            os.makedirs(upload_folder, exist_ok=True)

        # Sample data initialization removed for production

    return app


def _init_sample_data() -> None:
    """Initialize database with sample data for development."""
    from models.part import Part  # type: ignore
    from datetime import datetime, timedelta, timezone

    # Check if data already exists
    if Part.query.count() > 0:
        return

    # Sample parts data
    sample_parts = [
        {
            "type": "cnc",
            "name": "Drive Gear",
            "material": "Steel",
            "status": "Pending",
            "notes": "Check tooth profile",
            "file": "gear.stl",
            "onshape_url": "#",
            "category": "review",
        },
        {
            "type": "cnc",
            "name": "Mounting Bracket",
            "material": "Aluminum",
            "status": "Approved",
            "notes": "High precision required",
            "file": "bracket.stl",
            "onshape_url": "#",
            "category": "cnc",
            "assigned": "John Doe",
            "claimed_date": datetime.now(timezone.utc) - timedelta(days=2),
        },
        {
            "type": "hand",
            "name": "Support Frame",
            "material": "Mild Steel",
            "status": "In Progress",
            "notes": "Weld assembly required",
            "file": "frame.dwg",
            "onshape_url": "#",
            "category": "hand",
            "assigned": "Jane Smith",
            "claimed_date": datetime.now(timezone.utc) - timedelta(days=1),
        },
        {
            "type": "hand",
            "name": "Control Panel",
            "material": "Aluminum",
            "status": "Completed",
            "notes": "Assembly completed and tested",
            "file": "panel.dwg",
            "onshape_url": "#",
            "category": "completed",
            "assigned": "Bob Johnson",
        },
        {
            "type": "cnc",
            "name": "Precision Shaft",
            "material": "Stainless Steel",
            "status": "Pending",
            "notes": "Tight tolerances",
            "file": "shaft.stl",
            "onshape_url": "#",
            "category": "review",
            "subsystem": "Drive System",
        },
    ]

    # Add sample parts to database
    for part_data in sample_parts:
        part = Part(**part_data)
        db.session.add(part)

    db.session.commit()
    print("Sample data initialized successfully")


def _ensure_schema(db_instance: SQLAlchemy) -> None:
    """Create tables if missing and apply minimal migrations."""
    engine = db_instance.engine
    inspector = inspect(engine)

    table_exists = inspector.has_table("parts")
    if not table_exists:
        try:
            db_instance.create_all()
        except OperationalError as error:
            error_text = str(error).lower()
            if "already exists" not in error_text:
                raise
        inspector = inspect(engine)
        table_exists = inspector.has_table("parts")

    if not table_exists:
        return

    columns = {column["name"] for column in inspector.get_columns("parts")}
    if "misc_info" not in columns:
        with engine.connect() as connection:
            connection.execute(text("ALTER TABLE parts ADD COLUMN misc_info JSON"))
            connection.commit()
