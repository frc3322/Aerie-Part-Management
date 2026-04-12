"""Options API routes for managing configurable dropdown lists."""

from flask import Blueprint, jsonify, request
from models.options import SiteOptions
from models.part import db
from utils.auth import require_secret_key

options_bp = Blueprint("options", __name__)


@options_bp.route("/", methods=["GET"])
def get_options():
    """Return current materials and subsystems lists (no auth required)."""
    opts = SiteOptions.get_or_create()
    return jsonify({"materials": opts.materials, "subsystems": opts.subsystems})


@options_bp.route("/", methods=["PUT"])
@require_secret_key
def update_options():
    """Replace materials and/or subsystems lists (requires auth)."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    opts = SiteOptions.get_or_create()

    materials = data.get("materials")
    subsystems = data.get("subsystems")

    if materials is not None:
        if not isinstance(materials, list) or not all(
            isinstance(m, str) for m in materials
        ):
            return jsonify({"error": "materials must be a list of strings"}), 400
        opts.materials = [m.strip() for m in materials if m.strip()]

    if subsystems is not None:
        if not isinstance(subsystems, list) or not all(
            isinstance(s, str) for s in subsystems
        ):
            return jsonify({"error": "subsystems must be a list of strings"}), 400
        opts.subsystems = [s.strip() for s in subsystems if s.strip()]

    db.session.commit()
    return jsonify({"materials": opts.materials, "subsystems": opts.subsystems})
