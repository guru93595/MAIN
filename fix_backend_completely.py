import asyncio
import asyncpg
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('server/.env')

DATABASE_URL = os.getenv('DATABASE_URL')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

async def test_all_connections():
    """Test all possible connection methods"""
    print("🔍 COMPREHENSIVE BACKEND CONNECTION TEST")
    print("=" * 50)
    
    # Test 1: Direct PostgreSQL connection
    print("\n1️⃣ Testing Direct PostgreSQL Connection...")
    try:
        if DATABASE_URL.startswith("postgresql+asyncpg://"):
            conn_str = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        else:
            conn_str = DATABASE_URL
            
        print(f"   Connection string: {conn_str}")
        
        conn = await asyncio.wait_for(
            asyncpg.connect(conn_str),
            timeout=15.0
        )
        
        # Test query
        result = await conn.fetchval("SELECT 1")
        print(f"   ✅ Direct connection successful: {result}")
        
        # Check tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"   ✅ Found {len(tables)} tables:")
        for table in tables:
            print(f"      - {table['table_name']}")
            
        # Check nodes
        node_count = await conn.fetchval("SELECT COUNT(*) FROM nodes")
        print(f"   ✅ Nodes in database: {node_count}")
        
        await conn.close()
        return "direct"
        
    except asyncio.TimeoutError:
        print("   ❌ Direct connection: TIMEOUT")
    except Exception as e:
        print(f"   ❌ Direct connection: {e}")
    
    # Test 2: Supabase REST API
    print("\n2️⃣ Testing Supabase REST API...")
    try:
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/nodes?limit=1",
                headers=headers
            )
            
            if response.status_code == 200:
                print("   ✅ REST API connection successful")
                
                # Get node count
                count_response = await client.get(
                    f"{SUPABASE_URL}/rest/v1/nodes?select=count",
                    headers=headers
                )
                
                if count_response.status_code == 200:
                    data = count_response.json()
                    print(f"   ✅ Found {len(data)} nodes via REST API")
                
                return "rest"
            else:
                print(f"   ❌ REST API failed: {response.status_code}")
                
    except Exception as e:
        print(f"   ❌ REST API connection: {e}")
    
    # Test 3: Alternative connection strings
    print("\n3️⃣ Testing Alternative Connection Strings...")
    
    alternatives = [
        # Try different port configurations
        "postgresql://postgres:kR5KBJAja6xeeFbZ@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
        "postgresql://postgres:kR5KBJAja6xeeFbZ@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require",
        "postgresql://postgres:kR5KBJAja6xeeFbZ@db.lkbesdmtazmgzujjoixf.supabase.co:5432/postgres?sslmode=require",
        # Try pooler connection
        "postgresql://postgres.kR5KBJAja6xeeFbZ@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require",
    ]
    
    for i, alt_url in enumerate(alternatives):
        try:
            print(f"   Testing alternative {i+1}...")
            conn = await asyncio.wait_for(
                asyncpg.connect(alt_url),
                timeout=10.0
            )
            
            result = await conn.fetchval("SELECT 1")
            print(f"   ✅ Alternative {i+1} works: {result}")
            await conn.close()
            return alt_url
            
        except Exception as e:
            print(f"   ❌ Alternative {i+1} failed: {e}")
    
    return None

async def create_working_config():
    """Create a working backend configuration"""
    print("\n🔧 CREATING WORKING BACKEND CONFIGURATION")
    print("=" * 50)
    
    working_method = await test_all_connections()
    
    if working_method == "direct":
        print("\n✅ SOLUTION: Direct PostgreSQL connection works!")
        print("   Backend should work with current configuration.")
        print("   Issue might be in the backend connection pooling.")
        
    elif working_method == "rest":
        print("\n✅ SOLUTION: Use Supabase REST API as primary method!")
        print("   Update backend to use REST API instead of direct connection.")
        
    elif working_method and working_method.startswith("postgresql://"):
        print(f"\n✅ SOLUTION: Use this connection string!")
        print(f"   Update DATABASE_URL in .env to:")
        print(f"   {working_method}")
        
    else:
        print("\n❌ ALL CONNECTION METHODS FAILED")
        print("   This indicates a network connectivity issue to Supabase.")
        print("   Possible solutions:")
        print("   1. Check internet connection")
        print("   2. Try different network")
        print("   3. Use VPN to different region")
        print("   4. Contact Supabase support")

if __name__ == "__main__":
    asyncio.run(create_working_config())
