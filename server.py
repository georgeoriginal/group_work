from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[tuple[WebSocket, str]] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        client_ip = websocket.client.host
        self.active_connections.append((websocket, client_ip))
        print(f"[+] {client_ip} connected.")

    def disconnect(self, websocket: WebSocket):
        for conn in self.active_connections:
            if conn[0] == websocket:
                self.active_connections.remove(conn)
                print(f"[-] {conn[1]} disconnected.")
                break

    async def broadcast(self, message: str, sender: WebSocket):
        sender_ip = sender.client.host
        print(f"[>] {sender_ip} sent: {message}")
        for conn, client_ip in self.active_connections:
            await conn.send_text(f"{sender_ip}: {message}")
            print(f"[<] Delivered to {client_ip}")

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
