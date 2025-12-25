// app.js

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// MongoDB Connection

mongoose.connect("mongodb://127.0.0.1:27017/chatapp")
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });


// Message Schema
const messageSchema = new mongoose.Schema({
    username: String,
    room: String,
    message: String,
    time: { type: Date, default: Date.now }
});

const Message = mongoose.model("Message", messageSchema);

// Frontend (HTML + CSS + JS)
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Chat Application</title>
<style>
body {
    font-family: Arial;
    background: #f2f2f2;
}
#chatBox {
    width: 400px;
    margin: auto;
    background: white;
    padding: 10px;
    border-radius: 8px;
}
#messages {
    height: 300px;
    overflow-y: scroll;
    border: 1px solid #ccc;
    padding: 5px;
}
input, button {
    width: 100%;
    padding: 8px;
    margin-top: 5px;
}
</style>
</head>
<body>

<div id="chatBox">
    <h2>Real-Time Chat</h2>
    <input id="username" placeholder="Enter username" />
    <input id="room" placeholder="Enter room name" />
    <button onclick="joinRoom()">Join Room</button>

    <div id="messages"></div>

    <input id="msg" placeholder="Type message" />
    <button onclick="sendMessage()">Send</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
let roomName = "";

function joinRoom() {
    const username = document.getElementById("username").value;
    roomName = document.getElementById("room").value;
    socket.emit("joinRoom", { username, room: roomName });
    document.getElementById("messages").innerHTML = "";
}

function sendMessage() {
    const msg = document.getElementById("msg").value;
    socket.emit("chatMessage", msg);
    document.getElementById("msg").value = "";
}

socket.on("message", data => {
    const messages = document.getElementById("messages");
    messages.innerHTML += "<p><b>" + data.username + ":</b> " + data.message + "</p>";
    messages.scrollTop = messages.scrollHeight;
});
</script>

</body>
</html>
`);
});

// Socket.io Logic
io.on("connection", socket => {
    socket.on("joinRoom", async ({ username, room }) => {
        socket.join(room);
        socket.username = username;
        socket.room = room;

        // Load chat history
        const history = await Message.find({ room });
        history.forEach(msg => {
            socket.emit("message", msg);
        });
    });

    socket.on("chatMessage", async msg => {
        const messageData = {
            username: socket.username,
            room: socket.room,
            message: msg
        };

        await Message.create(messageData);
        io.to(socket.room).emit("message", messageData);
    });
});

// Server Start
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
