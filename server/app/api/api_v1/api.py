from app.api.api_v1.endpoints import auth, nodes, websockets, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(nodes.router, prefix="/nodes", tags=["nodes"])
api_router.include_router(websockets.router, prefix="/ws", tags=["websockets"])
api_router.include_router(admin.router, tags=["admin"]) # No prefix needed as paths are /communities etc.
# api_router.include_router(users.router, prefix="/users", tags=["users"])
