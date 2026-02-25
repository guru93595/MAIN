"""
Supabase REST API Database Service
Fallback when direct PostgreSQL connection fails
"""
import httpx
import json
import asyncio
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import get_settings

settings = get_settings()

class SupabaseRestService:
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
    
    async def test_connection(self) -> bool:
        """Test if Supabase REST API is accessible"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/nodes?limit=1",
                    headers=self.headers
                )
                return response.status_code == 200
        except:
            return False
    
    async def get_nodes(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get nodes from Supabase"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/nodes?limit={limit}&offset={offset}&order=id",
                    headers=self.headers
                )
                if response.status_code == 200:
                    return response.json()
                return []
        except Exception as e:
            print(f"Error fetching nodes: {e}")
            return []
    
    async def get_node_by_id(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get specific node by ID"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/nodes?id=eq.{node_id}",
                    headers=self.headers
                )
                if response.status_code == 200:
                    data = response.json()
                    return data[0] if data else None
                return None
        except Exception as e:
            print(f"Error fetching node {node_id}: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/users_profiles?id=eq.{user_id}",
                    headers=self.headers
                )
                if response.status_code == 200:
                    data = response.json()
                    return data[0] if data else None
                return None
        except Exception as e:
            print(f"Error fetching user {user_id}: {e}")
            return None
    
    async def create_user(self, user_data: Dict[str, Any]) -> bool:
        """Create a new user"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/rest/v1/users_profiles",
                    json=user_data,
                    headers=self.headers
                )
                return response.status_code in [200, 201]
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
    
    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Update user"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    f"{self.base_url}/rest/v1/users_profiles?id=eq.{user_id}",
                    json=user_data,
                    headers=self.headers
                )
                return response.status_code in [200, 204]
        except Exception as e:
            print(f"Error updating user {user_id}: {e}")
            return False

# Global instance
supabase_rest = SupabaseRestService()

async def get_hybrid_db_session():
    """Get database session with fallback to REST API"""
    # Try to get a regular database session first
    try:
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            # Test if it works
            await asyncio.wait_for(
                session.execute(text("SELECT 1")),
                timeout=3.0
            )
            yield session
            return
    except:
        # Fallback to REST API mode
        print("🔄 Using Supabase REST API fallback")
        yield HybridDbSession()

class HybridDbSession:
    """Hybrid database session that uses REST API when SQL fails"""
    
    def __init__(self):
        self.rest = supabase_rest
    
    async def execute(self, query):
        """Execute query using appropriate method"""
        if "nodes" in str(query):
            # Handle nodes queries
            if "SELECT" in str(query).upper():
                nodes = await self.rest.get_nodes()
                return MockResult(nodes)
        elif "users_profiles" in str(query):
            # Handle user queries
            if "SELECT" in str(query).upper():
                # This would need more sophisticated parsing
                pass
        
        # For other queries, raise an error to indicate limitation
        raise NotImplementedError("This query is not supported in REST API fallback mode")
    
    async def close(self):
        """Mock close method"""
        pass

class MockResult:
    """Mock result for REST API queries"""
    def __init__(self, data):
        self.data = data or []
        self._index = 0
    
    def fetchone(self):
        if self._index < len(self.data):
            result = self.data[self._index]
            self._index += 1
            return MockRow(result)
        return None
    
    def fetchall(self):
        return [MockRow(row) for row in self.data]
    
    def scalar(self):
        return len(self.data)

class MockRow:
    """Mock row for REST API results"""
    def __init__(self, data):
        self._data = data or {}
    
    def __getattr__(self, name):
        return self._data.get(name)
    
    def __getitem__(self, key):
        return self._data[key]
