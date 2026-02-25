import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text
from datetime import datetime

async def migrate_database():
    async with AsyncSessionLocal() as session:
        print("🔧 Starting complete database migration...")
        
        # 1. Add missing columns to nodes table
        print("\n=== ADDING MISSING COLUMNS TO NODES TABLE ===")
        try:
            # Add node_key column (alias for hardware_id)
            await session.execute(text('ALTER TABLE nodes ADD COLUMN node_key TEXT'))
            print("✅ Added node_key column")
        except Exception as e:
            print(f"⚠️ node_key column might already exist: {e}")
        
        try:
            # Add location_name column
            await session.execute(text('ALTER TABLE nodes ADD COLUMN location_name TEXT'))
            print("✅ Added location_name column")
        except Exception as e:
            print(f"⚠️ location_name column might already exist: {e}")
        
        try:
            # Add capacity column
            await session.execute(text('ALTER TABLE nodes ADD COLUMN capacity TEXT'))
            print("✅ Added capacity column")
        except Exception as e:
            print(f"⚠️ capacity column might already exist: {e}")
        
        try:
            # Add thingspeak_channel_id column
            await session.execute(text('ALTER TABLE nodes ADD COLUMN thingspeak_channel_id TEXT'))
            print("✅ Added thingspeak_channel_id column")
        except Exception as e:
            print(f"⚠️ thingspeak_channel_id column might already exist: {e}")
        
        try:
            # Add thingspeak_read_api_key column
            await session.execute(text('ALTER TABLE nodes ADD COLUMN thingspeak_read_api_key TEXT'))
            print("✅ Added thingspeak_read_api_key column")
        except Exception as e:
            print(f"⚠️ thingspeak_read_api_key column might already exist: {e}")
        
        try:
            # Add created_by column
            await session.execute(text('ALTER TABLE nodes ADD COLUMN created_by TEXT'))
            print("✅ Added created_by column")
        except Exception as e:
            print(f"⚠️ created_by column might already exist: {e}")
        
        # Update node_key to match hardware_id for existing records
        await session.execute(text('UPDATE nodes SET node_key = hardware_id WHERE node_key IS NULL'))
        print("✅ Updated node_key values")
        
        # 2. Create missing tables
        print("\n=== CREATING MISSING TABLES ===")
        
        # Create node_assignments table
        try:
            await session.execute(text('''
                CREATE TABLE IF NOT EXISTS node_assignments (
                    id VARCHAR PRIMARY KEY,
                    node_id VARCHAR NOT NULL,
                    user_id VARCHAR NOT NULL,
                    assigned_by VARCHAR,
                    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (node_id) REFERENCES nodes(id),
                    FOREIGN KEY (user_id) REFERENCES users_profiles(id)
                )
            '''))
            print("✅ Created node_assignments table")
        except Exception as e:
            print(f"⚠️ node_assignments table creation: {e}")
        
        # Create pipelines table
        try:
            await session.execute(text('''
                CREATE TABLE IF NOT EXISTS pipelines (
                    id VARCHAR PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    color VARCHAR DEFAULT '#000000',
                    positions TEXT, -- JSON array of [lat, lng] positions
                    created_by VARCHAR,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            print("✅ Created pipelines table")
        except Exception as e:
            print(f"⚠️ pipelines table creation: {e}")
        
        # Create node_analytics table
        try:
            await session.execute(text('''
                CREATE TABLE IF NOT EXISTS node_analytics (
                    id VARCHAR PRIMARY KEY,
                    node_id VARCHAR NOT NULL,
                    period_type VARCHAR NOT NULL CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
                    period_start DATETIME NOT NULL,
                    consumption_liters REAL,
                    avg_level_percent REAL,
                    peak_flow REAL,
                    metadata TEXT, -- JSON
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (node_id) REFERENCES nodes(id)
                )
            '''))
            print("✅ Created node_analytics table")
        except Exception as e:
            print(f"⚠️ node_analytics table creation: {e}")
        
        # 3. Add missing columns to users_profiles
        print("\n=== ADDING MISSING COLUMNS TO USERS_PROFILES TABLE ===")
        try:
            await session.execute(text('ALTER TABLE users_profiles ADD COLUMN plan TEXT DEFAULT "base"'))
            print("✅ Added plan column to users_profiles")
        except Exception as e:
            print(f"⚠️ plan column might already exist: {e}")
        
        try:
            await session.execute(text('ALTER TABLE users_profiles ADD COLUMN created_by TEXT'))
            print("✅ Added created_by column to users_profiles")
        except Exception as e:
            print(f"⚠️ created_by column might already exist: {e}")
        
        try:
            await session.execute(text('ALTER TABLE users_profiles ADD COLUMN distributor_id TEXT'))
            print("✅ Added distributor_id column to users_profiles")
        except Exception as e:
            print(f"⚠️ distributor_id column might already exist: {e}")
        
        # 4. Update existing nodes with proper data
        print("\n=== UPDATING NODES WITH PROPER DATA ===")
        
        # Update nodes with proper location names and capacity based on their type
        await session.execute(text('''
            UPDATE nodes SET 
                location_name = CASE 
                    WHEN device_label LIKE 'Pump House%' THEN 'Pump House Station'
                    WHEN device_label LIKE 'Sump%' THEN 'Sump Station'
                    WHEN device_label LIKE 'OHT%' THEN 'Overhead Tank'
                    WHEN device_label LIKE 'Borewell%' THEN 'Borewell Location'
                    ELSE 'Unknown Location'
                END,
                capacity = CASE
                    WHEN device_label LIKE 'Pump House%' THEN '10 HP'
                    WHEN device_label LIKE 'Sump%' THEN '5000 L'
                    WHEN device_label LIKE 'OHT%' THEN '10000 L'
                    WHEN device_label LIKE 'Borewell%' THEN '5 HP'
                    ELSE 'Unknown'
                END
            WHERE location_name IS NULL OR capacity IS NULL
        '''))
        print("✅ Updated nodes with location names and capacity")
        
        # 5. Seed missing tables with sample data
        print("\n=== SEEDING MISSING TABLES ===")
        
        # Seed node_assignments
        assignments_count = await session.execute(text('SELECT COUNT(*) FROM node_assignments'))
        if assignments_count.scalar() == 0:
            # Assign some nodes to users
            await session.execute(text('''
                INSERT INTO node_assignments (id, node_id, user_id, assigned_by)
                SELECT 
                    'assign_' || LOWER(REPLACE(node.id, '-', '_')),
                    node.id,
                    'usr_admin',
                    'usr_admin'
                FROM nodes 
                LIMIT 10
            '''))
            print("✅ Seeded node_assignments table")
        else:
            print("✅ node_assignments already has data")
        
        # Seed pipelines
        pipelines_count = await session.execute(text('SELECT COUNT(*) FROM pipelines'))
        if pipelines_count.scalar() == 0:
            await session.execute(text('''
                INSERT INTO pipelines (id, name, color, positions, created_by)
                VALUES 
                    ('pipeline_main', 'Main Water Pipeline', '#3B82F6', '[[17.4456, 78.3516], [17.4460, 78.3520], [17.4465, 78.3525]]', 'usr_admin'),
                    ('pipeline_secondary', 'Secondary Pipeline', '#10B981', '[[17.4470, 78.3530], [17.4475, 78.3535], [17.4480, 78.3540]]', 'usr_admin')
            '''))
            print("✅ Seeded pipelines table")
        else:
            print("✅ pipelines already has data")
        
        # Seed node_analytics
        analytics_count = await session.execute(text('SELECT COUNT(*) FROM node_analytics'))
        if analytics_count.scalar() == 0:
            await session.execute(text('''
                INSERT INTO node_analytics (id, node_id, period_type, period_start, consumption_liters, avg_level_percent, peak_flow)
                SELECT 
                    'analytics_' || LOWER(REPLACE(node.id, '-', '_')) || '_' || strftime('%Y%m%d', 'now'),
                    node.id,
                    'daily',
                    date('now', '-1 day'),
                    CASE WHEN node.status = 'Online' THEN (RANDOM() % 1000 + 100) ELSE 0 END,
                    CASE WHEN node.status = 'Online' THEN (RANDOM() % 100 + 20) ELSE 0 END,
                    CASE WHEN node.status = 'Online' THEN (RANDOM() % 50 + 10) ELSE 0 END
                FROM nodes 
                WHERE node.status = 'Online'
                LIMIT 20
            '''))
            print("✅ Seeded node_analytics table")
        else:
            print("✅ node_analytics already has data")
        
        await session.commit()
        print("\n🎉 Database migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_database())
