"""Onshape OAuth session model."""

from datetime import datetime, timezone

from .part import db


class OnshapeSession(db.Model):
    """Persisted Onshape OAuth session linked to an app API key."""

    __tablename__ = "onshape_sessions"

    app_api_key = db.Column(db.String(255), primary_key=True)
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expiry = db.Column(db.DateTime, nullable=False)
    user_info = db.Column(db.JSON, nullable=True)
    authenticated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
    )
