# Database Migration System

This document explains how the automatic database migration system works and how to add new migrations.

## Overview

The migration system automatically:
- ✓ Backs up the database before running migrations
- ✓ Tracks which migrations have been applied
- ✓ Runs pending migrations in order
- ✓ Rolls back on failure
- ✓ Works with SQLite (extensible to other databases)

## How It Works

### Automatic Execution

Migrations run automatically when:
- Starting the development server with `python run.py`
- Deploying with `python deploy.py`
- Running production servers (Gunicorn, Waitress, etc.)

### Migration Tracking

Migrations are tracked in a `schema_migrations` table in the database:
- Each migration is recorded when successfully applied
- Migrations are never run twice
- Failed migrations do not get recorded

### Backup System

Before running migrations:
- The entire database is backed up to `backend/migrations_data/`
- Backup filename format: `backup_<db_name>_<timestamp>`
- Backups are kept indefinitely (clean up manually if needed)

## Adding New Migrations

### Step 1: Add Migration Function

Edit `backend/migrations.py` and add a new migration function:

```python
def _migration_002_your_migration_name(self, conn: sqlite3.Connection) -> None:
    """Description of what this migration does.

    Args:
        conn: Database connection
    """
    cursor = conn.cursor()
    
    # Your migration code here
    cursor.execute("""
        ALTER TABLE parts
        ADD COLUMN new_field VARCHAR(100)
    """)
    
    print("[MIGRATION] ✓ new_field column added successfully")
```

### Step 2: Register Migration

In the same file, add your migration to the `_get_pending_migrations` method:

```python
def _get_pending_migrations(self) -> List[Tuple[str, callable]]:
    """Get list of migrations that need to be run."""
    applied = self._get_applied_migrations()
    pending = []

    # Define migrations here - ADD YOUR NEW MIGRATION
    migrations = [
        ("001_add_material_thickness", self._migration_001_add_material_thickness),
        ("002_your_migration_name", self._migration_002_your_migration_name),  # NEW
    ]

    for name, func in migrations:
        if name not in applied:
            pending.append((name, func))

    return pending
```

### Migration Naming Convention

- Use sequential numbering: `001_`, `002_`, `003_`, etc.
- Use descriptive snake_case names: `add_column_name`, `create_table_name`
- Example: `003_add_part_categories`

### Best Practices

1. **Always check if changes already exist** before applying them:
   ```python
   cursor.execute("PRAGMA table_info(parts)")
   columns = [row[1] for row in cursor.fetchall()]
   if "new_column" not in columns:
       cursor.execute("ALTER TABLE parts ADD COLUMN new_column TEXT")
   ```

2. **Use descriptive migration names** that explain what the migration does

3. **Test migrations** on a copy of your database first

4. **Keep migrations simple** - one logical change per migration

5. **Never modify existing migrations** once they've been deployed

## Manual Migration Execution

You can also run migrations manually:

```bash
cd backend
uv run python migrations.py
```

This is useful for:
- Testing new migrations
- Applying migrations to a specific database
- Debugging migration issues

## Troubleshooting

### Migration Fails

If a migration fails:
1. Check the error message in the console
2. The database is NOT modified (transaction rolled back)
3. Restore from the backup in `backend/migrations_data/`
4. Fix the migration code and try again

### Restore from Backup

To restore a database from backup:

```bash
# Stop the server first
cd backend

# Copy backup over current database
cp migrations_data/backup_parts_prod.db_20240115_143022 parts_prod.db
```

### Skip a Failed Migration

If you need to skip a migration that has been fixed:

1. Manually mark it as applied in the database:
   ```sql
   INSERT INTO schema_migrations (migration_name) 
   VALUES ('002_failed_migration_name');
   ```

2. The migration won't run again on next startup

## Example: Material Thickness Migration

The first migration (`001_add_material_thickness`) adds the `material_thickness` column:

```python
def _migration_001_add_material_thickness(self, conn: sqlite3.Connection) -> None:
    """Add material_thickness column to parts table."""
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
```

This migration:
- ✓ Checks if the column exists before adding it
- ✓ Prints clear status messages
- ✓ Is idempotent (safe to run multiple times)
- ✓ Uses appropriate data types

## Database Support

Currently supported:
- SQLite (fully tested)

Future support planned:
- PostgreSQL
- MySQL

For non-SQLite databases, migrations are currently skipped with a warning message.
