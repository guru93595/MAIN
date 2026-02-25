import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("🔍 Testing backend startup...")

try:
    # Test basic imports
    from app.main import app
    print("✅ Backend app imported successfully")
    
    # Test basic app configuration
    print(f"✅ App title: {app.title}")
    print(f"✅ App version: {app.version}")
    
    # Test if we can create a simple request
    from fastapi.testclient import TestClient
    client = TestClient(app)
    
    # Test root endpoint
    response = client.get("/")
    print(f"✅ Root endpoint status: {response.status_code}")
    
    print("\n🎉 Backend can start! The issue is database connection.")
    print("\n📋 Next steps:")
    print("1. Check if Supabase project is active")
    print("2. Verify database is not paused")
    print("3. Try using SQLite temporarily for testing")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("📦 Install requirements: pip install -r requirements.txt")
except Exception as e:
    print(f"❌ Backend error: {e}")
