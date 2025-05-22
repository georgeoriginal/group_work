// Get references to important HTML elements by their IDs
const input = document.getElementById("inputText");        // The text input field where users type their messages.
const sendBtn = document.getElementById("SendButton");     // The button that users click to send a message.
const chatBox = document.getElementById("chat");           // The container (div) where chat messages are displayed.
const newChatBtn = document.getElementById("NewChat");     // The button that starts a new chat session.

// Set the function to be called when the "New Chat" button is clicked
newChatBtn.onclick = startNewChat; // Assigns the `startNewChat` function to the button's `onclick` event.

// Declare variables to be used later
let socket;              // This variable will hold the WebSocket connection object.
let lastSpeaker = null;  // Tracks the name of the last person who sent a message (used for grouping messages visually).
let lastMessageGroup = null;  // Tracks the current message group container (used for grouping messages from the same sender).

// Prompt the user to enter a name when they load the page
let userName = prompt("Enter your name:").trim();  // Displays a prompt asking the user for their name. `trim()` removes any leading or trailing whitespace.

// Open the WebSocket connection to your FastAPI server (wss = secure WebSocket)
socket = new WebSocket("wss://group-work-kixr.onrender.com/ws"); // Creates a new WebSocket connection to the server's WebSocket endpoint.

// WebSocket event: when the connection is established
socket.addEventListener("open", () => {
    console.log("[WebSocket] Connected"); // Logs a message to the console indicating the WebSocket connection is open.
    // Send registration info to the server with the user's name
    socket.send(JSON.stringify({
        type: "register",     // Specifies the type of message being sent (in this case, "register").
        name: userName        // Sends the user's chosen name to the server for registration.
    }));
});

// WebSocket event: when a message is received from the server
socket.addEventListener("message", (event) => {
    // Parse the incoming data as JSON
    const data = JSON.parse(event.data); // Converts the received JSON string into a JavaScript object.

    // Extract sender and message content
    const sender = data.sender;   // Extracts the name of the sender from the received data.
    const message = data.message; // Extracts the message content from the received data.
    const type = data.type; // Extracts the type of message from the received data.
    if (type === "start") { // If the type of message is "new_chat":
        // Clear all current messages in the chat box
        while (chatBox.firstChild) { // Loops through all child elements of the chat box.
            chatBox.removeChild(chatBox.lastChild); // Removes each child element from the chat box.
        }
    }
    // Check if the message is from a different speaker than last time
    if (!lastSpeaker || lastSpeaker !== sender) { // If there is no last speaker or the sender is different from the last speaker:
        // New speaker, update tracker
        lastSpeaker = sender; // Update the `lastSpeaker` variable to the current sender.

        if (sender == undefined) {
            console.log("sender is undefined"); // Logs a message to the console if the sender is undefined.
            return; // Exits the function early if the sender is undefined.
        }
        if (message == undefined) {
            console.log("message is undefined"); // Logs a message to the console if the message is undefined.
            return; // Exits the function early if the message is undefined.
        }
        
        // Create a new group for this speaker's messages
        lastMessageGroup = document.createElement("div"); // Creates a new `div` element to group this speaker's messages.
        console.log("sender", sender); // Logs the sender's name to the console (for debugging purposes).
        console.log("userName", userName); // Logs the current user's name to the console (for debugging purposes).
        lastMessageGroup.className = sender === userName ? "SelfMessageGroup" : "MessageGroup"; // Assigns a CSS class based on whether the sender is the current user.

        // Create a container for the message bubble
        const messageWrapper = document.createElement("div"); // Creates a `div` to wrap the message bubble.
        messageWrapper.className = "message"; // Assigns the "message" CSS class to the wrapper.
        lastMessageGroup.appendChild(messageWrapper); // Adds the wrapper to the message group.

        // Append the entire group to the chat box
        chatBox.appendChild(lastMessageGroup); // Adds the message group to the chat box.

        // Add the sender's name to the top of the message
        const nameTag = document.createElement("p"); // Creates a `p` element to display the sender's name.
        nameTag.className = "Name"; // Assigns the "Name" CSS class to the name tag.
        nameTag.innerHTML = `<strong>${sender}</strong>`; // Sets the inner HTML to the sender's name in bold.
        messageWrapper.appendChild(nameTag); // Adds the name tag to the message wrapper.

        // Add the message bubble itself
        const bubble = document.createElement("p"); // Creates a `p` element for the message bubble.
        bubble.className = sender === userName ? "SelfBubble" : "MessageBubble"; // Assigns a CSS class based on whether the sender is the current user.
        bubble.innerHTML = message; // Sets the inner HTML to the message content.
        messageWrapper.appendChild(bubble); // Adds the bubble to the message wrapper.
    } else {
        // Same speaker as before → append message to existing group
        const bubble = document.createElement("p"); // Creates a new `p` element for the message bubble.
        bubble.className = sender === userName ? "SelfBubble" : "MessageBubble"; // Assigns a CSS class based on whether the sender is the current user.
        bubble.innerHTML = message; // Sets the inner HTML to the message content.
        lastMessageGroup.firstChild.appendChild(bubble); // Adds the bubble to the existing message group.
    }
    chatBox.scrollTop = chatBox.scrollHeight; // Scrolls the chat box to the bottom to show the latest message.
});

// WebSocket event: when the connection is closed
socket.addEventListener("close", () => {
    console.log("[WebSocket] Disconnected"); // Logs a message to the console indicating the WebSocket connection is closed.
});

// Bind the click event to the send button
sendBtn.onclick = sendMessage; // Assigns the `sendMessage` function to the button's `onclick` event.

// Bind the Enter key to also send a message
input.onkeydown = (e) => {
    if (e.key === "Enter") sendMessage();  // Checks if the pressed key is "Enter" and calls `sendMessage` if true.
};

// Function to send a message through the WebSocket
function sendMessage() {
    const message = input.value.trim(); // Gets the message text from the input field and removes any leading/trailing whitespace.
    if (message !== "" && socket.readyState === WebSocket.OPEN) { // Checks if the message is not empty and the WebSocket is open.
        // Only send if the socket is open and message is not empty
        socket.send(JSON.stringify({
            type: "message",   // Specifies the type of message being sent (in this case, "message").
            message: message   // Sends the actual message content.
        }));
        input.value = ""; // Clears the input field after sending the message.
    } else if (socket.readyState !== WebSocket.OPEN) { // If the WebSocket is not open:
        console.warn("WebSocket is not open. Message not sent."); // Logs a warning to the console.
    }
}

// Function to start a new chat session (clears UI, notifies server)
function startNewChat() {
    const chatName = prompt("Enter the name of the new chat:");  // Displays a prompt asking the user for the name of the person they want to chat with.

    // Send a request to start a chat with the given name
    if (chatName && socket.readyState === WebSocket.OPEN) { // Checks if a name was entered and the WebSocket is open.
        socket.send(JSON.stringify({
            type: "new_chat",  // Specifies the type of message being sent (in this case, "new_chat").
            target: chatName   // Sends the name of the target user to the server.
        }));
    }

    // Clear all current messages in the chat box
    while (chatBox.firstChild) { // Loops through all child elements of the chat box.
        chatBox.removeChild(chatBox.lastChild); // Removes each child element from the chat box.
    }

    // Reset message grouping
    lastSpeaker = null; // Resets the `lastSpeaker` variable to null.
    lastMessageGroup = null; // Resets the `lastMessageGroup` variable to null.
}