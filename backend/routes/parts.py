"""Parts API routes for the Part Management System."""

import time
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app, send_file
from sqlalchemy import or_, desc, asc
from models.part import Part, db  # type: ignore
from utils.auth import require_secret_key  # type: ignore
from utils.onshape_drawing import build_onshape_client  # type: ignore
from utils.step_converter import convert_step_to_gltf  # type: ignore
from utils.validation import validate_misc_info, ValidationError  # type: ignore

# Status constants
STATUS_IN_PROGRESS = "In Progress"

# Rate limiting for auth checks (2 second minimum delay between requests per IP)
_auth_check_timestamps = {}

parts_bp = Blueprint("parts", __name__, url_prefix="/api/parts")


def _sanitize_misc_info(raw_value):
    """Normalize misc_info payload to a string/number dict or None."""
    validated = validate_misc_info({"misc_info": raw_value})
    return validated.get("misc_info")


def _merge_misc_info(existing_misc, incoming_misc):
    """Merge misc_info dictionaries, preferring incoming values."""
    if existing_misc is None and incoming_misc is None:
        return None
    base = existing_misc.copy() if isinstance(existing_misc, dict) else {}
    if isinstance(incoming_misc, dict):
        base.update(incoming_misc)
    return base if base else None


@parts_bp.route("/", methods=["GET"])
@require_secret_key
def get_parts():
    """Get all parts, optionally filtered by category.

    Query Parameters:
        category (str): Filter by category (review, cnc, hand, completed)
        search (str): Search query for name, notes, subsystem, or assigned
        sort_by (str): Sort field (name, status, assigned, created_at)
        sort_order (str): Sort order (asc, desc) - defaults to asc
        limit (int): Maximum number of results
        offset (int): Pagination offset

    Returns:
        JSON: List of parts with pagination info
    """
    try:
        # Parse query parameters
        category = request.args.get("category")
        search_query = request.args.get("search")
        sort_by = request.args.get("sort_by", "created_at")
        sort_order = request.args.get("sort_order", "desc")
        limit = request.args.get("limit", type=int)
        offset = request.args.get("offset", 0, type=int)

        # Build query
        query = Part.query

        # Apply category filter
        if category:
            query = query.filter_by(category=category)

        # Apply search filter
        if search_query:
            search_filter = or_(
                Part.name.ilike(f"%{search_query}%"),
                Part.notes.ilike(f"%{search_query}%"),
                Part.subsystem.ilike(f"%{search_query}%"),
                Part.assigned.ilike(f"%{search_query}%"),
                Part.material.ilike(f"%{search_query}%"),
                Part.part_id.ilike(f"%{search_query}%"),
            )
            query = query.filter(search_filter)

        # Apply sorting
        sort_column = getattr(Part, sort_by, Part.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        # Get total count before pagination
        total_count = query.count()

        # Apply pagination
        if limit:
            query = query.limit(limit).offset(offset)

        parts = query.all()

        return jsonify(
            {
                "parts": [part.to_dict() for part in parts],
                "total": total_count,
                "limit": limit,
                "offset": offset,
            }
        )

    except Exception as e:
        current_app.logger.error(f"Error getting parts: {str(e)}")
        return jsonify({"error": "Failed to retrieve parts"}), 500


@parts_bp.route("/", methods=["POST"])
@require_secret_key
def create_part():
    """Create a new part.

    Request Body:
        JSON object with part data (see Part model for fields)

    Returns:
        JSON: Created part data
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        if not data.get("status"):
            data["status"] = "Pending"

        if not data.get("category"):
            data["category"] = "review"

        part_id = data.get("partId") or data.get("part_id")
        if part_id is None or str(part_id).strip() == "":
            return jsonify({"error": "Part ID is required"}), 400
        data["part_id"] = str(part_id).strip()

        material = data.get("material")
        if material is None or str(material).strip() == "":
            return jsonify({"error": "Material is required"}), 400

        subsystem = data.get("subsystem")
        if subsystem is None or str(subsystem).strip() == "":
            return jsonify({"error": "Subsystem is required"}), 400

        amount = data.get("amount")
        if amount is None or str(amount).strip() == "":
            data["amount"] = 1
        else:
            try:
                parsed_amount = int(amount)
                if parsed_amount <= 0:
                    return jsonify({"error": "Amount must be greater than 0"}), 400
                data["amount"] = parsed_amount
            except (TypeError, ValueError):
                return jsonify({"error": "Amount must be a number"}), 400

        # Normalize misc_info if provided
        try:
            if "misc_info" in data or "miscInfo" in data:
                data["misc_info"] = _sanitize_misc_info(
                    data.get("misc_info", data.get("miscInfo"))
                )
        except ValidationError as exc:
            return jsonify({"error": exc.message, "field": exc.field}), 400

        # Create new part
        part = Part()
        part.update_from_dict(data)

        db.session.add(part)
        db.session.commit()

        return jsonify(part.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating part: {str(e)}")
        return jsonify({"error": "Failed to create part"}), 500


@parts_bp.route("/<int:part_id>", methods=["GET"])
@require_secret_key
def get_part(part_id):
    """Get a specific part by ID.

    Args:
        part_id (int): Part ID

    Returns:
        JSON: Part data
    """
    try:
        part = Part.query.get_or_404(part_id)
        return jsonify(part.to_dict())

    except Exception as e:
        current_app.logger.error(f"Error getting part {part_id}: {str(e)}")
        return jsonify({"error": "Part not found"}), 404


@parts_bp.route("/<int:part_id>", methods=["PUT"])
@require_secret_key
def update_part(part_id):
    """Update a specific part.

    Args:
        part_id (int): Part ID

    Request Body:
        JSON object with part data to update

    Returns:
        JSON: Updated part data
    """
    try:
        part = Part.query.get_or_404(part_id)
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        if "subsystem" in data:
            subsystem = data.get("subsystem")
            if subsystem is None or str(subsystem).strip() == "":
                return jsonify({"error": "Subsystem is required"}), 400

        if "partId" in data or "part_id" in data:
            part_id = data.get("partId") or data.get("part_id")
            if part_id is None or str(part_id).strip() == "":
                return jsonify({"error": "Part ID is required"}), 400
            data["part_id"] = str(part_id).strip()

        if "amount" in data:
            amount = data.get("amount")
            if amount is None or str(amount).strip() == "":
                data["amount"] = 1
            else:
                try:
                    parsed_amount = int(amount)
                    if parsed_amount <= 0:
                        return jsonify({"error": "Amount must be greater than 0"}), 400
                    data["amount"] = parsed_amount
                except (TypeError, ValueError):
                    return jsonify({"error": "Amount must be a number"}), 400

        if "misc_info" in data or "miscInfo" in data:
            try:
                data["misc_info"] = _sanitize_misc_info(
                    data.get("misc_info", data.get("miscInfo"))
                )
            except ValidationError as exc:
                return jsonify({"error": exc.message, "field": exc.field}), 400

        part.update_from_dict(data)
        db.session.commit()

        return jsonify(part.to_dict())

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating part {part_id}: {str(e)}")
        return jsonify({"error": "Failed to update part"}), 500


@parts_bp.route("/<int:part_id>", methods=["DELETE"])
@require_secret_key
def delete_part(part_id):
    """Delete a specific part.

    Args:
        part_id (int): Part ID

    Returns:
        JSON: Success message
    """
    try:
        part = Part.query.get_or_404(part_id)
        db.session.delete(part)
        db.session.commit()

        return jsonify({"message": "Part deleted successfully"})

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting part {part_id}: {str(e)}")
        return jsonify({"error": "Failed to delete part"}), 500


@parts_bp.route("/<int:part_id>/approve", methods=["POST"])
@require_secret_key
def approve_part(part_id):
    """Approve a part for production (move to appropriate category).

    Args:
        part_id (int): Part ID

    Returns:
        JSON: Updated part data
    """
    try:
        part = Part.query.get_or_404(part_id)
        data = request.get_json(silent=True) or {}

        incoming_misc = None
        reviewer_value = data.get("reviewer")
        try:
            if "misc_info" in data or "miscInfo" in data:
                incoming_misc = _sanitize_misc_info(
                    data.get("misc_info", data.get("miscInfo"))
                )
        except ValidationError as exc:
            return jsonify({"error": exc.message, "field": exc.field}), 400

        if reviewer_value:
            reviewer_entry = {"reviewer": reviewer_value}
            incoming_misc = _merge_misc_info(incoming_misc, reviewer_entry)

        # Update status and move to appropriate category based on type
        part.status = "Reviewed"
        if part.type == "cnc":
            part.category = "cnc"
        elif part.type == "hand":
            part.category = "hand"
        else:
            # Default to hand if type not specified
            part.category = "hand"

        part.misc_info = _merge_misc_info(part.misc_info, incoming_misc)

        db.session.commit()

        return jsonify(part.to_dict())

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error approving part {part_id}: {str(e)}")
        return jsonify({"error": "Failed to approve part"}), 500


@parts_bp.route("/<int:part_id>/assign", methods=["POST"])
@require_secret_key
def assign_part(part_id):
    """Assign a part to a user.

    Args:
        part_id (int): Part ID

    Request Body:
        JSON: { "assigned": "user_name" }

    Returns:
        JSON: Updated part data
    """
    try:
        part = Part.query.get_or_404(part_id)
        data = request.get_json()

        if not data or "assigned" not in data:
            return jsonify({"error": "Assigned user required"}), 400

        part.assigned = data["assigned"]
        part.claimed_date = datetime.now(timezone.utc)
        part.status = STATUS_IN_PROGRESS

        db.session.commit()

        return jsonify(part.to_dict())

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error assigning part {part_id}: {str(e)}")
        return jsonify({"error": "Failed to assign part"}), 500


@parts_bp.route("/<int:part_id>/unclaim", methods=["POST"])
@require_secret_key
def unclaim_part(part_id):
    """Unclaim a part (remove assignment).

    Args:
        part_id (int): Part ID

    Returns:
        JSON: Updated part data
    """
    try:
        part = Part.query.get_or_404(part_id)

        part.assigned = None
        part.claimed_date = None
        part.status = (
            "Already Started" if part.status == STATUS_IN_PROGRESS else "Pending"
        )

        db.session.commit()

        return jsonify(part.to_dict())

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error unclaiming part {part_id}: {str(e)}")
        return jsonify({"error": "Failed to unclaim part"}), 500


@parts_bp.route("/<int:part_id>/complete", methods=["POST"])
@require_secret_key
def complete_part(part_id):
    """Mark a part as completed.

    Args:
        part_id (int): Part ID

    Returns:
        JSON: Updated part data
    """
    try:
        part = Part.query.get_or_404(part_id)
        data = request.get_json(silent=True) or {}

        incoming_misc = None
        try:
            if "misc_info" in data or "miscInfo" in data:
                incoming_misc = _sanitize_misc_info(
                    data.get("misc_info", data.get("miscInfo"))
                )
        except ValidationError as exc:
            return jsonify({"error": exc.message, "field": exc.field}), 400

        part.status = "Completed"
        part.category = "completed"
        part.misc_info = _merge_misc_info(part.misc_info, incoming_misc)

        db.session.commit()

        return jsonify(part.to_dict())

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error completing part {part_id}: {str(e)}")
        return jsonify({"error": "Failed to complete part"}), 500


@parts_bp.route("/<int:part_id>/revert", methods=["POST"])
@require_secret_key
def revert_part(part_id):
    """Revert a completed part back to its previous category.

    Args:
        part_id (int): Part ID

    Returns:
        JSON: Updated part data
    """
    try:
        part = Part.query.get_or_404(part_id)

        if part.category != "completed":
            return jsonify({"error": "Part is not completed"}), 400

        # Move back to appropriate category based on type
        if part.type == "cnc":
            part.category = "cnc"
            part.status = STATUS_IN_PROGRESS
        else:
            part.category = "hand"
            part.status = STATUS_IN_PROGRESS

        db.session.commit()

        return jsonify(part.to_dict())

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error reverting part {part_id}: {str(e)}")
        return jsonify({"error": "Failed to revert part"}), 500


@parts_bp.route("/categories/<category>", methods=["GET"])
@require_secret_key
def get_parts_by_category(category):
    """Get all parts in a specific category.

    Args:
        category (str): Category name (review, cnc, hand, completed)

    Query Parameters:
        search (str): Search query
        sort_by (str): Sort field
        sort_order (str): Sort order

    Returns:
        JSON: List of parts in category
    """
    try:
        # Add category to query parameters and call get_parts
        args = request.args.copy()
        args["category"] = category

        # Create a new request context with modified args
        from werkzeug.datastructures import ImmutableMultiDict

        request.args = ImmutableMultiDict(args)

        return get_parts()

    except Exception as e:
        current_app.logger.error(
            f"Error getting parts for category {category}: {str(e)}"
        )
        return jsonify({"error": "Failed to retrieve parts"}), 500


@parts_bp.route("/stats", methods=["GET"])
@require_secret_key
def get_stats():
    """Get statistics about parts in the system.

    Returns:
        JSON: Statistics object
    """
    try:
        # Get counts by category
        review_count = Part.query.filter_by(category="review").count()
        cnc_count = Part.query.filter_by(category="cnc").count()
        hand_count = Part.query.filter_by(category="hand").count()
        completed_count = Part.query.filter_by(category="completed").count()

        # Get counts by status
        pending_count = Part.query.filter_by(status="Pending").count()
        in_progress_count = Part.query.filter_by(status=STATUS_IN_PROGRESS).count()
        completed_status_count = Part.query.filter_by(status="Completed").count()

        # Get assigned vs unassigned
        assigned_count = Part.query.filter(Part.assigned.isnot(None)).count()
        unassigned_count = Part.query.filter(Part.assigned.is_(None)).count()

        return jsonify(
            {
                "by_category": {
                    "review": review_count,
                    "cnc": cnc_count,
                    "hand": hand_count,
                    "completed": completed_count,
                },
                "by_status": {
                    "pending": pending_count,
                    "in_progress": in_progress_count,
                    "completed": completed_status_count,
                },
                "assignment": {
                    "assigned": assigned_count,
                    "unassigned": unassigned_count,
                },
                "total": review_count + cnc_count + hand_count + completed_count,
            }
        )

    except Exception as e:
        current_app.logger.error(f"Error getting stats: {str(e)}")
        return jsonify({"error": "Failed to retrieve statistics"}), 500


@parts_bp.route("/auth/check", methods=["GET"])
@require_secret_key
def check_auth():
    """Check authentication status with rate limiting.

    This endpoint enforces a 2-second minimum delay between requests per IP address
    to prevent rapid checking. Used by frontend to validate API key persistence.

    Returns:
        JSON: Authentication status confirmation or rate limit error
    """
    client_ip = request.remote_addr
    current_time = time.time()

    # Check if client has made a recent request
    if client_ip in _auth_check_timestamps:
        time_since_last_request = current_time - _auth_check_timestamps[client_ip]
        if time_since_last_request < 2.0:
            remaining_time = 2.0 - time_since_last_request
            return jsonify(
                {
                    "error": "Rate limited",
                    "message": f"Please wait {remaining_time:.1f} seconds before checking authentication again",
                    "retry_after": remaining_time,
                }
            ), 429

    # Update timestamp for this request
    _auth_check_timestamps[client_ip] = current_time

    # Set headers to prevent 304 Not Modified responses
    response = jsonify(
        {
            "status": "authenticated",
            "message": "API key is valid",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    # Prevent caching to ensure fresh validation on each call
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    return response


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed.

    Args:
        filename (str): Filename to check.

    Returns:
        bool: True if file extension is allowed.
    """
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config.get("ALLOWED_EXTENSIONS", {"step", "stp", "pdf"})


def get_upload_path(part_id: int) -> Path:
    """Get the upload directory path for a part.

    Args:
        part_id (int): Part ID.

    Returns:
        Path: Path to the upload directory for this part.
    """
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    return Path(upload_folder) / str(part_id)


def get_file_mimetype(filename: str) -> str:
    """Determine MIME type based on extension.

    Args:
        filename (str): File name to evaluate.

    Returns:
        str: MIME type string.
    """
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    if ext in {"step", "stp"}:
        return "application/step"
    if ext == "pdf":
        return "application/pdf"
    return "application/octet-stream"


def get_drawing_path(part_id: int, part_identifier: str) -> Path:
    """Resolve the drawing PDF path for a part.

    Args:
        part_id: Numeric part identifier.
        part_identifier: Human readable part identifier.

    Returns:
        Path to the drawing PDF for the part.
    """
    upload_dir = get_upload_path(part_id)
    sanitized_identifier = secure_filename(part_identifier) or str(part_id)
    filename = f"{sanitized_identifier}_drawing.pdf"
    return upload_dir / filename


@parts_bp.route("/<int:part_id>/upload", methods=["POST"])
@require_secret_key
def upload_part_file(part_id):
    """Upload a STEP or PDF file for a part.

    Args:
        part_id (int): Part ID

    Request:
        multipart/form-data with 'file' field containing STEP file

    Returns:
        JSON: Upload result with file metadata
    """
    try:
        part = Part.query.get_or_404(part_id)

        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify(
                {
                    "error": "Invalid file type",
                    "details": f"Only {', '.join(current_app.config.get('ALLOWED_EXTENSIONS', {}))} files are allowed",
                }
            ), 400

        upload_dir = get_upload_path(part_id)
        upload_dir.mkdir(parents=True, exist_ok=True)

        filename = secure_filename(file.filename)
        target_path = upload_dir / filename

        file.save(str(target_path))

        part.file = filename
        db.session.commit()

        file_ext = Path(filename).suffix.lower()
        conversion_result = {"success": False, "gltf_path": None}
        if file_ext in {".step", ".stp"}:
            conversion_result = convert_step_to_gltf(
                str(target_path), str(upload_dir), Path(filename).stem
            )

        response_payload = {
            "message": "File uploaded successfully",
            "filename": filename,
            "file_path": str(target_path),
        }

        if file_ext in {".step", ".stp"}:
            response_payload["conversion"] = {
                "success": conversion_result["success"],
                "error": conversion_result.get("error"),
                "gltf_path": conversion_result.get("gltf_path"),
            }

        return jsonify(response_payload), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(
            f"Error uploading file for part {part_id}: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to upload file"}), 500


@parts_bp.route("/<int:part_id>/download", methods=["GET"])
@require_secret_key
def download_part_file(part_id):
    """Download the original uploaded file for a part.

    Args:
        part_id (int): Part ID

    Returns:
        File: Original STEP file download
    """
    try:
        part = Part.query.get_or_404(part_id)

        if not part.file:
            return jsonify({"error": "No file associated with this part"}), 404

        upload_dir = get_upload_path(part_id)
        file_path = upload_dir / part.file

        if not file_path.exists():
            return jsonify({"error": "File not found on server"}), 404

        mimetype = get_file_mimetype(part.file)
        return send_file(
            str(file_path),
            as_attachment=True,
            download_name=part.file,
            mimetype=mimetype,
        )

    except Exception as e:
        current_app.logger.error(
            f"Error downloading file for part {part_id}: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to download file"}), 500


@parts_bp.route("/<int:part_id>/file", methods=["GET"])
@require_secret_key
def get_part_file(part_id):
    """Serve the stored file inline for preview (PDF or STEP).

    Args:
        part_id (int): Part ID.

    Returns:
        File: Inline file response with appropriate MIME type.
    """
    try:
        part = Part.query.get_or_404(part_id)

        if not part.file:
            return jsonify({"error": "No file associated with this part"}), 404

        upload_dir = get_upload_path(part_id)
        file_path = upload_dir / part.file

        if not file_path.exists():
            return jsonify({"error": "File not found on server"}), 404

        mimetype = get_file_mimetype(part.file)
        return send_file(str(file_path), mimetype=mimetype, as_attachment=False)

    except Exception as e:
        current_app.logger.error(
            f"Error retrieving file for part {part_id}: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to retrieve file"}), 500


@parts_bp.route("/<int:part_id>/drawing", methods=["GET"])
@require_secret_key
def download_part_drawing(part_id):
    """Download or generate the drawing PDF for a hand fabrication part.

    Args:
        part_id: Part identifier.

    Returns:
        File response containing the drawing PDF.
    """
    try:
        part = Part.query.get_or_404(part_id)

        if part.type != "hand":
            return (
                jsonify(
                    {"error": "Drawing downloads are only available for hand fab parts"}
                ),
                400,
            )

        if not part.onshape_url:
            return (
                jsonify({"error": "No Onshape URL is set for this part"}),
                404,
            )

        drawing_path = get_drawing_path(
            part_id, part.part_id or part.name or str(part.id)
        )
        refresh_requested = request.args.get("refresh", "false").lower() == "true"

        if refresh_requested or not drawing_path.exists():
            client = build_onshape_client()
            drawing_path.parent.mkdir(parents=True, exist_ok=True)
            client.download_pdf(part.onshape_url, drawing_path)

        return send_file(
            str(drawing_path),
            as_attachment=True,
            download_name=drawing_path.name,
            mimetype="application/pdf",
        )

    except Exception as error:
        current_app.logger.error(
            f"Error retrieving drawing for part {part_id}: {error}", exc_info=True
        )
        return jsonify({"error": "Failed to retrieve drawing"}), 500


@parts_bp.route("/<int:part_id>/model", methods=["GET"])
@require_secret_key
def get_part_model(part_id):
    """Get the GLTF/GLB model file for visualization.

    Args:
        part_id (int): Part ID

    Returns:
        File: GLTF/GLB file for visualization
    """
    try:
        part = Part.query.get_or_404(part_id)

        if not part.file:
            return jsonify({"error": "No file associated with this part"}), 404

        upload_dir = get_upload_path(part_id)
        filename_stem = Path(part.file).stem
        glb_path = upload_dir / f"{filename_stem}.glb"

        if not glb_path.exists():
            step_path = upload_dir / part.file
            if not step_path.exists():
                return jsonify({"error": "Original file not found"}), 404

            conversion_result = convert_step_to_gltf(
                str(step_path), str(upload_dir), filename_stem
            )

            if not conversion_result["success"]:
                return jsonify(
                    {
                        "error": "Model conversion failed",
                        "details": conversion_result.get("error", "Unknown error"),
                    }
                ), 500

            glb_path = Path(conversion_result["gltf_path"])

        return send_file(
            str(glb_path), mimetype="model/gltf-binary", as_attachment=False
        )

    except Exception as e:
        current_app.logger.error(
            f"Error getting model for part {part_id}: {str(e)}", exc_info=True
        )
        return jsonify({"error": "Failed to retrieve model"}), 500
