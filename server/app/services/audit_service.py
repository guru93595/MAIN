import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.all_models import AuditLog

class AuditService:
    @staticmethod
    async def log_action(
        db: AsyncSession,
        action: str,
        user_id: Optional[str],
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Logs an administrative action to the audit_logs table.
        Does NOT commit; caller must manage transaction.
        """
        log_entry = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action=action, # Model uses 'action' (mapped to action_type)
            resource_type=resource_type,
            resource_id=resource_id,
            details=metadata or {}, # Model uses 'details' (mapped to metadata)
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
