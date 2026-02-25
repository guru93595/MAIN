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
        # Test PostgreSQL connection
        try:
            from app.db.session import engine
            async with asyncio.wait_for(
                engine.begin(),
                timeout=5.0
            ):
                self.use_rest_api = False
                print("✅ Using PostgreSQL connection")
                return True
        except:
            pass
            
        # Test REST API connection
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/rest/v1/nodes?limit=1",
                    headers=self.headers
                )
                if response.status_code == 200:
                    self.use_rest_api = True
                    print("✅ Using Supabase REST API")
                    return True
        except:
            pass
            
        print("❌ Both PostgreSQL and REST API failed")
        return False
    
    async def execute_query(self, query_type: str, **kwargs):
        """Execute query using appropriate method"""
        if self.use_rest_api:
            return await self._execute_rest_query(query_type, **kwargs)
        else:
            return await self._execute_postgres_query(query_type, **kwargs)
    
    async def _execute_postgres_query(self, query_type: str, **kwargs):
        """Execute query using PostgreSQL"""
        from app.db.session import AsyncSessionLocal
        
        async with AsyncSessionLocal() as session:
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
        from app.models.all_models import Node
        
        result = await session.execute(
            text("SELECT * FROM nodes ORDER BY id LIMIT :limit OFFSET :offset"),
            {"limit": limit, "offset": offset}
        )
        nodes = result.fetchall()
        
        # Convert to expected format
        return [
            {
                "id": node.id,
                "hardware_id": node.hardware_id,
                "device_label": node.device_label,
                "device_type": node.device_type,
                "analytics_type": node.analytics_type,
                "status": node.status,
                "lat": node.lat,
                "long": node.long,
                "location_name": node.location_name,
                "capacity": node.capacity,
                "thingspeak_channel_id": node.thingspeak_channel_id,
                "thingspeak_read_api_key": node.thingspeak_read_api_key,
            }
            for node in nodes
        ]
    
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
