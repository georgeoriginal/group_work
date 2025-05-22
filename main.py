# Importing FastAPI, a modern web framework for building APIs with Python.
# WebSocket is used for real-time, bi-directional communication between the client and server.
# WebSocketDisconnect is an exception raised when a WebSocket connection is closed.
# Request is used to handle HTTP requests.
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request

# Importing HTMLResponse to send HTML content as a response.
from fastapi.responses import HTMLResponse

# Importing StaticFiles to serve static files (e.g., CSS, JS, images).
from fastapi.staticfiles import StaticFiles

# Importing Jinja2Templates to render HTML templates with dynamic content.
from fastapi.templating import Jinja2Templates

# Importing the JSON module to handle JSON serialization and deserialization.
import json

# Creating an instance of the FastAPI application.
app = FastAPI()

# Mounting a static files directory at the "/static" route.
# This allows serving static files like CSS, JavaScript, and images.
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setting up Jinja2 templates to render HTML files from the "templates" directory.
templates = Jinja2Templates(directory="templates")

# A dictionary to keep track of active chats between users.
# Example: {"Alice": "Bob", "Bob": "Alice"} means Alice and Bob are in a chat.
active_chats = {}

# A dictionary to map user names to their IP addresses.
# Example: {"Alice": "1.2.3.4"} means Alice's IP address is 1.2.3.4.
name_to_ip = {}

# Defining a class to manage WebSocket connections.
class ConnectionManager:
    def __init__(self):
        # A list to store active WebSocket connections along with their IPs and names.
        # Each entry is a tuple: (WebSocket, IP, Name).
        self.active_connections: list[tuple[WebSocket, str, str]] = []

    # Method to handle a new WebSocket connection.
    async def connect(self, websocket: WebSocket):
        # Accept the WebSocket connection.
        await websocket.accept()
        # Get the IP address of the client.
        ip = websocket.client.host
        # Add the WebSocket connection to the active connections list.
        self.active_connections.append((websocket, ip, None))
        # Log the connection.
        print(f"[+] {ip} connected.")

    # Method to handle disconnection of a WebSocket.
    def disconnect(self, websocket: WebSocket):
        # Iterate through the active connections to find the one to remove.
        for conn in self.active_connections:
            if conn[0] == websocket:
                # Remove the connection from the list.
                self.active_connections.remove(conn)
                # Log the disconnection.
                print(f"[-] {conn[1]} disconnected.")
                break

    # Method to associate a name with a WebSocket connection.
    async def set_name(self, websocket: WebSocket, name: str):
        # Iterate through the active connections to find the matching WebSocket.
        for i, (ws, ip, _) in enumerate(self.active_connections):
            if ws == websocket:
                # Update the connection with the user's name.
                self.active_connections[i] = (ws, ip, name)
                # Map the user's name to their IP address.
                name_to_ip[name] = ip
                # Log the name registration.
                print(f"[+] Name registered: {name} => {ip}")
                break

    # Method to get a WebSocket connection by a user's name.
    def get_socket_by_name(self, name: str):
        for ws, _, n in self.active_connections:
            if n == name:
                return ws
        return None

    # Method to get a user's IP address by their name.
    def get_ip_by_name(self, name: str):
        return name_to_ip.get(name)

    # Method to get a user's name by their WebSocket connection.
    def get_name_by_socket(self, websocket: WebSocket):
        for ws, _, name in self.active_connections:
            if ws == websocket:
                return name
        return None

    # Method to get a user's IP address by their WebSocket connection.
    def get_ip_by_socket(self, websocket: WebSocket):
        for ws, ip, _ in self.active_connections:
            if ws == websocket:
                return ip
        return None

    # Method to send data to a specific WebSocket connection.
    async def send_to(self, websocket: WebSocket, data: dict):
        # Serialize the data to JSON and send it over the WebSocket.
        await websocket.send_text(json.dumps(data))

    # Method to broadcast data to all active WebSocket connections.
    async def broadcast(self, payload: dict):
        # Serialize the payload to JSON.
        data = json.dumps(payload)
        # Send the data to all active WebSocket connections.
        for conn, _, _ in self.active_connections:
            await conn.send_text(data)

# Creating an instance of the ConnectionManager class to manage WebSocket connections.
manager = ConnectionManager()

# Defining a route for the home page.
@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def get_home(request: Request):
    # Render the "index.html" template and pass the request object to it.
    return templates.TemplateResponse("index.html", {"request": request})

# Defining a WebSocket endpoint at the "/ws" route.
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Connect the WebSocket and add it to the active connections list.
    await manager.connect(websocket)
    try:
        # Continuously listen for messages from the WebSocket.
        while True:
            # Receive a text message from the WebSocket.
            text_data = await websocket.receive_text()
            # Parse the received JSON data.
            data = json.loads(text_data)

            # Handle user registration.
            if data["type"] == "register":
                print(f"[+] Registering {data['name']}")
                # Set the user's name in the connection manager.
                await manager.set_name(websocket, data["name"])

            # Handle sending a message.
            elif data["type"] == "message":
                # Get the sender's name from the WebSocket connection.
                sender = manager.get_name_by_socket(websocket)
                # Get the message content.
                msg = data["message"]
                # Get the recipient's name from the active chats dictionary.
                recipient = active_chats.get(sender)

                if recipient:
                    # Get the WebSocket connections for both the sender and recipient.
                    sender_socket = websocket
                    recipient_socket = manager.get_socket_by_name(recipient)

                    # Create a payload for the message.
                    payload = {
                        "type": "message",
                        "sender": sender,
                        "message": msg
                    }

                    # Send the message to both the sender and recipient.
                    await manager.send_to(sender_socket, payload)
                    await manager.send_to(recipient_socket, payload)

                    # Log the direct message.
                    print(f"[DM] {sender} → {recipient}: {msg}")

                else:
                    # If the sender is not in a chat, send an error message.
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

            # Handle starting a new chat.
            elif data["type"] == "new_chat":
                # Get the initiator's name from the WebSocket connection.
                initiator = manager.get_name_by_socket(websocket)
                # Get the target user's name from the data.
                target = data["target"]
                # Get the target user's WebSocket connection.
                target_socket = manager.get_socket_by_name(target)

                if target_socket:
                    # Register the chat between the initiator and target.
                    active_chats[initiator] = target
                    active_chats[target] = initiator

                    # Get the IP addresses of both users.
                    ip_initiator = manager.get_ip_by_socket(websocket)
                    ip_target = manager.get_ip_by_socket(target_socket)

                    # Log the chat initiation.
                    print(f"[Chat Start] {initiator} ({ip_initiator}) <-> {target} ({ip_target})")

                    # Notify both users about the chat start.
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
                    # If the target user is not online, send an error message.
                    await manager.send_to(websocket, {
                        "type": "error",
                        "message": f"User '{target}' is not online."
                    })

    # Handle WebSocket disconnection.
    except WebSocketDisconnect:
        # Remove the WebSocket connection from the active connections list.
        manager.disconnect(websocket)

# --- Explanation of FastAPI and WebSockets ---
# FastAPI:
# - FastAPI is a modern, fast (high-performance) web framework for building APIs with Python.
# - It is based on standard Python type hints and provides automatic generation of OpenAPI documentation.
# - FastAPI is asynchronous and built on top of Starlette and Pydantic, making it highly efficient and easy to use.

# WebSockets:
# - WebSockets provide a full-duplex communication channel over a single TCP connection.
# - Unlike HTTP, WebSockets allow real-time, bi-directional communication between the client and server.
# - They are commonly used for applications like chat systems, live notifications, and real-time data streaming.