import httpx
from app.core.config import get_settings

class SupabaseAuthService:
    def __init__(self):
        self.settings = get_settings()
        self.url = self.settings.SUPABASE_URL
        self.key = self.settings.SUPABASE_KEY

    async def create_user(self, email: str, password: str = None, user_metadata: dict = None):
        """
        Creates a new user in Supabase Auth using the admin API (Service Role Key).
        """
        if not self.url or not self.key:
            # Fallback or log error for local dev without keys
            print("WARNING: Supabase URL or Key missing. Skipping auth creation.")
            return None

        import uuid
        if not password:
            password = str(uuid.uuid4()) # Secure random password

        headers = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": user_metadata or {}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.url}/auth/v1/admin/users",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 201:
                error_msg = response.json().get('msg', 'Unknown error')
                print(f"FAILED TO CREATE USER: {error_msg}")
                return None
            
            return response.json()
