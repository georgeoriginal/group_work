const input = document.getElementById("inputText");
const sendBtn = document.getElementById("SendButton");
const chatBox = document.getElementById("chat");

// Use same host as page for WebSocket
const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket("https://influence-sugar-climbing-est.trycloudflare.com");

socket.addEventListener("open", () => {
    console.log("[WebSocket] Connected");
    socket.send("Hello from frontend!");
});

socket.addEventListener("message", (event) => {
    console.log("[WebSocket] Message received:", event.data);
});

socket.addEventListener("close", () => {
    console.log("[WebSocket] Disconnected");
});


sendBtn.onclick = sendMessage;
input.onkeydown = (e) => {
    if (e.key === "Enter") sendMessage();
};

function sendMessage() {
    const message = input.value.trim();
    if (message !== "") {
        ws.send(message);
        input.value = "";
    }
}
