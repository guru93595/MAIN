from typing import Any, Dict, Optional
import logging
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    async def send_welcome_email(email: str, full_name: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Triggered when a new customer is registered.
        Currently logs the event; can be hooked into SendGrid/AWS SES.
        """
        logger.info(f"📧 EMAIL TRIGGER: Welcome to EvaraTech | Recipient: {email} ({full_name})")
        # Logic for template rendering and SMTP/API call would go here
        return True

    @staticmethod
    async def send_system_alert(alert_type: str, details: Dict[str, Any], severity: str = "medium"):
        """
        Triggered for critical system events like provisioning failures or device offline.
        """
        logger.warning(f"🚨 SYSTEM ALERT [{severity.upper()}]: {alert_type} | Details: {details}")
        # Could trigger SMS, Slack, or email to SuperAdmins
        return True

    @staticmethod
    async def send_provisioning_success(email: str, node_label: str):
        """
        Notify customer that their device is now live.
        """
        logger.info(f"📧 EMAIL TRIGGER: Device Live | Recipient: {email} | Node: {node_label}")
        return True
