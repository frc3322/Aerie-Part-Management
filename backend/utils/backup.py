"""Database backup utility for the Part Management System.

Provides automated daily backups of the SQLite database with configurable
retention policy (default: keep last 10 days).
"""

import os
import sqlite3
import threading
from datetime import datetime, timedelta
from typing import Optional
import logging
from urllib.parse import quote

# Default configuration
DEFAULT_BACKUP_DIR = "backups"
DEFAULT_RETENTION_DAYS = 10
BACKUP_INTERVAL_HOURS = 24


def get_logger():
    """Get or create a logger for backup operations."""
    return logging.getLogger("backup")


def get_backup_directory(base_dir: str, backup_dir: Optional[str] = None) -> str:
    """Get the absolute path to the backup directory.

    Args:
        base_dir: The backend directory path
        backup_dir: Custom backup directory path (relative or absolute)

    Returns:
        str: Absolute path to the backup directory
    """
    if backup_dir is None:
        backup_dir = DEFAULT_BACKUP_DIR

    if os.path.isabs(backup_dir):
        return backup_dir

    return os.path.join(base_dir, backup_dir)


def extract_db_path_from_url(database_url: str) -> Optional[str]:
    """Extract the file path from a SQLite database URL.

    Args:
        database_url: SQLAlchemy database URL (e.g., sqlite:///parts.db)

    Returns:
        Optional[str]: Absolute path to the database file, or None if not SQLite
    """
    if not database_url.startswith("sqlite:///"):
        return None

    # Handle both sqlite:///relative/path and sqlite:////absolute/path
    path = database_url.replace("sqlite:///", "", 1)

    # If it's a relative path (doesn't start with / on Unix or drive letter on Windows)
    if not os.path.isabs(path):
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(backend_dir, path)

    return path


def create_backup(database_url: str, backup_dir: str) -> Optional[str]:
    """Create a backup of the SQLite database.

    Args:
        database_url: SQLAlchemy database URL
        backup_dir: Directory to store backups

    Returns:
        Optional[str]: Path to the backup file, or None if backup failed
    """
    logger = get_logger()

    db_path = extract_db_path_from_url(database_url)
    if db_path is None:
        logger.warning("Backup skipped: Not a SQLite database")
        return None

    if not os.path.exists(db_path):
        logger.warning(f"Backup skipped: Database file not found at {db_path}")
        return None

    # Ensure backup directory exists
    os.makedirs(backup_dir, exist_ok=True)

    # Generate backup filename with timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    db_filename = os.path.basename(db_path)
    backup_filename = f"{db_filename}.{timestamp}.bak"
    backup_path = os.path.join(backup_dir, backup_filename)

    source_conn = None
    target_conn = None
    try:
        # Use SQLite's backup API for atomic backup (handles WAL mode correctly)
        # Open source connection in read-only mode using URI
        source_uri = f"file:{quote(db_path, safe='/')}?mode=ro"
        source_conn = sqlite3.connect(source_uri, uri=True)

        # Open target connection for the backup file
        target_conn = sqlite3.connect(backup_path)

        # Perform atomic backup including WAL/SHM changes
        source_conn.backup(target_conn)

        # Close connections before returning
        target_conn.close()
        target_conn = None
        source_conn.close()
        source_conn = None

        logger.info(f"Backup created: {backup_path}")
        return backup_path
    except Exception as e:
        logger.error(f"Failed to create backup: {e}")
        # Clean up partial backup file on failure
        if target_conn is not None:
            try:
                target_conn.close()
            except Exception:
                pass
        if source_conn is not None:
            try:
                source_conn.close()
            except Exception:
                pass
        if os.path.exists(backup_path):
            try:
                os.remove(backup_path)
            except OSError:
                pass
        return None


def cleanup_old_backups(
    backup_dir: str, retention_days: int = DEFAULT_RETENTION_DAYS
) -> int:
    """Remove backups older than the retention period.

    Args:
        backup_dir: Directory containing backups
        retention_days: Number of days to keep backups (default: 10)

    Returns:
        int: Number of backups removed
    """
    logger = get_logger()

    if not os.path.exists(backup_dir):
        return 0

    cutoff_date = datetime.now() - timedelta(days=retention_days)
    removed_count = 0

    try:
        # Get all backup files
        backup_files = []
        for filename in os.listdir(backup_dir):
            if filename.endswith(".bak"):
                filepath = os.path.join(backup_dir, filename)
                backup_files.append((filepath, os.path.getmtime(filepath)))

        # Sort by modification time (oldest first)
        backup_files.sort(key=lambda x: x[1])

        # Remove files older than retention period
        for filepath, mtime in backup_files:
            file_date = datetime.fromtimestamp(mtime)
            if file_date < cutoff_date:
                try:
                    os.remove(filepath)
                    logger.info(f"Removed old backup: {filepath}")
                    removed_count += 1
                except (OSError, IOError) as e:
                    logger.error(f"Failed to remove backup {filepath}: {e}")

        logger.info(f"Cleanup complete: removed {removed_count} old backups")
    except (OSError, IOError) as e:
        logger.error(f"Error during backup cleanup: {e}")

    return removed_count


def get_backup_status(backup_dir: str) -> dict:
    """Get the current status of backups.

    Args:
        backup_dir: Directory containing backups

    Returns:
        dict: Status information including count, total size, and list of backups
    """
    if not os.path.exists(backup_dir):
        return {"exists": False, "count": 0, "total_size": 0, "backups": []}

    backups = []
    total_size = 0

    try:
        for filename in os.listdir(backup_dir):
            if filename.endswith(".bak"):
                filepath = os.path.join(backup_dir, filename)
                stat = os.stat(filepath)
                backups.append(
                    {
                        "filename": filename,
                        "path": filepath,
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    }
                )
                total_size += stat.st_size

        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x["created"], reverse=True)
    except (OSError, IOError):
        pass

    return {
        "exists": True,
        "count": len(backups),
        "total_size": total_size,
        "backups": backups,
    }


class BackupScheduler:
    """Background scheduler for automated database backups.

    Runs backups daily at a specified time and cleans up old backups
    according to the retention policy.
    """

    def __init__(
        self,
        database_url: str,
        backup_dir: str,
        retention_days: int = DEFAULT_RETENTION_DAYS,
        interval_hours: float = BACKUP_INTERVAL_HOURS,
    ):
        """Initialize the backup scheduler.

        Args:
            database_url: SQLAlchemy database URL
            backup_dir: Directory to store backups
            retention_days: Number of days to keep backups
            interval_hours: Hours between backups (default: 24)
        """
        self.database_url = database_url
        self.backup_dir = backup_dir
        self.retention_days = retention_days
        self.interval_hours = interval_hours
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._last_backup: Optional[datetime] = None
        self._lock = threading.Lock()

    def _backup_loop(self):
        """Main backup loop running in background thread."""
        logger = get_logger()
        logger.info("Backup scheduler started")

        # Create initial backup on startup
        self._perform_backup()

        while not self._stop_event.is_set():
            # Wait for the interval or until stopped
            if self._stop_event.wait(timeout=self.interval_hours * 3600):
                break

            self._perform_backup()

        logger.info("Backup scheduler stopped")

    def _perform_backup(self):
        """Perform a single backup operation."""
        logger = get_logger()

        with self._lock:
            try:
                backup_path = create_backup(self.database_url, self.backup_dir)
                if backup_path:
                    self._last_backup = datetime.now()
                    # Cleanup old backups after each backup
                    cleanup_old_backups(self.backup_dir, self.retention_days)
            except Exception as e:
                logger.error(f"Backup operation failed: {e}")

    def start(self):
        """Start the backup scheduler in a background thread."""
        if self._thread is not None and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._backup_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop the backup scheduler."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)

    def force_backup(self) -> Optional[str]:
        """Force an immediate backup.

        Returns:
            Optional[str]: Path to the backup file, or None if failed
        """
        with self._lock:
            return create_backup(self.database_url, self.backup_dir)

    @property
    def is_running(self) -> bool:
        """Check if the scheduler is running."""
        return self._thread is not None and self._thread.is_alive()

    @property
    def last_backup_time(self) -> Optional[datetime]:
        """Get the time of the last successful backup."""
        return self._last_backup


# Global scheduler instance
_scheduler: Optional[BackupScheduler] = None


def initialize_backup_scheduler(
    database_url: str,
    backup_dir: Optional[str] = None,
    retention_days: int = DEFAULT_RETENTION_DAYS,
) -> BackupScheduler:
    """Initialize and start the global backup scheduler.

    Args:
        database_url: SQLAlchemy database URL
        backup_dir: Directory to store backups (default: backups/ in backend dir)
        retention_days: Number of days to keep backups

    Returns:
        BackupScheduler: The initialized scheduler instance
    """
    global _scheduler

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if backup_dir is None:
        backup_dir = get_backup_directory(backend_dir)

    _scheduler = BackupScheduler(
        database_url=database_url, backup_dir=backup_dir, retention_days=retention_days
    )
    _scheduler.start()

    return _scheduler


def get_backup_scheduler() -> Optional[BackupScheduler]:
    """Get the global backup scheduler instance."""
    return _scheduler


def shutdown_backup_scheduler():
    """Stop and cleanup the global backup scheduler."""
    global _scheduler

    if _scheduler is not None:
        _scheduler.stop()
        _scheduler = None
