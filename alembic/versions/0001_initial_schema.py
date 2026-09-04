"""Initial Phase 1 schema.

Revision ID: 0001
"""
from alembic import op
from app.database.session import Base
import app.models
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Metadata is the single typed schema definition; checkfirst makes local setup repeat-safe.
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)

def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind(), checkfirst=True)
