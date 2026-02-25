import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text
from datetime import datetime

async def migrate_database():
    async with AsyncSessionLocal() as session:
        print("🔧 Starting database migration...")
        
        # 1. Add missing columns to nodes table
        print("\n=== ADDING MISSING COLUMNS TO NODES TABLE ===")
        
        columns_to_add = [
            ('node_key', 'TEXT'),
            ('location_name', 'TEXT'),
            ('capacity', 'TEXT'),
            ('thingspeak_channel_id', 'TEXT'),
            ('thingspeak_read_api_key', 'TEXT'),
            ('created_by', 'TEXT')
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await session.execute(text(f'ALTER TABLE nodes ADD COLUMN {col_name} {col_type}'))
                print(f"✅ Added {col_name} column")
            except Exception as e:
                print(f"⚠️ {col_name} column might already exist: {e}")
        
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
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
                    positions TEXT,
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
                    period_type VARCHAR NOT NULL,
                    period_start DATETIME NOT NULL,
                    consumption_liters REAL,
                    avg_level_percent REAL,
                    peak_flow REAL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            print("✅ Created node_analytics table")
        except Exception as e:
            print(f"⚠️ node_analytics table creation: {e}")
        
        # 3. Add missing columns to users_profiles
        print("\n=== ADDING MISSING COLUMNS TO USERS_PROFILES TABLE ===")
        
        user_columns = [
            ('plan', 'TEXT DEFAULT "base"'),
            ('created_by', 'TEXT'),
            ('distributor_id', 'TEXT')
        ]
        
        for col_name, col_def in user_columns:
            try:
                await session.execute(text(f'ALTER TABLE users_profiles ADD COLUMN {col_name} {col_def}'))
                print(f"✅ Added {col_name} column to users_profiles")
            except Exception as e:
                print(f"⚠️ {col_name} column might already exist: {e}")
        
        # 4. Update existing nodes with proper data
        print("\n=== UPDATING NODES WITH PROPER DATA ===")
        
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
            await session.execute(text('''
                INSERT INTO node_assignments (id, node_id, user_id, assigned_by)
                SELECT 
                    'assign_' || LOWER(REPLACE(id, '-', '_')),
                    id,
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
                    'analytics_' || LOWER(REPLACE(id, '-', '_')) || '_' || strftime('%Y%m%d', 'now'),
                    id,
                    'daily',
                    date('now', '-1 day'),
                    CASE WHEN status = 'Online' THEN (RANDOM() % 1000 + 100) ELSE 0 END,
                    CASE WHEN status = 'Online' THEN (RANDOM() % 100 + 20) ELSE 0 END,
                    CASE WHEN status = 'Online' THEN (RANDOM() % 50 + 10) ELSE 0 END
                FROM nodes 
                WHERE status = 'Online'
                LIMIT 20
            '''))
            print("✅ Seeded node_analytics table")
        else:
            print("✅ node_analytics already has data")
        
        await session.commit()
        print("\n🎉 Database migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_database())
