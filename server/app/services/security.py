from cryptography.fernet import Fernet
import base64
from app.core.config import get_settings
from typing import Optional

settings = get_settings()

class EncryptionService:
    @staticmethod
    def _get_fernet() -> Fernet:
        # Generate a deterministic key from the SECRET_KEY for now
        # In a real enterprise app, this should be a separate environment variable
        key = settings.SECRET_KEY
        if len(key) < 32:
            key = key.ljust(32, '0')
        elif len(key) > 32:
            key = key[:32]
        
        fernet_key = base64.urlsafe_b64encode(key.encode())
        return Fernet(fernet_key)

    @classmethod
    def encrypt(cls, data: str) -> str:
        if not data:
            return ""
        f = cls._get_fernet()
        return f.encrypt(data.encode()).decode()

    @classmethod
    def decrypt(cls, encrypted_data: str) -> str:
        if not encrypted_data or encrypted_data == "":
            return ""
        f = cls._get_fernet()
        try:
            return f.decrypt(encrypted_data.encode()).decode()
        except Exception:
            # If decryption fails (e.g. data was not encrypted) return as is for migration safety
            return encrypted_data
