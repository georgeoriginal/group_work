from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import json

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Data structures
active_chats = {}   # {"Alice": "Bob", "Bob": "Alice"}
name_to_ip = {}     # {"Alice": "1.2.3.4"}

# Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[tuple[WebSocket, str, str]] = []  # (WebSocket, IP, Name)

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        ip = websocket.client.host
        self.active_connections.append((websocket, ip, None))
        print(f"[+] {ip} connected.")

    def disconnect(self, websocket: WebSocket):
        for conn in self.active_connections:
            if conn[0] == websocket:
                self.active_connections.remove(conn)
                print(f"[-] {conn[1]} disconnected.")
                break

    async def set_name(self, websocket: WebSocket, name: str):
        for i, (ws, ip, _) in enumerate(self.active_connections):
            if ws == websocket:
                self.active_connections[i] = (ws, ip, name)
                name_to_ip[name] = ip
                print(f"[+] Name registered: {name} => {ip}")
                break

    def get_socket_by_name(self, name: str):
        for ws, _, n in self.active_connections:
            if n == name:
                return ws
        return None

    def get_ip_by_name(self, name: str):
        return name_to_ip.get(name)

    def get_name_by_socket(self, websocket: WebSocket):
        for ws, _, name in self.active_connections:
            if ws == websocket:
                return name
        return None

    def get_ip_by_socket(self, websocket: WebSocket):
        for ws, ip, _ in self.active_connections:
            if ws == websocket:
                return ip
        return None

    async def send_to(self, websocket: WebSocket, data: dict):
        await websocket.send_text(json.dumps(data))

    async def broadcast(self, payload: dict):
        data = json.dumps(payload)
        for conn, _, _ in self.active_connections:
            await conn.send_text(data)

manager = ConnectionManager()

@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def get_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            text_data = await websocket.receive_text()
            data = json.loads(text_data)

            if data["type"] == "register":
                print(f"[+] Registering {data['name']}")
                await manager.set_name(websocket, data["name"])

            elif data["type"] == "message":
                sender = manager.get_name_by_socket(websocket)
                msg = data["message"]
                recipient = active_chats.get(sender)

                if recipient:
                    # Get both sockets
                    sender_socket = websocket
                    recipient_socket = manager.get_socket_by_name(recipient)

                    # Format the message
                    payload = {
                        "type": "message",
                        "sender": sender,
                        "message": msg
                    }

                    # Send to both chat participants
                    await manager.send_to(sender_socket, payload)
                    await manager.send_to(recipient_socket, payload)

                    print(f"[DM] {sender} → {recipient}: {msg}")

                else:
                    await manager.send_to(websocket, {
                        "sender": "<strong>ERROR</strong>",
                        "type": "error",
                        "message": "You're not in a chat."
                    })
                    await manager.send_to(websocket, {
                        "sender": sender,
                        "type": "error",
                        "message": "You're not in a chat."
                    })

            elif data["type"] == "new_chat":
                initiator = manager.get_name_by_socket(websocket)
                target = data["target"]
                target_socket = manager.get_socket_by_name(target)

                if target_socket:
                    # Register the chat
                    active_chats[initiator] = target
                    active_chats[target] = initiator

                    # Get IPs
                    ip_initiator = manager.get_ip_by_socket(websocket)
                    ip_target = manager.get_ip_by_socket(target_socket)

                    print(f"[Chat Start] {initiator} ({ip_initiator}) <-> {target} ({ip_target})")

                    # Notify both users
                    await manager.send_to(websocket, {
                        "type": "start_chat",
                        "with": target,
                        "ip": ip_target
                    })
                    await manager.send_to(target_socket, {
                        "type": "start_chat",
                        "with": initiator,
                        "ip": ip_initiator
                    })

                else:
                    await manager.send_to(websocket, {
                        "type": "error",
                        "message": f"User '{target}' is not online."
                    })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
