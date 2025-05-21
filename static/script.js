const input = document.getElementById("inputText");
const sendBtn = document.getElementById("SendButton");
const chatBox = document.getElementById("chat");

fetch("/static/config.json?cachebust=" + Date.now())
    .then(res => res.json())
    .then(config => {
        const socket = new WebSocket(config.websocketURL);

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
                socket.send(message);
                input.value = "";
            }
        }
    })
    .catch(err => {
        console.error("Failed to load config.json", err);
    });
