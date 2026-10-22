"""Routes package initialization."""

from .parts import parts_bp
from .options import options_bp
from .system import system_bp

__all__ = ["parts_bp", "options_bp", "system_bp"]
