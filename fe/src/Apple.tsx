import React, { useState, useEffect, useRef } from 'react';

interface Message {
  type: string;
  roomId?: string;
  senderId?: string;
  senderName?: string;
  message?: string;
  timestamp?: number;
  clientId?: string;
}

function Apple() {
  const [connected, setConnected] = useState<boolean>(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [clientId, setClientId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to WebSocket server
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    
    socket.onopen = () => {
      setConnected(true);
      setStatusMessage('Connected to server');
    };
    
    socket.onclose = () => {
      setConnected(false);
      setCurrentRoom(null);
      setStatusMessage('Disconnected from server');
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatusMessage('Connection error');
    };
    
    socket.onmessage = (event) => {
      try {
        const data: Message = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            if (data.clientId) {
              setClientId(data.clientId);
              setStatusMessage('Connected. You can create or join a room.');
            }
            break;
            
          case 'room_created':
            if (data.roomId) {
              setCurrentRoom(data.roomId);
              setStatusMessage(`Room created with ID: ${data.roomId}`);
              setMessages([]);
            }
            break;
            
          case 'room_joined':
            if (data.roomId) {
              setCurrentRoom(data.roomId);
              setStatusMessage(`Joined room: ${data.roomId}`);
              setMessages([]);
            }
            break;
            
          case 'room_left':
            setCurrentRoom(null);
            setStatusMessage('Left the room');
            setMessages([]);
            break;
            
          case 'error':
            setStatusMessage(`Error: ${data.message}`);
            break;
            
          case 'name_set':
            if (data.senderName) {
              setUserName(data.senderName);
              setStatusMessage(`Name set to: ${data.senderName}`);
            }
            break;
            
          case 'chat_message':
          case 'user_joined':
          case 'user_left':
          case 'user_renamed':
            setMessages(prev => [...prev, data]);
            break;
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    setWs(socket);
    
    return () => {
      socket.close();
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle setting user name
  const handleSetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !ws) return;
    
    ws.send(JSON.stringify({
      type: 'set_name',
      senderName: userName
    }));
  };

  // Handle creating a new room
  const handleCreateRoom = () => {
    if (!ws || !userName) return;
    
    ws.send(JSON.stringify({
      type: 'create_room',
      senderName: userName
    }));
  };

  // Handle joining an existing room
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !ws || !userName) return;
    
    ws.send(JSON.stringify({
      type: 'join_room',
      roomId: roomId,
      senderName: userName
    }));
  };

  // Handle leaving the current room
  const handleLeaveRoom = () => {
    if (!ws || !currentRoom) return;
    
    ws.send(JSON.stringify({
      type: 'leave_room',
      roomId: currentRoom
    }));
  };

  // Handle sending a chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !ws || !currentRoom) return;
    
    ws.send(JSON.stringify({
      type: 'chat_message',
      roomId: currentRoom,
      message: message
    }));
    
    setMessage('');
  };

  // Format timestamp
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="app-container">
      <div className="chat-container">
        <div className="app-header">
          <h1>Real-time Chat Application</h1>
          <p className="status-message">{statusMessage}</p>
        </div>
        
        {!userName && (
          <div className="name-form-container">
            <form onSubmit={handleSetName} className="name-form">
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="text-input"
                required
              />
              <button 
                type="submit"
                className="primary-button"
              >
                Set Name
              </button>
            </form>
          </div>
        )}
        
        {userName && !currentRoom && (
          <div className="room-options">
            <div className="room-option">
              <button
                onClick={handleCreateRoom}
                className="create-room-button"
                disabled={!connected}
              >
                Create New Room
              </button>
            </div>
            
            <div className="room-option">
              <h3>Join Existing Room</h3>
              <form onSubmit={handleJoinRoom} className="join-form">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="text-input"
                  required
                />
                <button 
                  type="submit"
                  className="primary-button"
                  disabled={!connected}
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        )}
        
        {currentRoom && (
          <div className="chat-room">
            <div className="room-header">
              <span>
                Room: <strong>{currentRoom}</strong>
              </span>
              <button
                onClick={handleLeaveRoom}
                className="leave-button"
              >
                Leave Room
              </button>
            </div>
            
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages">
                  No messages yet. Start chatting!
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message ${
                      msg.type === 'user_joined' || msg.type === 'user_left' || msg.type === 'user_renamed'
                        ? 'system-message'
                        : msg.senderId === clientId
                        ? 'sent-message'
                        : 'received-message'
                    }`}
                  >
                    {msg.type === 'chat_message' ? (
                      <div className="message-bubble">
                        {msg.senderId !== clientId && (
                          <div className="sender-name">
                            {msg.senderName}
                          </div>
                        )}
                        <div className="message-text">{msg.message}</div>
                        <div className="message-time">
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    ) : (
                      <div className="system-message-bubble">
                        {msg.message} • {formatTime(msg.timestamp)}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="message-input"
              />
              <button 
                type="submit"
                className="send-button"
                disabled={!connected}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
      
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        
        .app-container {
          min-height: 100vh;
          background-color: #f0f2f5;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .chat-container {
          max-width: 800px;
          width: 100%;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .app-header {
          padding: 16px;
          background-color: #1877f2;
          color: white;
        }
        
        .app-header h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }
        
        .status-message {
          font-size: 14px;
          opacity: 0.9;
        }
        
        .name-form-container, .room-options {
          padding: 16px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .name-form, .join-form {
          display: flex;
          gap: 8px;
        }
        
        .text-input {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .primary-button {
          background-color: #1877f2;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
        }
        
        .primary-button:hover {
          background-color: #166fe5;
        }
        
        .primary-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .room-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .room-option h3 {
          margin-bottom: 8px;
          font-size: 16px;
        }
        
        .create-room-button {
          width: 100%;
          background-color: #42b72a;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
          margin-bottom: 8px;
        }
        
        .create-room-button:hover {
          background-color: #36a420;
        }
        
        .create-room-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .chat-room {
          display: flex;
          flex-direction: column;
          height: 600px;
        }
        
        .room-header {
          padding: 8px 16px;
          background-color: #f0f2f5;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .leave-button {
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 14px;
          cursor: pointer;
        }
        
        .leave-button:hover {
          background-color: #d32f2f;
        }
        
        .messages-container {
          flex-grow: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        
        .no-messages {
          text-align: center;
          color: #666;
          margin-top: 16px;
        }
        
        .message {
          margin-bottom: 8px;
        }
        
        .sent-message {
          text-align: right;
        }
        
        .system-message {
          text-align: center;
        }
        
        .message-bubble {
          display: inline-block;
          max-width: 70%;
          padding: 8px 12px;
          border-radius: 18px;
        }
        
        .sent-message .message-bubble {
          background-color: #1877f2;
          color: white;
        }
        
        .received-message .message-bubble {
          background-color: #f0f2f5;
          color: black;
        }
        
        .system-message-bubble {
          display: inline-block;
          background-color: #f0f2f5;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 14px;
          color: #666;
        }
        
        .sender-name {
          font-weight: bold;
          font-size: 14px;
        }
        
        .message-text {
          word-break: break-word;
        }
        
        .message-time {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 2px;
        }
        
        .message-form {
          display: flex;
          padding: 8px;
          border-top: 1px solid #e0e0e0;
        }
        
        .message-input {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 18px 0 0 18px;
          font-size: 16px;
        }
        
        .send-button {
          background-color: #1877f2;
          color: white;
          border: none;
          border-radius: 0 18px 18px 0;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
        }
        
        .send-button:hover {
          background-color: #166fe5;
        }
        
        .send-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        @media (max-width: 600px) {
          .app-container {
            padding: 0;
          }
          
          .chat-container {
            height: 100vh;
            border-radius: 0;
          }
          
          .chat-room {
            height: calc(100vh - 60px);
          }
        }
      `}</style>
    </div>
  );
}

export default Apple;