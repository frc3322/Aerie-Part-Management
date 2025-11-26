"""Validation utilities for the Part Management System."""

from typing import Dict, Any
import re


class ValidationError(Exception):
    """Custom exception for validation errors."""

    def __init__(self, message: str, field: str = None):
        """Initialize validation error.

        Args:
            message (str): Error message
            field (str, optional): Field that failed validation
        """
        super().__init__(message)
        self.field = field
        self.message = message


def validate_part_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate part data and return cleaned data.

    Args:
        data (dict): Raw part data to validate

    Returns:
        dict: Validated and cleaned part data

    Raises:
        ValidationError: If validation fails
    """
    validated_data = {}

    # Validate string fields
    validated_data.update(validate_string_fields(data))

    # Validate specific fields
    validate_part_type(validated_data)
    validate_category(data, validated_data)
    validate_status(data, validated_data)
    validate_onshape_url(validated_data)

    return validated_data


def validate_string_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate string fields with length constraints.

    Args:
        data (dict): Raw part data

    Returns:
        dict: Validated string fields

    Raises:
        ValidationError: If validation fails
    """
    validated_data = {}
    string_fields = ['type', 'name', 'subsystem', 'assigned', 'status', 'notes', 'file', 'onshape_url']
    max_lengths = {
        'type': 50,
        'name': 200,
        'subsystem': 100,
        'assigned': 100,
        'status': 50,
        'file': 200,
        'onshape_url': 500
    }

    for field in string_fields:
        if field in data:
            value = data[field]
            if value is not None:
                if not isinstance(value, str):
                    raise ValidationError(f'{field} must be a string', field)

                max_len = max_lengths.get(field)
                if max_len and len(value.strip()) > max_len:
                    raise ValidationError(f'{field} exceeds maximum length of {max_len} characters', field)

                validated_data[field] = value.strip()

    return validated_data


def validate_part_type(validated_data: Dict[str, Any]) -> None:
    """Validate part type field.

    Args:
        validated_data (dict): Data to validate and modify

    Raises:
        ValidationError: If validation fails
    """
    if 'type' in validated_data:
        valid_types = ['cnc', 'hand']
        part_type = validated_data['type']
        if part_type and part_type.lower() not in valid_types:
            raise ValidationError("type must be 'cnc' or 'hand'", 'type')
        validated_data['type'] = part_type.lower() if part_type else None


def validate_category(data: Dict[str, Any], validated_data: Dict[str, Any]) -> None:
    """Validate category field.

    Args:
        data (dict): Raw data
        validated_data (dict): Data to modify

    Raises:
        ValidationError: If validation fails
    """
    if 'category' in data:
        valid_categories = ['review', 'cnc', 'hand', 'completed']
        category = data['category']
        if category and category not in valid_categories:
            raise ValidationError(f"category must be one of: {', '.join(valid_categories)}", 'category')
        validated_data['category'] = category


def validate_status(data: Dict[str, Any], validated_data: Dict[str, Any]) -> None:
    """Validate status field.

    Args:
        data (dict): Raw data
        validated_data (dict): Data to modify

    Raises:
        ValidationError: If validation fails
    """
    if 'status' in data:
        valid_statuses = ['Pending', 'Reviewed', 'Approved', 'In Progress', 'Already Started', 'Completed', 'Cancelled']
        status = data['status']
        if status and status not in valid_statuses:
            raise ValidationError(f"status must be one of: {', '.join(valid_statuses)}", 'status')
        validated_data['status'] = status


def validate_onshape_url(validated_data: Dict[str, Any]) -> None:
    """Validate Onshape URL field.

    Args:
        validated_data (dict): Data to validate

    Raises:
        ValidationError: If validation fails
    """
    if 'onshape_url' in validated_data:
        url = validated_data['onshape_url']
        if url and not _is_valid_url(url):
            raise ValidationError('onshape_url must be a valid URL', 'onshape_url')


def _is_valid_url(url: str) -> bool:
    """Check if a string is a valid URL.

    Args:
        url (str): URL string to validate

    Returns:
        bool: True if valid URL
    """
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    return url_pattern.match(url) is not None


def validate_category_transition(current_category: str, new_category: str, part_type: str = None) -> bool:
    """Validate if a category transition is allowed.

    Args:
        current_category (str): Current category
        new_category (str): New category
        part_type (str, optional): Part type for additional validation

    Returns:
        bool: True if transition is valid

    Raises:
        ValidationError: If transition is not allowed
    """
    valid_transitions = {
        'review': ['cnc', 'hand', 'completed'],
        'cnc': ['completed'],
        'hand': ['completed'],
        'completed': ['cnc', 'hand']  # Allow reverting completed parts
    }

    if current_category not in valid_transitions:
        raise ValidationError(f'Invalid current category: {current_category}')

    if new_category not in valid_transitions[current_category]:
        raise ValidationError(f'Cannot transition from {current_category} to {new_category}')

    # Additional validation for type-specific transitions
    if new_category in ['cnc', 'hand'] and part_type:
        if new_category != part_type:
            raise ValidationError(f'Part type {part_type} cannot be moved to {new_category} category')

    return True


def sanitize_search_query(query: str) -> str:
    """Sanitize search query to prevent SQL injection and improve search quality.

    Args:
        query (str): Raw search query

    Returns:
        str: Sanitized search query
    """
    if not query:
        return ''

    # Remove potentially harmful characters
    sanitized = re.sub(r'[^\w\s\-\.]', '', query)

    # Trim whitespace
    sanitized = sanitized.strip()

    # Limit length
    if len(sanitized) > 100:
        sanitized = sanitized[:100]

    return sanitized
