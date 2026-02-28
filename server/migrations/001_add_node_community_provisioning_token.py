"""
Migration 001: Add missing Node/Community columns and ProvisioningToken table.

Run from server/: python -m migrations.001_add_node_community_provisioning_token

For fresh installs: create_tables() handles this. Use only for existing DBs.
ROLLBACK: Dropping new columns/tables will lose data. Backup first.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


async def run_migration():
    from sqlalchemy import text
    from app.core.config import get_settings
    from app.db.session import engine

    settings = get_settings()
    is_postgres = "postgresql" in (settings.DATABASE_URL or "")
    # SQLite: TEXT/REAL; PostgreSQL: VARCHAR/FLOAT/JSONB
    col_type_json = "JSONB" if is_postgres else "TEXT"

    migrations = [
        ("ALTER TABLE nodes ADD COLUMN firmware_version VARCHAR(255)", "nodes.firmware_version"),
        ("ALTER TABLE nodes ADD COLUMN calibration_factor FLOAT", "nodes.calibration_factor"),
        (f"ALTER TABLE nodes ADD COLUMN shadow_state {col_type_json}", "nodes.shadow_state"),
        ("ALTER TABLE nodes ADD COLUMN organization_id VARCHAR(255)", "nodes.organization_id"),
        ("ALTER TABLE communities ADD COLUMN organization_id VARCHAR(255)", "communities.organization_id"),
    ]

    create_table = """
    CREATE TABLE IF NOT EXISTS provisioning_tokens (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        created_by_user_id VARCHAR(255),
        community_id VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """

    async with engine.begin() as conn:
        for stmt, label in migrations:
            try:
                await conn.execute(text(stmt))
                print(f"OK: {label}")
            except Exception as e:
                err = str(e).lower()
                if "duplicate column" in err or "already exists" in err:
                    print(f"SKIP (exists): {label}")
                else:
                    raise
        await conn.execute(text(create_table))
        print("OK: provisioning_tokens")


if __name__ == "__main__":
    asyncio.run(run_migration())
    print("Migration 001 complete.")
