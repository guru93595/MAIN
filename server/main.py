from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="EvaraTech Backend", version="1.0.0")

# Configure CORS to allow requests from the React Frontend
origins = [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://evara-dashboard.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.api_v1.api import api_router

app.include_router(api_router, prefix="/api/v1")

from app.core.background import start_background_tasks

@app.on_event("startup")
async def startup_event():
    await start_background_tasks()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "EvaraTech Backend"}

@app.get("/")
async def root():
    return {"message": "Welcome to EvaraTech Backend API. Docs at /docs"}
