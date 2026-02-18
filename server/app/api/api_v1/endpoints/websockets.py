from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websockets import manager

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for optional client messages
            data = await websocket.receive_text()
            # Echo back for now or handle client commands
            await manager.send_personal_message(f"You wrote: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
