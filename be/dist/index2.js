"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const http_1 = require("http");
const uuid_1 = require("uuid");
// Create HTTP server
const server = (0, http_1.createServer)();
const wss = new ws_1.WebSocketServer({ server });
// Store rooms and clients
const rooms = new Map();
const clients = new Map();
// Handle new WebSocket connections
wss.on('connection', (ws) => {
    // Generate a unique client ID
    const clientId = (0, uuid_1.v4)();
    clients.set(ws, { id: clientId, name: 'Anonymous', roomId: null });
    // Send client their ID
    ws.send(JSON.stringify({
        type: 'connected',
        clientId: clientId
    }));
    // Handle messages from clients
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            switch (message.type) {
                case 'create_room':
                    handleCreateRoom(ws, clientId, message.senderName || 'Anonymous');
                    break;
                case 'join_room':
                    if (message.roomId) {
                        handleJoinRoom(ws, clientId, message.roomId, message.senderName || 'Anonymous');
                    }
                    break;
                case 'leave_room':
                    handleLeaveRoom(ws, clientId);
                    break;
                case 'chat_message':
                    if (message.roomId && message.message) {
                        handleChatMessage(ws, clientId, message.roomId, message.message);
                    }
                    break;
                case 'set_name':
                    if (message.senderName) {
                        handleSetName(ws, clientId, message.senderName);
                    }
                    break;
            }
        }
        catch (error) {
            console.error('Failed to parse message:', error);
        }
    });
    // Handle client disconnection
    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo && clientInfo.roomId) {
            handleLeaveRoom(ws, clientId);
        }
        clients.delete(ws);
    });
});
// Create a new chat room
function handleCreateRoom(ws, clientId, userName) {
    const roomId = (0, uuid_1.v4)().substring(0, 8); // Short room ID
    const newRoom = {
        id: roomId,
        clients: new Map()
    };
    rooms.set(roomId, newRoom);
    // Join the client to the room they just created
    addClientToRoom(ws, clientId, roomId, userName);
    // Notify client that room was created
    ws.send(JSON.stringify({
        type: 'room_created',
        roomId: roomId
    }));
}
// Join an existing chat room
function handleJoinRoom(ws, clientId, roomId, userName) {
    const room = rooms.get(roomId);
    if (room) {
        addClientToRoom(ws, clientId, roomId, userName);
        // Notify client that they joined the room
        ws.send(JSON.stringify({
            type: 'room_joined',
            roomId: roomId
        }));
        // Notify all clients in the room that a new user joined
        broadcastToRoom(roomId, {
            type: 'user_joined',
            roomId: roomId,
            senderId: clientId,
            senderName: userName,
            message: `${userName} joined the room`,
            timestamp: Date.now()
        }, clientId);
    }
    else {
        // Room doesn't exist
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Room not found'
        }));
    }
}
// Leave a chat room
function handleLeaveRoom(ws, clientId) {
    const clientInfo = clients.get(ws);
    if (!clientInfo || !clientInfo.roomId)
        return;
    const roomId = clientInfo.roomId;
    const room = rooms.get(roomId);
    if (room) {
        // Remove client from room
        room.clients.delete(clientId);
        // Update client record
        clients.set(ws, Object.assign(Object.assign({}, clientInfo), { roomId: null }));
        // Notify other clients that this user left
        broadcastToRoom(roomId, {
            type: 'user_left',
            roomId: roomId,
            senderId: clientId,
            senderName: clientInfo.name,
            message: `${clientInfo.name} left the room`,
            timestamp: Date.now()
        });
        // If room is empty, delete it
        if (room.clients.size === 0) {
            rooms.delete(roomId);
        }
        // Confirm to the client that they left
        ws.send(JSON.stringify({
            type: 'room_left',
            roomId: roomId
        }));
    }
}
// Handle chat message
function handleChatMessage(ws, clientId, roomId, message) {
    const clientInfo = clients.get(ws);
    if (!clientInfo)
        return;
    const room = rooms.get(roomId);
    if (!room)
        return;
    // Broadcast message to all clients in the room
    broadcastToRoom(roomId, {
        type: 'chat_message',
        roomId: roomId,
        senderId: clientId,
        senderName: clientInfo.name,
        message: message,
        timestamp: Date.now()
    });
}
// Set user name
function handleSetName(ws, clientId, name) {
    const clientInfo = clients.get(ws);
    if (!clientInfo)
        return;
    // Update client name
    clients.set(ws, Object.assign(Object.assign({}, clientInfo), { name }));
    // Confirm name change
    ws.send(JSON.stringify({
        type: 'name_set',
        senderName: name
    }));
    // If client is in a room, notify others of name change
    if (clientInfo.roomId) {
        broadcastToRoom(clientInfo.roomId, {
            type: 'user_renamed',
            roomId: clientInfo.roomId,
            senderId: clientId,
            senderName: name,
            message: `User has changed their name to ${name}`,
            timestamp: Date.now()
        }, clientId);
    }
}
// Helper to add a client to a room
function addClientToRoom(ws, clientId, roomId, userName) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    // Update room's client list
    room.clients.set(clientId, ws);
    // Update client's room association
    const clientInfo = clients.get(ws);
    if (clientInfo) {
        clients.set(ws, Object.assign(Object.assign({}, clientInfo), { roomId, name: userName }));
    }
}
// Broadcast a message to all clients in a room
function broadcastToRoom(roomId, message, exceptClientId) {
    const room = rooms.get(roomId);
    if (!room)
        return;
    const messageString = JSON.stringify(message);
    room.clients.forEach((clientWs, id) => {
        if (exceptClientId && id === exceptClientId) {
            return; // Skip the sender if exceptClientId is provided
        }
        clientWs.send(messageString);
    });
}
// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`WebSocket server is running on port ${PORT}`);
});
