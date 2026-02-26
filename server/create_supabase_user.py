import jwt
import time
from datetime import datetime, timedelta

def create_supabase_user():
    """Create a Supabase-compatible user token"""
    
    # Supabase JWT Secret (from your .env)
    jwt_secret = "fzxLrpyummk6rZjWJbrC63jZmwrgThygVoHF3K0jdJE2F3sUhuVxH7HUGUk5r67NWsjtYCb4x9iEJdKikyhS4A=="
    
    # Create user payload
    payload = {
        "aud": "authenticated",
        "exp": int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
        "sub": "simple-user-001",
        "email": "admin@admin.com",
        "phone": "",
        "app_metadata": {
            "provider": "email",
            "role": "superadmin"
        },
        "user_metadata": {
            "email": "admin@admin.com",
            "email_verified": True,
            "phone_verified": False,
            "role": "superadmin",
            "plan": "enterprise"
        },
        "role": "authenticated",
        "aal": "",
        "amr": [{"method": "password", "timestamp": int(time.time())}],
        "session_id": "test-session-123",
        "iat": int(datetime.utcnow().timestamp())
    }
    
    # Generate JWT token
    token = jwt.encode(payload, jwt_secret, algorithm="HS256")
    
    print("🔑 Supabase User Credentials:")
    print("  📧 Email: admin@admin.com")
    print("  🔑 Password: admin123")
    print("  🎫 JWT Token: " + token)
    print()
    print("🔍 Login Instructions:")
    print("  1. Go to: http://localhost:5174/login")
    print("  2. Email: admin@admin.com")
    print("  3. Password: admin123")
    print()
    print("🔧 If login fails, use this token in browser console:")
    print("  localStorage.setItem('evara_session', JSON.stringify({")
    print("    user: {")
    print("      id: 'simple-user-001',")
    print("      email: 'admin@admin.com',")
    print("      role: 'superadmin',")
    print("      plan: 'enterprise'")
    print("    },")
    print("    timestamp: " + str(int(time.time() * 1000)))
    print("  }));")
    print("  window.location.reload();")

if __name__ == "__main__":
    create_supabase_user()
