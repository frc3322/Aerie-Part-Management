"""Part model for the Part Management System."""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from typing import Optional

db = SQLAlchemy()


class Part(db.Model):
    """Represents a part in the manufacturing workflow.

    Attributes:
        id (int): Primary key, auto-incremented
        type (str): Part type - 'cnc' or 'hand'
        name (str): Part name/description
        part_id (str): Human-friendly part identifier
        subsystem (str): System subsystem the part belongs to
        assigned (str): Name of assigned team member
        status (str): Current status in workflow
        notes (str): Additional notes or comments
        file (str): Associated file name (e.g., STL file)
        onshape_url (str): URL to Onshape document
        claimed_date (datetime): Date when part was claimed
        created_at (datetime): Record creation timestamp
        updated_at (datetime): Last update timestamp
        category (str): Current workflow category (review, cnc, hand, completed)
    """

    __tablename__ = "parts"

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=True)  # 'cnc' or 'hand'
    material = db.Column(db.String(200), nullable=False)
    part_id = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(200), nullable=True)
    subsystem = db.Column(db.String(100), nullable=True)
    assigned = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), nullable=False, default="Pending")
    misc_info = db.Column(db.JSON, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    file = db.Column(db.String(200), nullable=True)
    onshape_url = db.Column(db.String(500), nullable=True)
    claimed_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    amount = db.Column(db.Integer, nullable=False, default=1)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
    )
    category = db.Column(
        db.String(20), nullable=False, default="review", index=True
    )  # review, cnc, hand, completed

    def __init__(self, **kwargs):
        """Initialize part with provided data."""
        super().__init__(**kwargs)
        if not self.status:
            self.status = "Pending"
        if not self.category:
            self.category = "review"
        if not self.amount:
            self.amount = 1
        if not self.part_id:
            self.part_id = ""

    def to_dict(self) -> dict:
        """Convert part to dictionary representation.

        Returns:
            dict: Part data as dictionary
        """
        return {
            "id": self.id,
            "type": self.type,
            "material": self.material,
            "name": self.name,
            "partId": self.part_id,
            "subsystem": self.subsystem,
            "assigned": self.assigned,
            "status": self.status,
            "miscInfo": self.misc_info,
            "notes": self.notes,
            "file": self.file,
            "onshapeUrl": self.onshape_url,
            "claimedDate": self.claimed_date.isoformat() if self.claimed_date else None,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "category": self.category,
            "amount": self.amount,
        }

    def update_from_dict(self, data: dict) -> None:
        """Update part attributes from dictionary.

        Args:
            data (dict): Dictionary containing part attributes to update
        """
        allowed_fields = {
            "type",
            "material",
            "name",
            "part_id",
            "subsystem",
            "assigned",
            "status",
            "misc_info",
            "notes",
            "file",
            "onshape_url",
            "claimed_date",
            "category",
            "amount",
        }

        # Map camelCase field names to snake_case for API compatibility
        field_mapping = {
            "onshapeUrl": "onshape_url",
            "claimedDate": "claimed_date",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
            "partId": "part_id",
            "miscInfo": "misc_info",
        }

        for key, value in data.items():
            # Map camelCase to snake_case if needed
            mapped_key = field_mapping.get(key, key)

            if mapped_key in allowed_fields and hasattr(self, mapped_key):
                if mapped_key == "misc_info":
                    if isinstance(value, dict):
                        self.misc_info = value
                    else:
                        self.misc_info = None
                    continue
                if mapped_key == "amount" and value is not None:
                    try:
                        parsed_amount = int(value)
                        self.amount = parsed_amount if parsed_amount > 0 else 1
                    except (TypeError, ValueError):
                        self.amount = 1
                else:
                    setattr(self, mapped_key, value)

        self.updated_at = datetime.now(timezone.utc)

    @classmethod
    def get_by_category(cls, category: str):
        """Get all parts in a specific category.

        Args:
            category (str): Category to filter by

        Returns:
            Query: SQLAlchemy query object
        """
        return cls.query.filter_by(category=category)

    @classmethod
    def search_parts(cls, query: str, category: Optional[str] = None):
        """Search parts by name, notes, or subsystem.

        Args:
            query (str): Search query string
            category (str, optional): Limit search to specific category

        Returns:
            Query: SQLAlchemy query object
        """
        search_filter = db.or_(
            cls.name.ilike(f"%{query}%"),
            cls.notes.ilike(f"%{query}%"),
            cls.subsystem.ilike(f"%{query}%"),
            cls.assigned.ilike(f"%{query}%"),
            cls.material.ilike(f"%{query}%"),
            cls.part_id.ilike(f"%{query}%"),
        )

        if category:
            return cls.query.filter(search_filter, cls.category == category)
        return cls.query.filter(search_filter)

    def __repr__(self) -> str:
        """String representation of the part."""
        return f"<Part {self.id}: {self.name} ({self.status})>"
