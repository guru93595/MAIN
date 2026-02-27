import asyncio
from fastapi.testclient import TestClient
from app.main import app

def run_test():
    client = TestClient(app)
    try:
        response = client.get("/api/v1/nodes/health")
        print("Status code:", response.status_code)
        print("Response:", response.text)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
