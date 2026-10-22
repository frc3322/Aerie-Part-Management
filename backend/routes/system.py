"""System API routes for checking and applying application updates."""

from flask import Blueprint, jsonify, current_app
from utils.auth import require_secret_key
from utils.updater import (
    UpdateError,
    can_restart,
    check_for_updates,
    get_update_status,
    pull_updates,
    request_restart,
)

system_bp = Blueprint("system", __name__)


@system_bp.route("/update", methods=["GET"])
@require_secret_key
def update_status():
    """Report whether self-update is available and the running commit."""
    try:
        return jsonify(get_update_status())
    except UpdateError as e:
        return jsonify({"error": "Could not read git status", "details": str(e)}), 500


@system_bp.route("/update/check", methods=["POST"])
@require_secret_key
def update_check():
    """Fetch from the remote and list commits that would be pulled."""
    try:
        return jsonify(check_for_updates())
    except UpdateError as e:
        current_app.logger.error(f"Update check failed: {e}")
        return jsonify({"error": "Update check failed", "details": str(e)}), 500


@system_bp.route("/update/apply", methods=["POST"])
@require_secret_key
def update_apply():
    """Pull new commits and, when supervised by deploy.py, rebuild and relaunch."""
    try:
        result = pull_updates()
    except UpdateError as e:
        current_app.logger.error(f"Update pull failed: {e}")
        return jsonify({"error": "Update failed", "details": str(e)}), 500

    updated = result["commit"] != result["previous_commit"]
    restarting = updated and can_restart()
    if restarting:
        request_restart()

    current_app.logger.info(
        f"Update pulled {result['previous_commit']} -> {result['commit']}, "
        f"restarting: {restarting}"
    )
    return jsonify({**result, "updated": updated, "restarting": restarting})
