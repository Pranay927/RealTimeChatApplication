import { WebSocketServer, WebSocket } from "ws";

const wss  = new WebSocketServer({port: 8080});

interface User {
    socket: WebSocket,
    roomID: String
}

let User: User[] = [];

// Think of socket as a private communication channel between the server and one connected client.
// Imagine socket as a two way communication vehicle btw any client and a single server

wss.on("connection", (socket)=>{
    socket.send("You are connected to chat app")
    socket.on("message", (message: String|Buffer)=>{
        // console.log(message.toString())


        // I'll parse the message
        const msg = JSON.parse(message.toString());
        
        if(msg.type === 'JOIN'){
            User.push({
                socket,
                roomID: msg.payload.roomID
            })
        }
        else if(msg.type === 'CHAT'){
            /* 
                {
                    "type":'Chat',
                    'payload':{
                        roomID : 123,
                        message   : "Hi this is the message"
                    }
                }            
            */
           let current_user_roomID = msg.payload.roomID;
           let msg_sent            = msg.payload.message
           User.forEach((u)=> {
                if(u.roomID === current_user_roomID && u.socket !== socket){
                    u.socket.send(msg_sent);
                }
           });
        }

    })
})


