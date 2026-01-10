"""Logging configuration for Flask application and deployment.

Provides non-blocking logging with file rotation based on size (2GB limit).
Automatically truncates oldest log entries when file exceeds 2GB.
"""

import logging
import logging.handlers
import os
from queue import Queue


class MaxSizeRotatingFileHandler(logging.handlers.RotatingFileHandler):
    """
    Custom rotating file handler that maintains a maximum file size.

    When the log file exceeds MAX_BYTES (2GB), it truncates the oldest
    entries by reading the file and removing the oldest lines until
    the file is under the limit.
    """

    MAX_BYTES = 2 * 1024 * 1024 * 1024  # 2GB in bytes

    def doRollover(self):
        """
        Truncate the log file when it exceeds MAX_BYTES.

        Instead of creating a new file, reads the existing log and removes
        the oldest entries until the file is below the limit.
        """
        if self.stream:
            self.stream.close()

        try:
            # Read the entire log file
            if os.path.exists(self.baseFilename):
                with open(
                    self.baseFilename, "r", encoding="utf-8", errors="ignore"
                ) as f:
                    lines = f.readlines()

                # Remove oldest lines until file would be under limit
                # Start by removing chunks of 10% of lines
                chunk_size = max(1, len(lines) // 10)

                while lines and self._estimate_size(lines) > self.MAX_BYTES:
                    lines = lines[chunk_size:]

                # Write back the remaining lines
                with open(self.baseFilename, "w", encoding="utf-8") as f:
                    f.writelines(lines)
        except (OSError, IOError) as e:
            print(f"[LOGGING] Error truncating log file: {e}")

        # Reopen the stream
        self.stream = self._open()

    @staticmethod
    def _estimate_size(lines) -> int:
        """Estimate the size of lines in bytes."""
        return sum(len(line.encode("utf-8")) for line in lines)

    def shouldRollover(self, record) -> bool:
        """
        Determine if rollover should occur.

        Check if the current file size + new record would exceed MAX_BYTES.
        """
        if self.stream is None:
            return False

        try:
            if (
                self.stream.tell() + len(self.format(record).encode("utf-8"))
                >= self.MAX_BYTES
            ):
                return True
        except OSError:
            pass

        return False


def setup_flask_logging(
    app,
    log_dir: str = "logs",
    log_filename: str = "flask_app.log",
    enable_console: bool = True,
    level: int = logging.INFO,
) -> None:
    """
    Setup non-blocking logging for Flask application.

    Uses QueueHandler/QueueListener for non-blocking file writes to prevent
    Flask request handling from being blocked by I/O operations.

    Args:
        app: Flask application instance
        log_dir: Directory to store log files (relative to project root)
        log_filename: Name of the log file
        enable_console: Whether to also log to console
        level: Logging level (default: logging.INFO)
    """
    # Determine absolute log directory path based on project root
    # backend/app or backend/utils -> backend -> project_root
    if log_dir.startswith("/"):
        # Already absolute path
        abs_log_dir = log_dir
    else:
        # Get the project root (parent of backend directory)
        backend_dir = os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )  # backend/
        project_root = os.path.dirname(backend_dir)  # project root
        abs_log_dir = os.path.join(project_root, log_dir)

    # Create logs directory if it doesn't exist
    os.makedirs(abs_log_dir, exist_ok=True)

    log_path = os.path.join(abs_log_dir, log_filename)

    # Create formatter for detailed logging
    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Setup file handler with size-based rotation
    file_handler = MaxSizeRotatingFileHandler(
        filename=log_path,
        maxBytes=MaxSizeRotatingFileHandler.MAX_BYTES,
        backupCount=0,  # We don't want backup files, just truncate
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(level)

    # Setup queue and listener for non-blocking logging
    log_queue = Queue()
    queue_handler = logging.handlers.QueueHandler(log_queue)
    queue_listener = logging.handlers.QueueListener(
        log_queue, file_handler, respect_handler_level=True
    )

    # Start the listener in a daemon thread
    queue_listener.start()

    # Configure Flask app logger
    app.logger.setLevel(level)
    app.logger.addHandler(queue_handler)
    app.logger.propagate = False

    # Optionally add console handler for console output
    if enable_console:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(level)
        app.logger.addHandler(console_handler)

    # Setup request/response logging by adding a before/after request handler
    setup_request_response_logging(app)

    app.logger.info("Logging initialized successfully")


def setup_request_response_logging(app) -> None:
    """
    Setup Flask request/response logging.

    Logs incoming requests and responses with relevant details.
    """

    @app.before_request
    def log_request():
        """Log incoming request details."""
        from flask import request

        app.logger.info(
            f"REQUEST: {request.method} {request.path} | "
            f"Remote: {request.remote_addr} | "
            f"User-Agent: {request.user_agent}"
        )

    @app.after_request
    def log_response(response):
        """Log response details."""
        from flask import request

        app.logger.info(
            f"RESPONSE: {request.method} {request.path} | "
            f"Status: {response.status_code} | "
            f"Size: {len(response.get_data())} bytes"
        )

        return response

    @app.errorhandler(Exception)
    def log_error(error):
        """Log unhandled errors."""
        from flask import request, has_request_context

        if has_request_context():
            app.logger.error(
                f"ERROR: {request.method} {request.path} | "
                f"Exception: {type(error).__name__} | "
                f"Message: {str(error)}",
                exc_info=True,
            )
        else:
            app.logger.error(
                f"ERROR: Exception occurred (no request context) | "
                f"Exception: {type(error).__name__} | "
                f"Message: {str(error)}",
                exc_info=True,
            )

        # Return a 500 error response only if in request context
        if has_request_context():
            return {"error": "Internal server error"}, 500
        raise error


def setup_deployment_logging(
    log_filename: str = "deployment.log",
    log_dir: str = "logs",
    level: int = logging.INFO,
) -> logging.Logger:
    """
    Setup logging for deployment script.

    Creates a logger for the deployment process with file and console output.

    Args:
        log_filename: Name of the deployment log file
        log_dir: Directory to store log files (relative to project root)
        level: Logging level (default: logging.INFO)

    Returns:
        logging.Logger: Configured logger instance
    """
    # Determine absolute log directory path based on project root
    if log_dir.startswith("/"):
        # Already absolute path
        abs_log_dir = log_dir
    else:
        # Get the project root from the current working directory
        # The deployment script will be run from project root or backend directory
        cwd = os.getcwd()
        if os.path.exists(os.path.join(cwd, "backend")):
            # Running from project root
            abs_log_dir = os.path.join(cwd, log_dir)
        elif os.path.exists(os.path.join(cwd, "app")):
            # Running from backend directory
            project_root = os.path.dirname(cwd)
            abs_log_dir = os.path.join(project_root, log_dir)
        else:
            # Fallback: use current directory
            abs_log_dir = os.path.join(cwd, log_dir)

    # Create logs directory if it doesn't exist
    os.makedirs(abs_log_dir, exist_ok=True)

    log_path = os.path.join(abs_log_dir, log_filename)

    # Create logger
    logger = logging.getLogger("deployment")
    logger.setLevel(level)
    logger.propagate = False

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()

    # Create formatter
    formatter = logging.Formatter(
        fmt="[%(asctime)s] [DEPLOY] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # File handler with size-based rotation
    file_handler = MaxSizeRotatingFileHandler(
        filename=log_path, maxBytes=MaxSizeRotatingFileHandler.MAX_BYTES, backupCount=0
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(level)
    logger.addHandler(file_handler)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(level)
    logger.addHandler(console_handler)

    return logger
