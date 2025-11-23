# Part Management System - Backend Utilities

## Overview

The utilities layer provides cross-cutting functionality that supports the core application logic. This includes data validation, sanitization, business rule enforcement, and common helper functions.

## Validation Utilities (`utils/validation.py`)

### Core Validation Functions

#### `validate_part_data(data: Dict[str, Any]) -> Dict[str, Any]`

Validates and sanitizes part data before database operations.

**Purpose**: Ensure data integrity and prevent invalid data from entering the system

**Validation Rules**:
- **Type Checking**: Validates string, number, and date types
- **Length Limits**: Enforces maximum field lengths
- **Required Fields**: Ensures critical fields are present
- **Format Validation**: Checks URLs and other structured data
- **Business Rules**: Validates workflow-specific constraints

**Example Usage**:
```python
from utils.validation import validate_part_data

# Validate incoming data
try:
    clean_data = validate_part_data(request_data)
    # Use clean_data for database operations
except ValidationError as e:
    return jsonify({'error': e.message}), 400
```

**Validation Checks**:

| Field | Type | Max Length | Special Rules |
|-------|------|------------|---------------|
| `type` | string | 50 | Must be 'cnc' or 'hand' |
| `name` | string | 200 | General text |
| `subsystem` | string | 100 | System identifier |
| `assigned` | string | 100 | User name |
| `status` | string | 50 | Workflow status |
| `notes` | text | - | Free text |
| `file` | string | 200 | File path |
| `onshape_url` | string | 500 | Valid URL |
| `category` | string | 20 | Valid category |

#### `validate_category_transition(current_category: str, new_category: str, part_type: str = None) -> bool`

Validates whether a category transition is allowed in the workflow.

**Purpose**: Enforce business rules for part lifecycle management

**Valid Transitions**:
```
review     → cnc, hand, completed
cnc        → completed
hand       → completed
completed  → cnc, hand (revert)
```

**Example Usage**:
```python
if not validate_category_transition('review', 'cnc', 'cnc'):
    raise ValidationError('Invalid category transition')
```

#### `sanitize_search_query(query: str) -> str`

Sanitizes user input for search operations to prevent injection and improve performance.

**Purpose**: Clean and optimize search input for database queries

**Sanitization Steps**:
1. Remove potentially harmful characters
2. Trim whitespace
3. Limit query length
4. Normalize case for case-insensitive search

**Example**:
```python
# Input: "  gear<machine>  "
# Output: "gear machine"
clean_query = sanitize_search_query(raw_query)
```

### Custom Exceptions

#### `ValidationError`

Custom exception for validation failures with field-specific error information.

```python
class ValidationError(Exception):
    def __init__(self, message: str, field: str = None):
        super().__init__(message)
        self.field = field
        self.message = message
```

**Usage**:
```python
raise ValidationError('Name is required', 'name')
```

## Error Handling Patterns

### Validation Error Responses

Standardized error response format for API consistency:

```json
{
  "error": "Validation failed",
  "details": {
    "field": "name",
    "message": "Name exceeds maximum length of 200 characters"
  }
}
```

### Error Handling in Routes

Consistent error handling pattern across all API endpoints:

```python
@parts_bp.route('/<int:part_id>', methods=['PUT'])
def update_part(part_id):
    try:
        part = Part.query.get_or_404(part_id)
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Validate input
        try:
            validated_data = validate_part_data(data)
        except ValidationError as e:
            return jsonify({
                'error': 'Validation failed',
                'details': {'field': e.field, 'message': e.message}
            }), 400

        part.update_from_dict(validated_data)
        db.session.commit()

        return jsonify(part.to_dict())

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Error updating part {part_id}: {str(e)}')
        return jsonify({'error': 'Failed to update part'}), 500
```

## Business Logic Helpers

### Workflow State Management

#### Status Transition Validation

```python
def can_transition_status(current_status: str, new_status: str) -> bool:
    """Validate status transitions."""
    valid_transitions = {
        'Pending': ['Reviewed', 'In Progress', 'Cancelled'],
        'Reviewed': ['Approved', 'Pending'],
        'Approved': ['In Progress'],
        'In Progress': ['Completed', 'Pending'],
        'Completed': [],  # Terminal state
        'Cancelled': []   # Terminal state
    }

    return new_status in valid_transitions.get(current_status, [])
```

#### Assignment Logic

```python
def handle_part_assignment(part: Part, user_name: str) -> None:
    """Handle the business logic of assigning a part."""
    if part.assigned and part.assigned != user_name:
        # Reassignment logic
        current_app.logger.info(f'Reassigning part {part.id} from {part.assigned} to {user_name}')

    part.assigned = user_name
    part.claimed_date = datetime.utcnow()
    part.status = 'In Progress'
```

### Data Transformation Utilities

#### Search Result Formatting

```python
def format_search_results(parts: List[Part], query: str) -> List[Dict]:
    """Format parts with search relevance scoring."""
    results = []
    for part in parts:
        result = part.to_dict()
        result['relevance_score'] = calculate_relevance(part, query)
        results.append(result)

    return sorted(results, key=lambda x: x['relevance_score'], reverse=True)
```

#### Pagination Helpers

```python
def paginate_query(query, page: int = 1, per_page: int = 20):
    """Apply pagination to a SQLAlchemy query."""
    return query.paginate(page=page, per_page=per_page, error_out=False)
```

## Data Sanitization Functions

### Input Cleaning

```python
def clean_string_input(value: str, max_length: int = None) -> str:
    """Clean and validate string input."""
    if not isinstance(value, str):
        raise ValidationError('Value must be a string')

    cleaned = value.strip()

    if max_length and len(cleaned) > max_length:
        raise ValidationError(f'Value exceeds maximum length of {max_length}')

    return cleaned

def clean_url_input(url: str) -> str:
    """Validate and clean URL input."""
    if not url:
        return None

    cleaned = url.strip()

    if not _is_valid_url(cleaned):
        raise ValidationError('Invalid URL format')

    return cleaned
```

### Output Sanitization

```python
def sanitize_part_output(part_dict: Dict) -> Dict:
    """Sanitize part data for API output."""
    # Remove sensitive fields if any
    # Format dates consistently
    # Ensure all fields are serializable

    sanitized = part_dict.copy()

    # Convert datetime objects to ISO format
    for field in ['claimedDate', 'createdAt', 'updatedAt']:
        if field in sanitized and sanitized[field]:
            if isinstance(sanitized[field], datetime):
                sanitized[field] = sanitized[field].isoformat()

    return sanitized
```

## Configuration Helpers

### Environment Detection

```python
def get_environment_config() -> Dict:
    """Get configuration based on environment."""
    env = os.getenv('FLASK_ENV', 'development')

    configs = {
        'development': {
            'debug': True,
            'database_uri': 'sqlite:///parts_dev.db',
            'sample_data': True
        },
        'testing': {
            'debug': False,
            'database_uri': 'sqlite:///parts_test.db',
            'sample_data': False
        },
        'production': {
            'debug': False,
            'database_uri': os.getenv('DATABASE_URL'),
            'sample_data': False
        }
    }

    return configs.get(env, configs['development'])
```

### Database URL Builder

```python
def build_database_url(config: Dict) -> str:
    """Build database URL from configuration."""
    if config.get('database_uri'):
        return config['database_uri']

    # Build from components for production
    db_type = os.getenv('DB_TYPE', 'postgresql')
    db_user = os.getenv('DB_USER')
    db_pass = os.getenv('DB_PASSWORD')
    db_host = os.getenv('DB_HOST')
    db_name = os.getenv('DB_NAME')

    if db_type == 'postgresql':
        return f'postgresql://{db_user}:{db_pass}@{db_host}/{db_name}'
    elif db_type == 'mysql':
        return f'mysql://{db_user}:{db_pass}@{db_host}/{db_name}'
    else:
        return 'sqlite:///parts.db'
```

## Logging Utilities

### Structured Logging

```python
def log_operation(operation: str, part_id: int, user: str = None, details: Dict = None):
    """Log operations with structured data."""
    log_data = {
        'operation': operation,
        'part_id': part_id,
        'timestamp': datetime.utcnow().isoformat(),
        'user': user,
        'details': details or {}
    }

    current_app.logger.info(f'Part operation: {json.dumps(log_data)}')
```

### Performance Logging

```python
from functools import wraps
import time

def log_performance(func):
    """Decorator to log function performance."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start_time

        current_app.logger.info(f'{func.__name__} took {duration:.3f}s')
        return result

    return wrapper
```

## Testing Utilities

### Data Factories

```python
def create_test_part(**overrides) -> Part:
    """Create a test part with default values."""
    defaults = {
        'name': 'Test Part',
        'status': 'Pending',
        'category': 'review',
        'type': 'cnc'
    }

    defaults.update(overrides)
    return Part(**defaults)
```

### Validation Testing

```python
def assert_validation_error(func, *args, **kwargs):
    """Assert that a function raises ValidationError."""
    with pytest.raises(ValidationError):
        func(*args, **kwargs)
```

## Utility Organization

### File Structure

```
utils/
├── __init__.py          # Package imports
├── validation.py        # Data validation functions
├── business_logic.py    # Business rule helpers (future)
├── formatting.py        # Data formatting utilities (future)
└── logging.py          # Logging utilities (future)
```

### Import Strategy

```python
# utils/__init__.py
from .validation import validate_part_data, ValidationError
from .business_logic import handle_part_assignment
from .formatting import format_search_results

__all__ = [
    'validate_part_data', 'ValidationError',
    'handle_part_assignment',
    'format_search_results'
]
```

### Usage in Application

```python
# In routes or models
from utils import validate_part_data, ValidationError

# Validate data
try:
    clean_data = validate_part_data(request.json)
except ValidationError as e:
    # Handle validation error
    pass
```

## Performance Considerations

### Efficient Validation

- **Early Returns**: Fail fast on validation errors
- **Selective Processing**: Only validate provided fields
- **Compiled Regex**: Pre-compile regular expressions
- **Caching**: Cache validation results for repeated checks

### Memory Management

- **Generator Usage**: Use generators for large datasets
- **Lazy Evaluation**: Defer expensive operations
- **Resource Cleanup**: Proper cleanup of temporary resources
- **Memory Profiling**: Monitor memory usage in production

## Future Utilities

### Planned Enhancements

1. **Authentication Helpers**: JWT token management
2. **Permission System**: Role-based access control
3. **Audit Trail**: Comprehensive operation logging
4. **Notification System**: Email and webhook notifications
5. **Export Utilities**: Data export in multiple formats
6. **Import Utilities**: Bulk data import with validation
7. **Search Optimization**: Full-text search capabilities
8. **Caching Layer**: Redis integration for performance

### Integration Points

```python
# Future authentication utility
def require_auth(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not validate_token(token):
            return jsonify({'error': 'Unauthorized'}), 401
        return func(*args, **kwargs)
    return wrapper

# Usage in routes
@parts_bp.route('/')
@require_auth
def get_parts():
    # Authenticated endpoint
    pass
```

This utilities layer provides a solid foundation for data validation, business logic, and cross-cutting concerns, ensuring consistency and maintainability across the application.
