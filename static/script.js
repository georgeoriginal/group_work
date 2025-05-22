// Get references to important HTML elements
const input = document.getElementById("inputText");           // Input field for the user's message
const sendBtn = document.getElementById("SendButton");        // Send button
const chatBox = document.getElementById("chat");              // Container for the chat messages
const newChatBtn = document.getElementById("NewChat");        // Button to start a new chat

// Assign the NewChat function to the new chat button
newChatBtn.onclick = startNewChat;

let socket;                              // WebSocket object for server communication
let userName = prompt("Enter your name:"); // Ask the user for their name on page load

let lastSpeaker = null;                  // Track the last person who sent a message
let lastMessageGroup = null;             // Track the last message group DOM element

// Open a WebSocket connection
socket = new WebSocket("wss://8a7d-2a0b-6204-f2c4-ec00-f926-6173-8d7e-8ff.ngrok-free.app/ws");

// When the WebSocket connection is established
socket.addEventListener("open", () => {
    console.log("[WebSocket] Connected");
    socket.send(":/" + userName); // Send the user’s name to the server, prefixed by ":/"
});

// Handle incoming WebSocket messages
socket.addEventListener("message", (event) => {
    const [sender, ...messageParts] = event.data.split(": ");
    const message = messageParts.join(": ");

    console.log("Sender:", sender);
    console.log("Message:", message);

    // New speaker detected
    if (!lastSpeaker || lastSpeaker !== sender) {
        lastSpeaker = sender;

        // Create a new message group
        lastMessageGroup = document.createElement("div");
        lastMessageGroup.className = sender === userName ? "SelfMessageGroup" : "MessageGroup";

        const messageWrapper = document.createElement("div");
        messageWrapper.className = "message";
        lastMessageGroup.appendChild(messageWrapper);

        chatBox.appendChild(lastMessageGroup);

        const nameTag = document.createElement("p");
        nameTag.className = "Name";
        nameTag.innerHTML = `<strong>${sender}</strong>`;
        messageWrapper.appendChild(nameTag);

        const bubble = document.createElement("p");
        bubble.className = sender === userName ? "SelfBubble" : "MessageBubble";
        bubble.innerHTML = message;
        messageWrapper.appendChild(bubble);
    }
    // Same speaker as previous message
    else {
        const bubble = document.createElement("p");
        bubble.className = sender === userName ? "SelfBubble" : "MessageBubble";
        bubble.innerHTML = message;

        lastMessageGroup.firstChild.appendChild(bubble);
    }
});

// Handle WebSocket disconnection
socket.addEventListener("close", () => {
    console.log("[WebSocket] Disconnected");
});

// Send message when button is clicked or Enter is pressed
sendBtn.onclick = sendMessage;
input.onkeydown = (e) => {
    if (e.key === "Enter") sendMessage();
};

// Function to start a new chat (clears all messages)
function startNewChat() {
    const chatName = prompt("Enter the name of the new chat:");
    while (chatBox.firstChild) {
        chatBox.removeChild(chatBox.lastChild);
    }
}

// Function to send a message through the WebSocket
function sendMessage() {
    const message = input.value.trim();
    if (message !== "" && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        input.value = "";
    } else if (socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket is not open. Message not sent.");
    }
}
