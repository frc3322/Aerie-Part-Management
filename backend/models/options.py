"""Site options model for storing configurable dropdown lists."""

from .part import db

DEFAULT_MATERIALS = ["Polycarb", "Aluminum", "Acrylic"]
DEFAULT_SUBSYSTEMS = ["turret", "shooter", "spindexer", "intake", "climber", "hopper"]


class SiteOptions(db.Model):
    """Single-row table that stores site-wide configurable dropdown options."""

    __tablename__ = "site_options"

    id = db.Column(db.Integer, primary_key=True)
    materials = db.Column(db.JSON, nullable=False)
    subsystems = db.Column(db.JSON, nullable=False)

    @classmethod
    def get_or_create(cls):
        """Return the single options row, creating it with defaults if absent."""
        opts = cls.query.first()
        if opts is None:
            opts = cls(
                materials=list(DEFAULT_MATERIALS),
                subsystems=list(DEFAULT_SUBSYSTEMS),
            )
            db.session.add(opts)
            db.session.commit()
        return opts
