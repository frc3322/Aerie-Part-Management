# Part Management System - Database Models

## Overview

The database layer uses SQLAlchemy ORM to provide a Pythonic interface to the underlying database. The system is designed with SQLite for development and can easily scale to PostgreSQL or MySQL for production.

## Core Model: Part

The `Part` model represents an engineering part throughout its lifecycle from design to completion.

### Schema Definition

```python
class Part(db.Model):
    """Represents a part in the manufacturing workflow."""

    __tablename__ = 'parts'

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=True)
    name = db.Column(db.String(200), nullable=True)
    subsystem = db.Column(db.String(100), nullable=True)
    assigned = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='Pending')
    notes = db.Column(db.Text, nullable=True)
    file = db.Column(db.String(200), nullable=True)
    onshape_url = db.Column(db.String(500), nullable=True)
    claimed_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    category = db.Column(db.String(20), nullable=False, default='review', index=True)
```

### Field Specifications

#### Primary Key
- **id**: Auto-incrementing integer primary key
- **Type**: `Integer`
- **Constraints**: Primary key, auto-increment
- **Usage**: Unique identifier for all operations

#### Core Attributes

| Field | Type | Length | Nullable | Default | Description |
|-------|------|--------|----------|---------|-------------|
| `type` | String | 50 | Yes | None | Part type: 'cnc' or 'hand' |
| `name` | String | 200 | Yes | None | Part name/description |
| `subsystem` | String | 100 | Yes | None | System subsystem |
| `assigned` | String | 100 | Yes | None | Assigned team member |
| `status` | String | 50 | No | 'Pending' | Current workflow status |
| `notes` | Text | - | Yes | None | Additional notes/comments |
| `file` | String | 200 | Yes | None | Associated file name |
| `onshape_url` | String | 500 | Yes | None | Onshape URL |
| `category` | String | 20 | No | 'review' | Workflow category |

#### Metadata Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `claimed_date` | DateTime | None | When part was assigned |
| `created_at` | DateTime | UTC now | Record creation time |
| `updated_at` | DateTime | UTC now | Last modification time |

## Database Indexes

### Performance Indexes

```sql
-- Category filtering (most frequent operation)
CREATE INDEX idx_parts_category ON parts(category);

-- Status queries
CREATE INDEX idx_parts_status ON parts(status);

-- Assignment queries
CREATE INDEX idx_parts_assigned ON parts(assigned);

-- Search optimization
CREATE INDEX idx_parts_name ON parts(name);
CREATE INDEX idx_parts_subsystem ON parts(subsystem);
CREATE INDEX idx_parts_notes ON parts(notes);

-- Temporal queries
CREATE INDEX idx_parts_created_at ON parts(created_at);
CREATE INDEX idx_parts_updated_at ON parts(updated_at);
CREATE INDEX idx_parts_claimed_date ON parts(claimed_date);
```

### Index Strategy Rationale

1. **Category Index**: Most frequent filter operation in UI
2. **Search Indexes**: Optimize text search across multiple fields
3. **Temporal Indexes**: Support time-based queries and sorting
4. **Status/Assignment**: Common workflow filtering

## Model Methods

### Instance Methods

#### `to_dict() -> dict`
Converts the model instance to a dictionary representation for API responses.

```python
def to_dict(self) -> dict:
    """Convert part to dictionary representation."""
    return {
        'id': self.id,
        'type': self.type,
        'name': self.name,
        'subsystem': self.subsystem,
        'assigned': self.assigned,
        'status': self.status,
        'notes': self.notes,
        'file': self.file,
        'onshapeUrl': self.onshape_url,  # camelCase for API compatibility
        'claimedDate': self.claimed_date.isoformat() if self.claimed_date else None,
        'createdAt': self.created_at.isoformat(),
        'updatedAt': self.updated_at.isoformat(),
        'category': self.category
    }
```

#### `update_from_dict(data: dict) -> None`
Updates model attributes from a dictionary, with validation.

```python
def update_from_dict(self, data: dict) -> None:
    """Update part attributes from dictionary."""
    allowed_fields = {
        'type', 'name', 'subsystem', 'assigned', 'status',
        'notes', 'file', 'onshape_url', 'claimed_date', 'category'
    }

    for key, value in data.items():
        if key in allowed_fields and hasattr(self, key):
            setattr(self, key, value)

    self.updated_at = datetime.utcnow()
```

### Class Methods

#### `get_by_category(category: str)`
Retrieve all parts in a specific category.

```python
@classmethod
def get_by_category(cls, category: str):
    """Get all parts in a specific category."""
    return cls.query.filter_by(category=category)
```

#### `search_parts(query: str, category: str = None)`
Perform text search across multiple fields.

```python
@classmethod
def search_parts(cls, query: str, category: str = None):
    """Search parts by name, notes, or subsystem."""
    search_filter = db.or_(
        cls.name.ilike(f'%{query}%'),
        cls.notes.ilike(f'%{query}%'),
        cls.subsystem.ilike(f'%{query}%'),
        cls.assigned.ilike(f'%{query}%')
    )

    if category:
        return cls.query.filter(search_filter, cls.category == category)
    return cls.query.filter(search_filter)
```

## Data Relationships

### Current Design
The system uses a single `Part` table with no foreign key relationships. This design choice provides:

- **Simplicity**: Easy to understand and maintain
- **Performance**: No JOIN operations required
- **Flexibility**: Easy schema evolution
- **Scalability**: Single table can handle large datasets

### Potential Future Relationships

If the system grows, consider these relationships:

```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True)
    email = db.Column(db.String(200), unique=True)
    # Relationship to parts

class Subsystem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True)
    description = db.Column(db.Text)
    # Relationship to parts
```

## Data Integrity Constraints

### Database-Level Constraints

```sql
-- Status must be one of valid values
CHECK (status IN ('Pending', 'Reviewed', 'Approved', 'In Progress', 'Completed', 'Cancelled'))

-- Category must be valid
CHECK (category IN ('review', 'cnc', 'hand', 'completed'))

-- Type must be valid if provided
CHECK (type IS NULL OR type IN ('cnc', 'hand'))

-- URL format validation (if supported by database)
CHECK (onshape_url IS NULL OR onshape_url LIKE 'http%://%')
```

### Application-Level Validation

Additional validation is performed in the application layer:

- **String Length Limits**: Enforced in model definitions
- **Business Rules**: Category transition validation
- **Cross-Field Validation**: Type and category consistency
- **URL Format**: Regex validation for external links

## Data Migration Strategy

### Schema Evolution

For database schema changes:

1. **Development**: Drop and recreate tables (data loss acceptable)
2. **Production**: Use migration tools like Alembic

```bash
# Initialize Alembic
flask db init

# Create migration
flask db migrate -m "Add new field to parts table"

# Apply migration
flask db upgrade
```

### Data Migration Examples

```python
def upgrade():
    # Add new column
    op.add_column('parts', sa.Column('priority', sa.String(20), nullable=True))

    # Update existing data
    op.execute("UPDATE parts SET priority = 'Medium' WHERE priority IS NULL")

    # Make column non-nullable
    op.alter_column('parts', 'priority', nullable=False)

def downgrade():
    op.drop_column('parts', 'priority')
```

## Query Optimization

### Common Query Patterns

#### 1. Category Filtering
```python
# Optimized with index
Part.query.filter_by(category='review').all()
```

#### 2. Search Queries
```python
# Uses multiple indexes
Part.query.filter(
    db.or_(
        Part.name.ilike('%gear%'),
        Part.notes.ilike('%gear%')
    )
).all()
```

#### 3. Paginated Results
```python
# Efficient pagination
Part.query.order_by(Part.created_at.desc())\
         .limit(50)\
         .offset(0)\
         .all()
```

#### 4. Complex Filtering
```python
# Multi-condition queries
Part.query.filter_by(category='cnc')\
         .filter(Part.assigned.isnot(None))\
         .filter(Part.status == 'In Progress')\
         .all()
```

### Performance Considerations

#### Index Usage Analysis
```sql
-- Check index usage
EXPLAIN QUERY PLAN
SELECT * FROM parts WHERE category = 'review';

-- Check search performance
EXPLAIN QUERY PLAN
SELECT * FROM parts WHERE name LIKE '%gear%';
```

#### Query Optimization Techniques

1. **Selective Indexing**: Only index frequently queried columns
2. **Composite Indexes**: For multi-column WHERE clauses
3. **Partial Indexes**: Index subsets of data
4. **Query Rewriting**: Optimize complex queries

## Data Access Patterns

### Repository Pattern Implementation

While not formally implemented, the model provides repository-like methods:

```python
# Data access layer
class PartRepository:
    @staticmethod
    def get_by_id(part_id):
        return Part.query.get(part_id)

    @staticmethod
    def get_by_category(category):
        return Part.get_by_category(category)

    @staticmethod
    def search(query, category=None):
        return Part.search_parts(query, category)

    @staticmethod
    def create(data):
        part = Part()
        part.update_from_dict(data)
        db.session.add(part)
        db.session.commit()
        return part
```

### Unit of Work Pattern

Database operations use SQLAlchemy's session management:

```python
# Transaction scope
with db.session.begin():
    part = Part.query.get(part_id)
    part.status = 'Completed'
    part.category = 'completed'
# Automatic commit on success, rollback on error
```

## Sample Data

### Development Seed Data

```python
def init_sample_data():
    """Initialize database with sample parts."""
    sample_parts = [
        {
            'type': 'cnc',
            'name': 'Drive Gear',
            'status': 'Pending',
            'notes': 'Check tooth profile',
            'file': 'gear.stl',
            'onshape_url': '#',
            'category': 'review'
        },
        # ... more sample data
    ]

    for part_data in sample_parts:
        part = Part(**part_data)
        db.session.add(part)

    db.session.commit()
```

### Data Characteristics

- **Volume**: Designed for hundreds to thousands of parts
- **Growth**: Linear growth with project complexity
- **Access Patterns**: Read-heavy with frequent category filtering
- **Update Frequency**: Moderate, tied to workflow progression

## Backup and Recovery

### SQLite Backup
```python
import shutil

def backup_database():
    """Create database backup."""
    shutil.copy('parts.db', f'parts_backup_{datetime.now().isoformat()}.db')
```

### Production Backup (PostgreSQL)
```sql
-- Create backup
pg_dump -U username -h hostname database_name > backup.sql

-- Restore backup
psql -U username -h hostname database_name < backup.sql
```

## Monitoring and Maintenance

### Database Health Checks

```python
def check_database_health():
    """Verify database connectivity and integrity."""
    try:
        # Test connection
        db.session.execute('SELECT 1')

        # Check table existence
        inspector = db.inspect(db.engine)
        tables = inspector.get_table_names()

        if 'parts' not in tables:
            return False, "Parts table missing"

        return True, "Database healthy"

    except Exception as e:
        return False, str(e)
```

### Performance Monitoring

```python
def get_query_stats():
    """Get query performance statistics."""
    # Enable SQLAlchemy query logging
    import logging
    logging.basicConfig()
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

This comprehensive model design provides a solid foundation for the part management system, balancing simplicity, performance, and maintainability.
