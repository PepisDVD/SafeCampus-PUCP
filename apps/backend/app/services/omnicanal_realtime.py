"""In-process WebSocket hub for the operational omnichannel inbox."""

from __future__ import annotations

from fastapi import WebSocket

from app.schemas.omnicanal import OmnicanalRealtimeEvent


class OmnicanalRealtimeHub:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, event: OmnicanalRealtimeEvent) -> None:
        stale: list[WebSocket] = []
        payload = event.model_dump(mode="json")
        for websocket in self._connections:
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(websocket)


omnicanal_realtime_hub = OmnicanalRealtimeHub()
