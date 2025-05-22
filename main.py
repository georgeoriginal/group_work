from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# FastAPI is a Python framework used to build websites and APIs quickly.
# It lets you handle web pages, APIs, and real-time connections like WebSockets easily.

# A WebSocket is a way for the server and the browser to keep a connection open,
# so they can send messages back and forth instantly without reloading the page.
# This makes real-time features like chat apps possible.

# Create an instance of the FastAPI app
app = FastAPI()

# Mount the 'static' directory to serve static files like CSS, JS, images
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2Templates to render HTML templates from the 'templates' directory
templates = Jinja2Templates(directory="templates")

# Dictionary to store name-to-IP mappings (e.g., {"Alice": "127.0.0.1"})
Names = {}

# Route for the homepage that serves the index.html file
@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    # Render the 'index.html' template and pass the request object to it
    return templates.TemplateResponse("index.html", {"request": request})

# Class to manage WebSocket client connections
class ConnectionManager:
    def __init__(self):
        # List of currently connected clients in the format: (WebSocket, client_ip)
        self.active_connections: list[tuple[WebSocket, str]] = []

    async def connect(self, websocket: WebSocket):
        # Accept the WebSocket connection
        await websocket.accept()
        # Get the IP address of the client
        client_ip = websocket.client.host
        # Store the connection and IP
        self.active_connections.append((websocket, client_ip))
        print(f"[+] {client_ip} connected.")

    def disconnect(self, websocket: WebSocket):
        # Remove the connection from the list when a client disconnects
        for conn in self.active_connections:
            if conn[0] == websocket:
                self.active_connections.remove(conn)
                print(f"[-] {conn[1]} disconnected.")
                break

    async def broadcast(self, message: str, sender: WebSocket):
        # Broadcast a message to all connected clients
        sender_ip = sender.client.host  # Identify the sender IP
        print(f"[>] {sender_ip} sent: {message}")
        for conn, client_ip in self.active_connections:
            # Send the message to each client
            await conn.send_text(f"{sender_ip}: {message}")
            print(f"[<] Delivered to {client_ip}")

# Instantiate the ConnectionManager
manager = ConnectionManager()

# Function that is called every time a message is received from a client
def on_message_received(sender_ip: str, message: str):
    # Log the incoming message along with the sender's IP
    print(f"[Message Received] From {sender_ip}: {message}")
    # Extend this function to write to a file or database if needed

# WebSocket endpoint at '/ws' to handle WebSocket connections
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)  # Accept WebSocket connection
    client_ip = websocket.client.host

    try:
        # First message from the client must be the name
        name = await websocket.receive_text()
        name = name.strip()

        # Store the name with the client's IP
        Names[name] = client_ip
        print(f"[+] Name registered: {name} => {client_ip}")

        # Start listening for chat messages
        while True:
            data = await websocket.receive_text()  # Wait for message from this client
            on_message_received(name, data)  # Call the message received hook

            # Format the message as "Name: message" 
            formatted_message = f"{name}: {data}"

            # Broadcast it to all clients including the sender
            await manager.broadcast(formatted_message, sender=websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)  # Remove disconnected client
