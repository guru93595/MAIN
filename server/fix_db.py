import asyncio
import traceback
from sqlalchemy import text
from app.db.session import engine

async def main():
    """
    Comprehensive schema fix: Query actual DB columns for every table and compare 
    against what SQLAlchemy models expect. Add any missing columns.
    """
    # Define what each table MUST have based on all_models.py
    EXPECTED = {
        "device_thingspeak_mapping": {
            "id": "VARCHAR PRIMARY KEY",
            "device_id": "VARCHAR",
            "channel_id": "VARCHAR",
            "read_api_key": "VARCHAR",
            "write_api_key": "VARCHAR",
            "field_mapping": "JSON",
            "last_sync_time": "TIMESTAMP WITHOUT TIME ZONE",
        },
        "device_config_tank": {
            "device_id": "VARCHAR PRIMARY KEY",
            "capacity": "INTEGER",
            "max_depth": "FLOAT",
            "temp_enabled": "BOOLEAN DEFAULT FALSE",
        },
        "device_config_deep": {
            "device_id": "VARCHAR PRIMARY KEY",
            "static_depth": "FLOAT",
            "dynamic_depth": "FLOAT",
            "recharge_threshold": "FLOAT",
        },
        "device_config_flow": {
            "device_id": "VARCHAR PRIMARY KEY",
            "max_flow_rate": "FLOAT",
            "pipe_diameter": "FLOAT",
            "abnormal_threshold": "FLOAT",
        },
    }

    try:
        for table, columns in EXPECTED.items():
            async with engine.begin() as conn:
                # Get existing columns
                result = await conn.execute(text(
                    f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}';"
                ))
                existing = {row[0] for row in result.fetchall()}
                print(f"\n📋 {table}: existing columns = {existing}")
                
                for col, col_type in columns.items():
                    if col not in existing:
                        # For PRIMARY KEY columns, we need special handling
                        if "PRIMARY KEY" in col_type:
                            base_type = col_type.replace(" PRIMARY KEY", "")
                            try:
                                await conn.execute(text(
                                    f'ALTER TABLE "{table}" ADD COLUMN "{col}" {base_type};'
                                ))
                                print(f"  ✅ Added {col} ({base_type})")
                            except Exception as e:
                                print(f"  ⚠️ {col}: {str(e)[:100]}")
                        else:
                            try:
                                await conn.execute(text(
                                    f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{col}" {col_type};'
                                ))
                                print(f"  ✅ Added {col} ({col_type})")
                            except Exception as e:
                                print(f"  ⚠️ {col}: {str(e)[:100]}")
                    else:
                        print(f"  ✓ {col} exists")
                        
        print("\n🎉 Schema fix complete!")
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
