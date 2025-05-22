// Get references to important HTML elements by their IDs
const input = document.getElementById("inputText");        // The text input field for typing messages
const sendBtn = document.getElementById("SendButton");     // The button to send a message
const chatBox = document.getElementById("chat");           // The container where messages are displayed
const newChatBtn = document.getElementById("NewChat");     // The button to start a new chat session

// Set the function to be called when the "New Chat" button is clicked
newChatBtn.onclick = startNewChat;

// Declare variables to be used later
let socket;              // Will hold the WebSocket connection
let lastSpeaker = null;  // Tracks who last sent a message (used for grouping bubbles)
let lastMessageGroup = null;  // Tracks the current message group container

// Prompt the user to enter a name when they load the page
let userName = prompt("Enter your name:").trim();  // Prompt returns a string; trim() removes whitespace

// Open the WebSocket connection to your FastAPI server (wss = secure WebSocket)
socket = new WebSocket("wss://group-work-kixr.onrender.com/ws");

// WebSocket event: when the connection is established
socket.addEventListener("open", () => {
    console.log("[WebSocket] Connected");
    // Send registration info to the server with the user's name
    socket.send(JSON.stringify({
        type: "register",     // Message type is 'register'
        name: userName        // The user's chosen name
    }));
});

// WebSocket event: when a message is received from the server
socket.addEventListener("message", (event) => {
    // Parse the incoming data as JSON
    const data = JSON.parse(event.data);

    // Extract sender and message content
    const sender = data.sender;
    const message = data.message;

    // Check if the message is from a different speaker than last time
    if (!lastSpeaker || lastSpeaker !== sender) {
        // New speaker, update tracker
        lastSpeaker = sender;

        // Create a new group for this speaker's messages
        lastMessageGroup = document.createElement("div");
        console.log("sender", sender);
        console.log("userName", userName);
        lastMessageGroup.className = sender === userName ? "SelfMessageGroup" : "MessageGroup";

        // Create a container for the message bubble
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "message";
        lastMessageGroup.appendChild(messageWrapper);

        // Append the entire group to the chat box
        chatBox.appendChild(lastMessageGroup);

        // Add the sender's name to the top of the message
        const nameTag = document.createElement("p");
        nameTag.className = "Name";
        nameTag.innerHTML = `<strong>${sender}</strong>`;
        messageWrapper.appendChild(nameTag);

        // Add the message bubble itself
        const bubble = document.createElement("p");
        bubble.className = sender === userName ? "SelfBubble" : "MessageBubble";
        bubble.innerHTML = message;
        messageWrapper.appendChild(bubble);
    } else {
        // Same speaker as before → append message to existing group
        const bubble = document.createElement("p");
        bubble.className = sender === userName ? "SelfBubble" : "MessageBubble";
        bubble.innerHTML = message;
        lastMessageGroup.firstChild.appendChild(bubble); // Add to the last group’s wrapper
    }
    chatBox.scrollTop = chatBox.scrollHeight;
});

// WebSocket event: when the connection is closed
socket.addEventListener("close", () => {
    console.log("[WebSocket] Disconnected");
});

// Bind the click event to the send button
sendBtn.onclick = sendMessage;

// Bind the Enter key to also send a message
input.onkeydown = (e) => {
    if (e.key === "Enter") sendMessage();  // Only act when Enter is pressed
};

// Function to send a message through the WebSocket
function sendMessage() {
    const message = input.value.trim(); // Get and clean message text
    if (message !== "" && socket.readyState === WebSocket.OPEN) {
        // Only send if the socket is open and message is not empty
        socket.send(JSON.stringify({
            type: "message",   // Tell server this is a chat message
            message: message   // Send the actual message
        }));
        input.value = ""; // Clear the input box
    } else if (socket.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket is not open. Message not sent.");
    }
}

// Function to start a new chat session (clears UI, notifies server)
function startNewChat() {
    const chatName = prompt("Enter the name of the new chat:");  // Ask user who they want to chat with

    // Send a request to start a chat with the given name
    if (chatName && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: "new_chat",  // Inform server we're starting a chat
            target: chatName   // The name of the user we want to chat with
        }));
    }

    // Clear all current messages in the chat box
    while (chatBox.firstChild) {
        chatBox.removeChild(chatBox.lastChild); // Remove each child element from chat
    }

    // Reset message grouping
    lastSpeaker = null;
    lastMessageGroup = null;
}
