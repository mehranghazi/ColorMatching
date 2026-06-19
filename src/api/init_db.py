import logging

from sqlalchemy import text

from .database import engine

logger = logging.getLogger(__name__)


def init_database():
    """Create auth-related tables and columns if they do not exist."""
    statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
        """,
        """
        ALTER TABLE matching_session
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)
        """,
        """
        ALTER TABLE matching_session
        ADD COLUMN IF NOT EXISTS input_type VARCHAR(20) DEFAULT 'rgb'
        """,
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
    logger.info("Database schema initialized (users table + matching_session columns)")
