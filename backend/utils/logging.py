"""Logging configuration for Flask application and deployment.

Provides non-blocking logging with file rotation based on size (2GB limit).
Automatically truncates oldest log entries when file exceeds 2GB.
"""

import logging
import logging.handlers
import os
from queue import Queue
import atexit

# Global registry to track queue listeners by process ID
_queue_listeners = {}


def parse_log_level(level: str) -> int:
    """Convert string log level to logging level integer.

    Args:
        level: Log level as string (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        int: Logging level integer, defaults to WARNING if invalid
    """
    level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    return level_map.get(level.upper(), logging.WARNING)


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
    level: str = "WARNING",
) -> None:
    """
    Setup non-blocking logging for Flask application.

    Uses QueueHandler/QueueListener for non-blocking I/O. Only creates one
    queue listener per process to prevent duplicates in multiprocessing scenarios.

    Args:
        app: Flask application instance
        log_dir: Directory to store log files (relative to project root)
        log_filename: Name of the log file
        enable_console: Whether to also log to console
        level: Logging level as string (DEBUG, INFO, WARNING, ERROR) or int. Default: WARNING
               WARNING: Only log startup and errors (not requests/responses)
               INFO: Log all requests, responses, and errors
    """
    # Convert string level to logging level if needed
    if isinstance(level, str):
        numeric_level = parse_log_level(level)
        app.logger._config_log_level = (
            level  # Store original string for request logging
        )
    else:
        numeric_level = level
        app.logger._config_log_level = logging.getLevelName(level)
    import os as os_module

    # Get current process ID
    pid = os_module.getpid()

    # Check if we already have a queue listener for this process
    global _queue_listeners

    # Always clear any existing handlers to prevent duplicates
    for handler in app.logger.handlers[:]:
        handler.close()
        app.logger.removeHandler(handler)

    # Determine absolute log directory path based on project root
    if log_dir.startswith("/"):
        abs_log_dir = log_dir
    else:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        project_root = os.path.dirname(backend_dir)
        abs_log_dir = os.path.join(project_root, log_dir)

    os.makedirs(abs_log_dir, exist_ok=True)
    log_path = os.path.join(abs_log_dir, log_filename)

    # Create formatter
    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(name)s] [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Check if we need to create a new queue listener for this process
    if pid not in _queue_listeners:
        # Setup file handler with size-based rotation
        # Use numeric_level for file handler
        file_handler = MaxSizeRotatingFileHandler(
            filename=log_path,
            maxBytes=MaxSizeRotatingFileHandler.MAX_BYTES,
            backupCount=0,
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(numeric_level)

        # Create queue and listener for non-blocking logging
        log_queue = Queue()
        queue_listener = logging.handlers.QueueListener(
            log_queue, file_handler, respect_handler_level=True
        )

        # Start the listener
        queue_listener.start()

        # Store in global registry
        _queue_listeners[pid] = {
            "listener": queue_listener,
            "queue": log_queue,
            "formatter": formatter,
            "level": numeric_level,
        }

        # Register cleanup on exit
        atexit.register(_cleanup_listener, pid)

    # Get the queue for this process
    log_queue = _queue_listeners[pid]["queue"]
    formatter = _queue_listeners[pid]["formatter"]

    # Setup queue handler (non-blocking)
    queue_handler = logging.handlers.QueueHandler(log_queue)

    # Configure Flask app logger
    # Set logger to DEBUG to allow all messages through
    # Handlers will filter based on their own levels
    app.logger.setLevel(logging.DEBUG)
    app.logger.addHandler(queue_handler)
    app.logger.propagate = False

    # Optionally add console handler
    # Console prints ALL messages, while file respects configured level
    if enable_console:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        # Console handler prints all messages (DEBUG and above)
        console_handler.setLevel(logging.DEBUG)
        app.logger.addHandler(console_handler)

    # Suppress werkzeug logger to avoid duplicate messages
    logging.getLogger("werkzeug").propagate = False
    logging.getLogger("werkzeug").handlers = []

    # Setup request/response logging with config level info
    setup_request_response_logging(app, numeric_level)
    # Note: Request/response logging will:
    # - Always print to console (all levels)
    # - Only save to file if log level is INFO or DEBUG

    # Log successful initialization
    app.logger.info("Logging initialized successfully")


def _cleanup_listener(pid):
    """Clean up queue listener on process exit."""
    global _queue_listeners
    if pid in _queue_listeners:
        listener = _queue_listeners[pid]["listener"]
        listener.stop()
        del _queue_listeners[pid]


def setup_request_response_logging(app, log_level: int = logging.INFO) -> None:
    """
    Setup Flask request/response logging.

    Logs incoming requests and responses with relevant details.
    Only registers handlers once to prevent duplicates in multiprocessing.

    Args:
        app: Flask application instance
        log_level: Logging level (default: logging.INFO)
                  - All requests/responses are ALWAYS printed to console
                  - If INFO or DEBUG: also save requests/responses to file
                  - If WARNING or higher: only print to console, don't save to file
    """

    # Check if request/response handlers are already registered
    if hasattr(app, "_request_logging_configured"):
        return

    app._request_logging_configured = True

    @app.before_request
    def log_request():
        """Log incoming request details."""
        from flask import request
        import sys

        request_msg = (
            f"REQUEST: {request.method} {request.path} | "
            f"Remote: {request.remote_addr} | "
            f"User-Agent: {request.user_agent}"
        )

        # Always print to console
        print(request_msg, file=sys.stdout)

        # Only save to file if log level is INFO or DEBUG
        if log_level <= logging.INFO:
            app.logger.info(request_msg)

    @app.after_request
    def log_response(response):
        """Log response details."""
        from flask import request
        import sys

        # Try to get response size, but handle passthrough mode (e.g., static files)
        try:
            size = (
                response.content_length
                if response.content_length is not None
                else "unknown"
            )
        except Exception:
            size = "unknown"

        response_msg = (
            f"RESPONSE: {request.method} {request.path} | "
            f"Status: {response.status_code} | "
            f"Size: {size} bytes"
            if size != "unknown"
            else f"RESPONSE: {request.method} {request.path} | "
            f"Status: {response.status_code}"
        )

        # Always print to console
        print(response_msg, file=sys.stdout)

        # Only save to file if log level is INFO or DEBUG
        if log_level <= logging.INFO:
            app.logger.info(response_msg)

        return response

    @app.errorhandler(Exception)
    def log_error(error):
        """Log unhandled errors."""
        from flask import request, has_request_context
        import sys

        if has_request_context():
            error_msg = (
                f"ERROR: {request.method} {request.path} | "
                f"Exception: {type(error).__name__} | "
                f"Message: {str(error)}"
            )
            # Always print to console
            print(error_msg, file=sys.stderr)
            # Always save to file
            app.logger.error(error_msg, exc_info=True)
        else:
            error_msg = (
                f"ERROR: Exception occurred (no request context) | "
                f"Exception: {type(error).__name__} | "
                f"Message: {str(error)}"
            )
            # Always print to console
            print(error_msg, file=sys.stderr)
            # Always save to file
            app.logger.error(error_msg, exc_info=True)

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
        filename=log_path,
        maxBytes=MaxSizeRotatingFileHandler.MAX_BYTES,
        backupCount=0,
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
