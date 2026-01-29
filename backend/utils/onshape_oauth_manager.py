"""
Onshape OAuth Session Manager

Manages in-memory storage of Onshape OAuth sessions linked to app API keys.
All data is stored in RAM only and lost on restart.
"""

import base64
import hashlib
import hmac
import json
import secrets
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional

# Thread lock for safe concurrent access
_lock = threading.Lock()

# In-memory storage (lost on restart)
# Key = app API key (links Onshape OAuth to app session)
_onshape_oauth_sessions: Dict[str, dict] = {}

# Temporary states for OAuth callback validation
# Key = state token, Value = {app_api_key, created_at, expires_at}
_oauth_states: Dict[str, dict] = {}


def create_onshape_session(
    app_api_key: str,
    access_token: str,
    refresh_token: str,
    expires_in: int,
    user_info: dict
) -> None:
    """
    Create or update Onshape OAuth session for a user.

    Args:
        app_api_key: The user's app API key (session identifier)
        access_token: Onshape OAuth access token
        refresh_token: Onshape OAuth refresh token
        expires_in: Token expiry time in seconds
        user_info: User information from Onshape (id, email, name)
    """
    token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    with _lock:
        _onshape_oauth_sessions[app_api_key] = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expiry": token_expiry,
            "user_info": user_info,
            "authenticated_at": datetime.utcnow(),
        }


def get_onshape_session(app_api_key: str) -> Optional[dict]:
    """
    Get Onshape OAuth session for a user.

    Args:
        app_api_key: The user's app API key

    Returns:
        Session dict or None if not found
    """
    with _lock:
        return _onshape_oauth_sessions.get(app_api_key)


def delete_onshape_session(app_api_key: str) -> bool:
    """
    Delete Onshape OAuth session for a user.

    Args:
        app_api_key: The user's app API key

    Returns:
        True if session existed and was deleted, False otherwise
    """
    removed = False
    with _lock:
        if app_api_key in _onshape_oauth_sessions:
            del _onshape_oauth_sessions[app_api_key]
            removed = True

    return removed


def has_onshape_auth(app_api_key: str) -> bool:
    """
    Check if user has active Onshape OAuth session.

    Args:
        app_api_key: The user's app API key

    Returns:
        True if user has Onshape OAuth session
    """
    with _lock:
        return app_api_key in _onshape_oauth_sessions


def is_token_expired(app_api_key: str) -> bool:
    """
    Check if Onshape OAuth token is expired or will expire soon.

    Args:
        app_api_key: The user's app API key

    Returns:
        True if token is expired or will expire in < 5 minutes
    """
    session = get_onshape_session(app_api_key)
    if not session:
        return True

    # Consider expired if less than 5 minutes remaining
    expiry = session.get("token_expiry")
    if not expiry:
        return True

    return datetime.utcnow() + timedelta(minutes=5) >= expiry


def update_tokens(app_api_key: str, access_token: str, refresh_token: str, expires_in: int) -> None:
    """
    Update access and refresh tokens for an existing session.

    Args:
        app_api_key: The user's app API key
        access_token: New access token
        refresh_token: New refresh token
        expires_in: Token expiry time in seconds
    """
    token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    with _lock:
        if app_api_key in _onshape_oauth_sessions:
            session = _onshape_oauth_sessions[app_api_key]
            session["access_token"] = access_token
            session["refresh_token"] = refresh_token
            session["token_expiry"] = token_expiry


def cleanup_expired_sessions() -> int:
    """
    Remove expired Onshape OAuth sessions.

    Returns:
        Number of sessions removed
    """
    now = datetime.utcnow()
    removed_count = 0

    with _lock:
        # Find expired sessions
        expired_keys = [
            key for key, session in _onshape_oauth_sessions.items()
            if session.get("token_expiry") and session["token_expiry"] < now
        ]

        # Remove them
        for key in expired_keys:
            del _onshape_oauth_sessions[key]
            removed_count += 1

    return removed_count


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign_state(payload: dict, secret_key: str) -> str:
    encoded = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = hmac.new(
        secret_key.encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256
    ).digest()
    return f"{encoded}.{_b64url_encode(signature)}"


def _unsign_state(token: str, secret_key: str) -> Optional[dict]:
    try:
        encoded, signature = token.split(".")
    except ValueError:
        return None

    expected = hmac.new(
        secret_key.encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256
    ).digest()
    if not hmac.compare_digest(_b64url_encode(expected), signature):
        return None

    try:
        payload = json.loads(_b64url_decode(encoded).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None

    return payload


def generate_state(app_api_key: str, secret_key: Optional[str] = None, expires_in: int = 300) -> str:
    """
    Generate secure state token for CSRF protection.

    Args:
        app_api_key: The user's app API key to link to this state

    Returns:
        Random state token
    """
    if secret_key:
        payload = {
            "app_api_key": app_api_key,
            "exp": int((datetime.utcnow() + timedelta(seconds=expires_in)).timestamp()),
            "nonce": secrets.token_urlsafe(16),
        }
        return _sign_state(payload, secret_key)

    state = secrets.token_urlsafe(32)
    store_state(state, app_api_key, expires_in=expires_in)
    return state


def store_state(state: str, app_api_key: str, expires_in: int = 300) -> None:
    """
    Store state token with associated app API key.

    Args:
        state: State token
        app_api_key: App API key to associate with this state
        expires_in: Expiry time in seconds (default 5 minutes)
    """
    with _lock:
        _oauth_states[state] = {
            "app_api_key": app_api_key,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(seconds=expires_in)
        }


def validate_state(state: str, secret_key: Optional[str] = None, log_invalid: bool = True) -> Optional[str]:
    """
    Validate state token and return associated app API key.

    Args:
        state: State token to validate

    Returns:
        App API key if state is valid, None otherwise
    """
    if secret_key:
        payload = _unsign_state(state, secret_key)
        if payload:
            exp = payload.get("exp")
            if isinstance(exp, int) and int(datetime.utcnow().timestamp()) <= exp:
                return payload.get("app_api_key")
        elif log_invalid:
            print("[ONSHAPE_OAUTH] Invalid signed state token")

    with _lock:
        state_data = _oauth_states.get(state)
        if not state_data:
            if log_invalid:
                print("[ONSHAPE_OAUTH] State not found in in-memory store")
            return None

        # Check if expired
        if datetime.utcnow() > state_data["expires_at"]:
            del _oauth_states[state]
            if log_invalid:
                print("[ONSHAPE_OAUTH] State expired")
            return None

        # Valid - remove state and return app_api_key
        app_api_key = state_data["app_api_key"]
        del _oauth_states[state]
        return app_api_key


def cleanup_expired_states() -> int:
    """
    Remove expired state tokens.

    Returns:
        Number of states removed
    """
    now = datetime.utcnow()
    removed_count = 0

    with _lock:
        expired_states = [
            state for state, data in _oauth_states.items()
            if data["expires_at"] < now
        ]

        for state in expired_states:
            del _oauth_states[state]
            removed_count += 1

    return removed_count


def get_session_count() -> int:
    """Get count of active Onshape OAuth sessions."""
    with _lock:
        return len(_onshape_oauth_sessions)


def get_state_count() -> int:
    """Get count of pending OAuth states."""
    with _lock:
        return len(_oauth_states)


def _persist_session(
    app_api_key: str,
    access_token: str,
    refresh_token: Optional[str],
    token_expiry: datetime,
    user_info: Optional[dict],
) -> None:
    pass


def _load_persisted_session(app_api_key: str) -> Optional[dict]:
    return None


def _delete_persisted_session(app_api_key: str) -> None:
    pass
