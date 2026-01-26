"""Database migration utility for the Part Management System.

This module provides automatic database migrations with backup functionality.
Migrations are tracked in a migrations table to prevent duplicate runs.
"""

import os
import sqlite3
import shutil
from datetime import datetime
from typing import List, Tuple, Optional, Callable
from pathlib import Path


class MigrationError(Exception):
    """Exception raised when a migration fails."""
    pass


class DatabaseMigrator:
    """Handles database migrations with automatic backup and rollback support."""

    def __init__(self, db_path: str, migrations_dir: Optional[str] = None):
        """Initialize the migrator.

        Args:
            db_path: Path to the SQLite database file
            migrations_dir: Path to migrations directory (defaults to ./migrations_data)
        """
        self.db_path = db_path
        self.migrations_dir = migrations_dir or os.path.join(
            os.path.dirname(__file__), "migrations_data"
        )
        os.makedirs(self.migrations_dir, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection.

        Returns:
            sqlite3.Connection: Database connection
        """
        return sqlite3.connect(self.db_path)

    def _ensure_migrations_table(self) -> None:
        """Create migrations tracking table if it doesn't exist."""
        conn = self._get_connection()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    migration_name TEXT NOT NULL UNIQUE,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
        finally:
            conn.close()

    def _get_applied_migrations(self) -> List[str]:
        """Get list of already applied migrations.

        Returns:
            List[str]: List of migration names that have been applied
        """
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                "SELECT migration_name FROM schema_migrations ORDER BY id"
            )
            return [row[0] for row in cursor.fetchall()]
        finally:
            conn.close()

    def _record_migration(self, migration_name: str) -> None:
        """Record that a migration has been applied.

        Args:
            migration_name: Name of the migration to record
        """
        conn = self._get_connection()
        try:
            conn.execute(
                "INSERT INTO schema_migrations (migration_name) VALUES (?)",
                (migration_name,)
            )
            conn.commit()
        finally:
            conn.close()

    def backup_database(self) -> str:
        """Create a backup of the database.

        Returns:
            str: Path to the backup file

        Raises:
            MigrationError: If backup fails
        """
        if not os.path.exists(self.db_path):
            print(f"[MIGRATION] Database file not found at {self.db_path}, skipping backup")
            return ""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        db_name = os.path.basename(self.db_path)
        backup_path = os.path.join(
            self.migrations_dir,
            f"backup_{db_name}_{timestamp}"
        )

        try:
            shutil.copy2(self.db_path, backup_path)
            print(f"[MIGRATION] Database backed up to: {backup_path}")
            return backup_path
        except Exception as e:
            raise MigrationError(f"Failed to backup database: {e}")

    def _get_pending_migrations(self) -> List[Tuple[str, Callable]]:
        """Get list of migrations that need to be run.

        Returns:
            List of tuples (migration_name, migration_function)
        """
        applied = self._get_applied_migrations()
        pending = []

        # Define migrations here
        migrations = [
            ("001_add_material_thickness", self._migration_001_add_material_thickness),
        ]

        for name, func in migrations:
            if name not in applied:
                pending.append((name, func))

        return pending

    def _migration_001_add_material_thickness(self, conn: sqlite3.Connection) -> None:
        """Add material_thickness column to parts table.

        Args:
            conn: Database connection
        """
        cursor = conn.cursor()

        # Check if column already exists
        cursor.execute("PRAGMA table_info(parts)")
        columns = [row[1] for row in cursor.fetchall()]

        if "material_thickness" not in columns:
            print("[MIGRATION] Adding material_thickness column to parts table")
            cursor.execute("""
                ALTER TABLE parts
                ADD COLUMN material_thickness VARCHAR(50)
            """)
            print("[MIGRATION] ✓ material_thickness column added successfully")
        else:
            print("[MIGRATION] ✓ material_thickness column already exists, skipping")

    def run_migrations(self, backup: bool = True) -> bool:
        """Run all pending migrations.

        Args:
            backup: Whether to backup database before migrations (default: True)

        Returns:
            bool: True if migrations ran successfully, False otherwise
        """
        if not os.path.exists(self.db_path):
            print("[MIGRATION] Database does not exist yet, will be created on first run")
            return True

        print("[MIGRATION] Checking for pending migrations...")

        # Ensure migrations table exists
        self._ensure_migrations_table()

        # Get pending migrations
        pending = self._get_pending_migrations()

        if not pending:
            print("[MIGRATION] ✓ Database is up to date, no migrations needed")
            return True

        print(f"[MIGRATION] Found {len(pending)} pending migration(s)")

        # Backup database before running migrations
        backup_path = ""
        if backup:
            try:
                backup_path = self.backup_database()
            except MigrationError as e:
                print(f"[MIGRATION] ✗ Backup failed: {e}")
                return False

        # Run each pending migration
        for migration_name, migration_func in pending:
            print(f"[MIGRATION] Running migration: {migration_name}")
            conn = self._get_connection()
            try:
                migration_func(conn)
                conn.commit()
                self._record_migration(migration_name)
                print(f"[MIGRATION] ✓ Migration {migration_name} completed successfully")
            except Exception as e:
                conn.rollback()
                print(f"[MIGRATION] ✗ Migration {migration_name} failed: {e}")
                if backup_path:
                    print(f"[MIGRATION] ! Restore from backup: {backup_path}")
                return False
            finally:
                conn.close()

        print(f"[MIGRATION] ✓ All {len(pending)} migration(s) completed successfully")
        return True


def run_migrations_from_config(database_url: str) -> bool:
    """Run migrations based on database URL from config.

    Args:
        database_url: Database URL from configuration

    Returns:
        bool: True if migrations ran successfully, False otherwise
    """
    # Only handle SQLite for now
    if not database_url.startswith("sqlite:///"):
        print("[MIGRATION] Non-SQLite database detected, skipping automatic migrations")
        print(f"[MIGRATION] Database URL: {database_url}")
        return True

    # Extract path from sqlite:///path/to/db.db
    db_path = database_url.replace("sqlite:///", "")

    migrator = DatabaseMigrator(db_path)
    return migrator.run_migrations(backup=True)


if __name__ == "__main__":
    # Allow running migrations standalone
    from config import Config

    print("Running database migrations...")
    success = run_migrations_from_config(Config.SQLALCHEMY_DATABASE_URI)
    if success:
        print("SUCCESS: Migrations completed")
    else:
        print("FAILED: Migrations failed")
        exit(1)
