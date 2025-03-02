"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let allSockets = []; // ensuring only WebSocket instances are stored.
// Think of socket as a private communication channel between the server and one connected client.
wss.on("connection", (socket) => {
    socket.send("Connected to wss.");
    allSockets.push(socket);
    // console.log(socket);
    socket.on("message", (message) => {
        console.log(`Received:${message.toString()}`);
        allSockets.forEach(client => {
            if (client !== socket) {
                client.send(message.toString());
            }
        });
    });
    socket.on("close", () => {
        console.log("Client disconnected");
        allSockets = allSockets.filter((e) => e !== socket);
        console.log(allSockets.length);
    });
});
