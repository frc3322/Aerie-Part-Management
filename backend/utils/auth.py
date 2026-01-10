"""Authentication utilities for the Part Management System."""

from flask import request, jsonify, current_app  # type: ignore
from functools import wraps


def require_secret_key(f):
    """Decorator to require a valid secret key for API access.

    The secret key can be provided in:
    - X-API-Key header (recommended)
    - api_key query parameter

    Note: The api_key in request body is deprecated and not recommended.
    Use X-API-Key header for all requests.

    Returns:
        JSON error response if key is missing or invalid
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        secret_key = current_app.config["SECRET_KEY"]
        provided_key = _get_api_key_from_request()

        # Print and log the provided key and correct password for debugging
        print(f"[AUTH_CHECK] Provided API Key: {provided_key}")
        print(f"[AUTH_CHECK] Correct Password: {secret_key}")
        current_app.logger.info(
            f"Auth check - Provided Key: {provided_key}, Correct Key: {secret_key}"
        )

        if not provided_key:
            return jsonify(
                {
                    "error": "API key required",
                    "details": "Provide X-API-Key header, api_key query parameter, or api_key in request body",
                }
            ), 401

        if provided_key != secret_key:
            return jsonify(
                {
                    "error": "Invalid API key",
                    "details": "The provided API key is not valid",
                }
            ), 401

        return f(*args, **kwargs)

    return decorated_function


def _get_api_key_from_request():
    """Extract API key from various possible sources in the request.

    Returns:
        str or None: The API key if found, None otherwise
    """
    # Check X-API-Key header
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return api_key

    # Check query parameter
    api_key = request.args.get("api_key")
    if api_key:
        return api_key

    # Check JSON body for POST/PUT requests
    if request.is_json and request.method in ["POST", "PUT"]:
        try:
            data = request.get_json(silent=True)
            if data and "api_key" in data:
                return data["api_key"]
        except Exception:
            pass

    return None
