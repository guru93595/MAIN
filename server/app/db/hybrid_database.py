"""
Hybrid Database Service
Uses PostgreSQL when available, falls back to Supabase REST API
"""
import asyncio
import httpx
import json
from typing import List, Dict, Any, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import get_settings

settings = get_settings()

class HybridDatabaseService:
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.key = settings.SUPABASE_KEY
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        self.use_rest_api = False
        
    async def initialize(self):
        """Initialize and determine which method to use"""
        if getattr(self, 'initialized', False):
            return True
            
        print("🔗 Initializing Hybrid Database Service...")
        # Test PostgreSQL connection
        try:
            from app.db.session import engine
            async with asyncio.wait_for(engine.begin(), timeout=3.0) as conn:
                self.use_rest_api = False
                self.initialized = True
                print("✅ Using PostgreSQL connection")
                return True
        except Exception as e:
            print(f"⚠️ PostgreSQL check failed: {e}")
            
        # Test REST API connection
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/nodes?limit=1",
                    headers=self.headers
                )
                if response.status_code == 200:
                    self.use_rest_api = True
                    self.initialized = True
                    print("✅ Using Supabase REST API")
                    return True
        except Exception as e:
            print(f"⚠️ REST API check failed: {e}")
            
        print("❌ Both PostgreSQL and REST API failed to connect")
        self.initialized = True # Mark as initialized anyway to prevent repeated hangs
        return False
    
    async def execute_query(self, query_type: str, db_session: Optional[AsyncSession] = None, **kwargs):
        """Execute query using appropriate method with fallback support"""
        if not getattr(self, 'initialized', False):
            await self.initialize()

        try:
            if self.use_rest_api:
                return await self._execute_rest_query(query_type, **kwargs)
            else:
                return await self._execute_postgres_query(query_type, db_session=db_session, **kwargs)
        except Exception as e:
            print(f"❌ Query execution failed ({query_type}): {e}")
            
            # Fallback if preferred method failed
            if not self.use_rest_api:
                print("🔄 Falling back to REST API...")
                try:
                    return await self._execute_rest_query(query_type, **kwargs)
                except:
                    pass
            
            raise e
    
    async def _execute_postgres_query(self, query_type: str, db_session: Optional[AsyncSession] = None, **kwargs):
        """Execute query using PostgreSQL or provided session"""
        if db_session:
            return await self._dispatch_postgres(db_session, query_type, **kwargs)
        
        from app.db.session import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            return await self._dispatch_postgres(session, query_type, **kwargs)

    async def _dispatch_postgres(self, session: AsyncSession, query_type: str, **kwargs):
        if query_type == "get_nodes":
            return await self._get_nodes_postgres(session, **kwargs)
        elif query_type == "get_user":
            return await self._get_user_postgres(session, **kwargs)
        elif query_type == "create_user":
            return await self._create_user_postgres(session, **kwargs)
        else:
            raise NotImplementedError(f"Query type {query_type} not implemented")
    
    async def _execute_rest_query(self, query_type: str, **kwargs):
        """Execute query using REST API"""
        if query_type == "get_nodes":
            return await self._get_nodes_rest(**kwargs)
        elif query_type == "get_user":
            return await self._get_user_rest(**kwargs)
        elif query_type == "create_user":
            return await self._create_user_rest(**kwargs)
        else:
            raise NotImplementedError(f"Query type {query_type} not implemented")
    
    async def _get_nodes_postgres(self, session: AsyncSession, limit: int = 100, offset: int = 0):
        """Get nodes using PostgreSQL"""
        result = await session.execute(
            text("SELECT * FROM nodes ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
            {"limit": limit, "offset": offset}
        )
        nodes = result.fetchall()
        
        # Robust conversion (works for both row objects and dict-like rows)
        output = []
        for node in nodes:
            # Handle SQLAlchemy 2.0+ Row objects
            try:
                row_dict = node._asdict()
            except AttributeError:
                # Fallback for other row types or older versions
                row_dict = dict(node) if hasattr(node, "keys") else {}
                
            output.append({
                "id": row_dict.get("id"),
                "hardware_id": row_dict.get("hardware_id"),
                "device_label": row_dict.get("device_label"),
                "device_type": row_dict.get("device_type"),
                "analytics_type": row_dict.get("analytics_type"),
                "status": row_dict.get("status"),
                "lat": row_dict.get("lat"),
                "long": row_dict.get("long"),
                "location_name": row_dict.get("location_name"),
                "capacity": row_dict.get("capacity"),
                "thingspeak_channel_id": row_dict.get("thingspeak_channel_id"),
                "thingspeak_read_api_key": row_dict.get("thingspeak_read_api_key"),
            })
        return output
    
    async def _get_nodes_rest(self, limit: int = 100, offset: int = 0):
        """Get nodes using REST API"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.base_url}/rest/v1/nodes?limit={limit}&offset={offset}&order=id",
                headers=self.headers
            )
            
            if response.status_code == 200:
                nodes = response.json()
                return [
                    {
                        "id": node.get("id"),
                        "hardware_id": node.get("hardware_id"),
                        "device_label": node.get("device_label"),
                        "device_type": node.get("device_type"),
                        "analytics_type": node.get("analytics_type"),
                        "status": node.get("status"),
                        "lat": node.get("lat"),
                        "long": node.get("long"),
                        "location_name": node.get("location_name"),
                        "capacity": node.get("capacity"),
                        "thingspeak_channel_id": node.get("thingspeak_channel_id"),
                        "thingspeak_read_api_key": node.get("thingspeak_read_api_key"),
                    }
                    for node in nodes
                ]
            return []
    
    async def _get_user_postgres(self, session: AsyncSession, user_id: str):
        """Get user using PostgreSQL"""
        from app.models.all_models import User
        
        result = await session.execute(
            text("SELECT * FROM users_profiles WHERE id = :user_id"),
            {"user_id": user_id}
        )
        user = result.fetchone()
        
        if user:
            return {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "plan": user.plan,
                "community_id": user.community_id,
                "organization_id": user.organization_id,
            }
        return None
    
    async def _get_user_rest(self, user_id: str):
        """Get user using REST API"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.base_url}/rest/v1/users_profiles?id=eq.{user_id}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                users = response.json()
                if users:
                    user = users[0]
                    return {
                        "id": user.get("id"),
                        "email": user.get("email"),
                        "role": user.get("role"),
                        "plan": user.get("plan"),
                        "community_id": user.get("community_id"),
                        "organization_id": user.get("organization_id"),
                    }
        return None
    
    async def _create_user_postgres(self, session: AsyncSession, user_data: dict):
        """Create user using PostgreSQL"""
        try:
            await session.execute(
                text("""
                    INSERT INTO users_profiles (id, email, role, plan, community_id, organization_id, created_at)
                    VALUES (:id, :email, :role, :plan, :community_id, :organization_id, :created_at)
                """),
                user_data
            )
            await session.commit()
            return True
        except:
            return False
    
    async def _create_user_rest(self, user_data: dict):
        """Create user using REST API"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{self.base_url}/rest/v1/users_profiles",
                json=user_data,
                headers=self.headers
            )
            return response.status_code in [200, 201]

# Global instance
hybrid_db = HybridDatabaseService()
