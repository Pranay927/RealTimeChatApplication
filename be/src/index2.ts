import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Define types
interface ChatRoom {
  id: string;
  clients: Map<string, WebSocket>;
}

interface ServerMessage {
  type: string;
  roomId?: string;
  senderId?: string;
  senderName?: string;
  message?: string;
  timestamp?: number;
  clientId?: string;
}

// Create HTTP server
const server = createServer();
const wss = new WebSocketServer({ server });

// Store rooms and clients
const rooms: Map<string, ChatRoom> = new Map();
const clients: Map<WebSocket, { id: string; name: string; roomId: string | null }> = new Map();

// Handle new WebSocket connections
wss.on('connection', (ws: WebSocket) => {
  // Generate a unique client ID
  const clientId = uuidv4();
  clients.set(ws, { id: clientId, name: 'Anonymous', roomId: null });

  // Send client their ID
  ws.send(JSON.stringify({
    type: 'connected',
    clientId: clientId
  }));

  // Handle messages from clients
  ws.on('message', (data: string) => {
    try {
      const message: ServerMessage = JSON.parse(data);
      
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
    } catch (error) {
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
function handleCreateRoom(ws: WebSocket, clientId: string, userName: string) {
  const roomId = uuidv4().substring(0, 8); // Short room ID
  const newRoom: ChatRoom = {
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
function handleJoinRoom(ws: WebSocket, clientId: string, roomId: string, userName: string) {
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
  } else {
    // Room doesn't exist
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found'
    }));
  }
}

// Leave a chat room
function handleLeaveRoom(ws: WebSocket, clientId: string) {
  const clientInfo = clients.get(ws);
  if (!clientInfo || !clientInfo.roomId) return;
  
  const roomId = clientInfo.roomId;
  const room = rooms.get(roomId);
  
  if (room) {
    // Remove client from room
    room.clients.delete(clientId);
    
    // Update client record
    clients.set(ws, { ...clientInfo, roomId: null });
    
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
function handleChatMessage(ws: WebSocket, clientId: string, roomId: string, message: string) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  const room = rooms.get(roomId);
  if (!room) return;
  
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
function handleSetName(ws: WebSocket, clientId: string, name: string) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;
  
  // Update client name
  clients.set(ws, { ...clientInfo, name });
  
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
function addClientToRoom(ws: WebSocket, clientId: string, roomId: string, userName: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  // Update room's client list
  room.clients.set(clientId, ws);
  
  // Update client's room association
  const clientInfo = clients.get(ws);
  if (clientInfo) {
    clients.set(ws, { ...clientInfo, roomId, name: userName });
  }
}

// Broadcast a message to all clients in a room
function broadcastToRoom(roomId: string, message: ServerMessage, exceptClientId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  
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