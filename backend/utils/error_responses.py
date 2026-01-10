"""Standardized error response utilities for the Part Management System."""

from typing import Optional, Dict, Any
from flask import jsonify  # type: ignore


def error_response(
    error: str,
    status_code: int = 400,
    details: Optional[str] = None,
    field: Optional[str] = None,
    **kwargs,
) -> tuple:
    """Create a standardized error response.

    Args:
        error: Main error message
        status_code: HTTP status code (default: 400)
        details: Additional error details (optional)
        field: Field name that caused the error (optional, for validation errors)
        **kwargs: Additional fields to include in the response

    Returns:
        tuple: (JSON response, status_code)
    """
    response: Dict[str, Any] = {"error": error}

    if details:
        response["details"] = details

    if field:
        response["field"] = field

    # Add any additional fields
    response.update(kwargs)

    return jsonify(response), status_code


def validation_error_response(
    message: str, field: Optional[str] = None, status_code: int = 400
) -> tuple:
    """Create a standardized validation error response.

    Args:
        message: Validation error message
        field: Field name that failed validation (optional)
        status_code: HTTP status code (default: 400)

    Returns:
        tuple: (JSON response, status_code)
    """
    return error_response(
        error="Validation Error", status_code=status_code, details=message, field=field
    )


def not_found_response(
    resource: str = "Resource", details: Optional[str] = None
) -> tuple:
    """Create a standardized not found error response.

    Args:
        resource: Name of the resource that wasn't found
        details: Additional details (optional)

    Returns:
        tuple: (JSON response, 404 status)
    """
    return error_response(
        error=f"{resource} not found", status_code=404, details=details
    )


def unauthorized_response(details: Optional[str] = None) -> tuple:
    """Create a standardized unauthorized error response.

    Args:
        details: Additional details (optional)

    Returns:
        tuple: (JSON response, 401 status)
    """
    return error_response(
        error="Unauthorized",
        status_code=401,
        details=details or "Authentication required",
    )


def forbidden_response(details: Optional[str] = None) -> tuple:
    """Create a standardized forbidden error response.

    Args:
        details: Additional details (optional)

    Returns:
        tuple: (JSON response, 403 status)
    """
    return error_response(
        error="Forbidden",
        status_code=403,
        details=details or "You do not have permission to access this resource",
    )


def server_error_response(details: Optional[str] = None) -> tuple:
    """Create a standardized server error response.

    Args:
        details: Additional details (optional)

    Returns:
        tuple: (JSON response, 500 status)
    """
    return error_response(
        error="Server Error",
        status_code=500,
        details=details or "An internal server error occurred",
    )


def success_response(message: str, status_code: int = 200, **kwargs) -> tuple:
    """Create a standardized success response.

    Args:
        message: Success message
        status_code: HTTP status code (default: 200)
        **kwargs: Additional fields to include in the response

    Returns:
        tuple: (JSON response, status_code)
    """
    response: Dict[str, Any] = {"message": message}
    response.update(kwargs)
    return jsonify(response), status_code
