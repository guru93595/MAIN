from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # List of active connections
        self.active_connections: List[WebSocket] = []
        # Mapping for specific room/node subscriptions (future use)
        self.subscriptions: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"WS Connected: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"WS Disconnected: {websocket.client}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        """Broadcasts a message to all connected clients."""
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting to {connection.client}: {e}")
                # Ideally, remove dead connection here
                pass

manager = ConnectionManager()
