import jwt
import time
import base64

# Generate a proper Supabase anon key JWT
def generate_supabase_anon_key():
    # This is a template - you need to get the real JWT secret from your Supabase project
    jwt_secret = "fzxLrpyummk6rZjWJbrC63jZmwrgThygVoHF3K0jdJE2F3sUhuVxH7HUGUk5r67NWsjtYCb4x9iEJdKikyhS4A=="
    
    payload = {
        "iss": "https://lkbesdmtazmgzujjoixf.supabase.co",
        "sub": "anonymous",
        "aud": "authenticated",
        "exp": int(time.time()) + (10 * 365 * 24 * 60 * 60),  # 10 years
        "iat": int(time.time()),
        "role": "anon",
        "aalg": "HS256"
    }
    
    # Decode the base64 secret
    try:
        decoded_secret = base64.b64decode(jwt_secret)
        token = jwt.encode(payload, decoded_secret, algorithm="HS256")
        print(f"Generated anon key: {token}")
        return token
    except Exception as e:
        print(f"Error generating token: {e}")
        return None

if __name__ == "__main__":
    generate_supabase_anon_key()
