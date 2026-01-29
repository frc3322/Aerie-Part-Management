"""
Authentication Routes

Handles Onshape OAuth authentication endpoints.
App authentication (API key) is handled separately.
"""

from flask import Blueprint, request, jsonify, redirect, current_app
from utils.auth import require_secret_key, extract_api_key_from_request
from utils.onshape_oauth import OnshapeOAuthClient
from utils.onshape_oauth_manager import (
    generate_state,
    validate_state,
    create_onshape_session,
    get_onshape_session,
    delete_onshape_session,
    has_onshape_auth
)

auth_bp = Blueprint("auth", __name__)


def get_oauth_client() -> OnshapeOAuthClient:
    """
    Get configured Onshape OAuth client.

    Returns:
        OnshapeOAuthClient instance

    Raises:
        RuntimeError: If OAuth is not configured
    """
    client_id = current_app.config.get("ONSHAPE_OAUTH_CLIENT_ID", "")
    client_secret = current_app.config.get("ONSHAPE_OAUTH_CLIENT_SECRET", "")
    redirect_uri = current_app.config.get("ONSHAPE_OAUTH_REDIRECT_URI", "")
    base_url = current_app.config.get("ONSHAPE_OAUTH_BASE_URL", "https://oauth.onshape.com")
    api_base_url = current_app.config.get("ONSHAPE_API_BASE_URL", "https://cad.onshape.com")

    if not client_id or not client_secret or not redirect_uri:
        raise RuntimeError("Onshape OAuth is not configured")

    return OnshapeOAuthClient(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        base_url=base_url,
        api_base_url=api_base_url
    )


@auth_bp.route("/onshape/connect", methods=["GET"])
@require_secret_key
def onshape_connect():
    """
    Initiate Onshape OAuth flow.

    User must be authenticated with app API key.
    Returns authorization URL to redirect user to Onshape.
    """
    try:
        # Get app API key from request
        app_api_key = extract_api_key_from_request()
        if not app_api_key:
            return jsonify({
                "error": "Authentication required",
                "message": "App API key not found in request"
            }), 401

        # Get OAuth client
        oauth_client = get_oauth_client()

        # Generate state token linked to app session
        state = generate_state(app_api_key, current_app.config.get("SECRET_KEY"))

        # Build authorization URL
        authorization_url = oauth_client.get_authorization_url(state)

        current_app.logger.info(
            "Onshape OAuth connect requested",
            extra={"app_api_key": app_api_key, "state": state},
        )

        return jsonify({
            "authorization_url": authorization_url
        })

    except RuntimeError as e:
        return jsonify({
            "error": "Configuration error",
            "message": str(e)
        }), 500
    except Exception as e:
        current_app.logger.error(f"Error initiating Onshape OAuth: {e}")
        return jsonify({
            "error": "Failed to initiate Onshape connection",
            "message": str(e)
        }), 500


@auth_bp.route("/onshape/callback", methods=["GET"])
def onshape_callback():
    """
    Handle Onshape OAuth callback.

    No auth required - Onshape redirects here.
    Validates state, exchanges code for tokens, creates session.
    """
    try:
        # Get parameters from callback
        code = request.args.get("code")
        state = request.args.get("state")
        error = request.args.get("error")

        # Check for authorization errors
        if error:
            error_description = request.args.get("error_description", "Unknown error")
            current_app.logger.error(f"Onshape OAuth error: {error} - {error_description}")
            return redirect(f"/?onshape_error={error}")

        # Validate required parameters
        if not code or not state:
            return jsonify({
                "error": "Invalid callback",
                "message": "Missing code or state parameter"
            }), 400

        # Validate state and get associated app API key
        app_api_key = validate_state(
            state,
            current_app.config.get("SECRET_KEY"),
            log_invalid=True
        )
        if not app_api_key:
            return jsonify({
                "error": "Invalid state",
                "message": "State token is invalid or expired"
            }), 400

        # Get OAuth client
        oauth_client = get_oauth_client()

        # Exchange code for tokens
        token_data = oauth_client.exchange_code_for_tokens(code)

        # Get user info from Onshape
        user_info = oauth_client.get_user_info(token_data["access_token"])

        # Create Onshape session in RAM
        create_onshape_session(
            app_api_key=app_api_key,
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            expires_in=token_data["expires_in"],
            user_info={
                "id": user_info.get("id", ""),
                "email": user_info.get("email", ""),
                "name": user_info.get("name", "")
            }
        )

        current_app.logger.info(
            "Onshape OAuth token exchange succeeded",
            extra={
                "user": user_info.get("email"),
                "app_api_key": app_api_key,
            },
        )

        # Redirect back to app
        return redirect("/?onshape_connected=true")

    except RuntimeError as e:
        current_app.logger.error(f"Configuration error in OAuth callback: {e}")
        return redirect("/?onshape_error=config")
    except Exception as e:
        current_app.logger.error(f"Error in Onshape OAuth callback: {e}")
        return redirect("/?onshape_error=callback_failed")


@auth_bp.route("/onshape/status", methods=["GET"])
@require_secret_key
def onshape_status():
    """
    Check Onshape OAuth connection status.

    Returns connection status and user info if connected.
    """
    try:
        # Get app API key from request
        app_api_key = extract_api_key_from_request()
        if not app_api_key:
            return jsonify({
                "error": "Authentication required",
                "message": "App API key not found in request"
            }), 401

        # Check if user has Onshape OAuth session
        if not has_onshape_auth(app_api_key):
            return jsonify({
                "connected": False
            })

        # Get session details
        session = get_onshape_session(app_api_key)
        if not session:
            return jsonify({
                "connected": False
            })

        return jsonify({
            "connected": True,
            "user": session.get("user_info", {}),
            "authenticated_at": session.get("authenticated_at").isoformat() if session.get("authenticated_at") else None
        })

    except Exception as e:
        current_app.logger.error(f"Error checking Onshape status: {e}")
        return jsonify({
            "error": "Failed to check Onshape status",
            "message": str(e)
        }), 500


@auth_bp.route("/onshape/disconnect", methods=["POST"])
@require_secret_key
def onshape_disconnect():
    """
    Disconnect Onshape OAuth session.

    Removes session from RAM.
    """
    try:
        # Get app API key from request
        app_api_key = extract_api_key_from_request()
        if not app_api_key:
            return jsonify({
                "error": "Authentication required",
                "message": "App API key not found in request"
            }), 401

        # Delete session
        deleted = delete_onshape_session(app_api_key)

        if deleted:
            current_app.logger.info(f"Onshape OAuth disconnected for session")
            return jsonify({
                "message": "Disconnected from Onshape",
                "success": True
            })
        else:
            return jsonify({
                "message": "No Onshape connection found",
                "success": False
            })

    except Exception as e:
        current_app.logger.error(f"Error disconnecting Onshape: {e}")
        return jsonify({
            "error": "Failed to disconnect from Onshape",
            "message": str(e)
        }), 500
