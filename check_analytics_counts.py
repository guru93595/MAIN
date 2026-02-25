import asyncio
import httpx
import os
from dotenv import load_dotenv
from collections import Counter

# Load environment variables
load_dotenv('server/.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

async def check_analytics_counts():
    """Check actual analytics types and counts in the database"""
    print("🔍 CHECKING ANALYTICS COUNTS")
    print("=" * 40)
    
    try:
        # Get token from backend
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={
                    "email": "admin@evaratech.com",
                    "password": "admin123456"
                },
                headers={
                    'apikey': SUPABASE_KEY,
                    'Authorization': f'Bearer {SUPABASE_KEY}',
                    'Content-Type': 'application/json'
                }
            )
            
            if token_response.status_code != 200:
                print(f"❌ Failed to get token: {token_response.text}")
                return
            
            token_data = token_response.json()
            token = token_data['access_token']
            
            # Get all nodes
            nodes_response = await client.get(
                "http://localhost:8000/api/v1/nodes/",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                },
                timeout=10.0
            )
            
            if nodes_response.status_code == 200:
                nodes = nodes_response.json()
                print(f"✅ Total nodes: {len(nodes)}")
                
                # Count by analytics_type
                analytics_counts = Counter()
                category_counts = Counter()
                status_counts = Counter()
                
                for node in nodes:
                    analytics_type = node.get('analytics_type', 'Unknown')
                    category = node.get('category', 'Unknown')
                    status = node.get('status', 'Unknown')
                    
                    analytics_counts[analytics_type] += 1
                    category_counts[category] += 1
                    status_counts[status] += 1
                
                print("\n📊 Analytics Type Counts:")
                for analytics_type, count in analytics_counts.most_common():
                    print(f"   {analytics_type}: {count}")
                
                print("\n📊 Category Counts:")
                for category, count in category_counts.most_common():
                    print(f"   {category}: {count}")
                
                print("\n📊 Status Counts:")
                for status, count in status_counts.most_common():
                    print(f"   {status}: {count}")
                
                # Show sample nodes for each type
                print("\n🔍 Sample Nodes by Analytics Type:")
                for analytics_type in analytics_counts.keys():
                    sample_nodes = [n for n in nodes if n.get('analytics_type') == analytics_type][:2]
                    print(f"\n   {analytics_type}:")
                    for node in sample_nodes:
                        print(f"      - {node.get('label', 'Unknown')} ({node.get('category', 'Unknown')})")
                
            else:
                print(f"❌ Failed to get nodes: {nodes_response.status_code}")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_analytics_counts())
