const input = document.getElementById("inputText");
const sendBtn = document.getElementById("SendButton");
const chatBox = document.getElementById("chat");
const NewChatDivButton = document.getElementById("NewChat");


NewChatDivButton.onclick = NewChat;

let socket;
let userName = prompt("Enter your name:");

let LastSpeaker = null;
let LastMessageGroup = null;

const MessageGroupLayout = '<div class="MessageGroup"><div class="message"><p class="Name"><strong>John Doe</strong></p></div></div>'

fetch("/config.json?cachebust=" + Date.now())
    .then(res => res.json())
    .then(config => {
        socket = new WebSocket(config.websocketURL);

        socket.addEventListener("open", () => {
            console.log("[WebSocket] Connected");
            socket.send(":/" + userName); // Send the name
        });

        socket.addEventListener("message", (event) => {
            const [sender, ...messageParts] = event.data.split(": ");
            const message = messageParts.join(": ");
            console.log("Sender:", sender);
            console.log("Message:", message);
            if (!LastSpeaker || LastSpeaker !== sender) {
                LastSpeaker = sender;
                LastMessageGroup = document.createElement("div");
                LastMessageGroup.className = "MessageGroup";

                let Message = document.createElement("div");
                Message.className = "message";
                LastMessageGroup:appendChild(Message);
                
                chatBox.appendChild(LastMessageGroup);

                let Name = document.createElement("p");
                Name.className = "Name";
                Name.innerHTML = "<strong>" + sender + "</strong>";

                let MessageBubble = document.createElement("p");
                MessageBubble.className = "MessageBubble";
                if (LastSpeaker == userName) {
                    LastMessageGroup.className = "SelfMessageGroup";
                    MessageBubble.className = "SelfBubble";
                }
                Message.appendChild(Name);
                Message.appendChild(MessageBubble);
                MessageBubble.innerHTML = message;
            }
            else if (LastSpeaker == sender) {
                let MessageBubble = document.createElement("p");
                MessageBubble.className = "MessageBubble";
                if (LastSpeaker == userName) {
                    LastMessageGroup.className = "SelfMessageGroup";
                    MessageBubble.className = "SelfBubble";
                }
                LastMessageGroup.firstChild.appendChild(MessageBubble);
                MessageBubble.innerHTML = message;
            }
        });

        socket.addEventListener("close", () => {
            console.log("[WebSocket] Disconnected");
        });

        sendBtn.onclick = sendMessage;
        input.onkeydown = (e) => {
            if (e.key === "Enter") sendMessage();
        };
});

function NewChat() {
    const NewChat = prompt("Enter the name of the new chat:");
    while (chatBox.firstChild) {
        chatBox.removeChild(chatBox.lastChild);
      }
    // socket.send("New Chat");
}

function sendMessage() {
    const message = input.value.trim();
    if (message !== "") {
        socket.send(message);
        input.value = "";
    }
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        event.preventDefault();     
        sendMessage();
    }
}
