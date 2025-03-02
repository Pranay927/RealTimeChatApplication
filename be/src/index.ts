// import { WebSocketServer, WebSocket } from "ws";

// const wss  = new WebSocketServer({port: 8080});

// let allSockets: WebSocket[] = []; // ensuring only WebSocket instances are stored.

// // Think of socket as a private communication channel between the server and one connected client.
// Imagine socket as a two way communication vehicle btw any client and a single server
// wss.on("connection", (socket: WebSocket)=> {
//     socket.send("Connected to wss.")
//     allSockets.push(socket);
//     // console.log(socket);

//     socket.on("message", (message: String|Buffer)=>{
//         console.log(`Received:${message.toString()}`);

//         allSockets.forEach(client => {
//             if(client!== socket){
//                 client.send(message.toString());
//             }
                
//         });
//     })

//     socket.on("close", ()=>{

//         console.log("Client disconnected")
//         allSockets = allSockets.filter((e)=>e!==socket)
//         console.log(allSockets.length);
//     })
// })



import { WebSocketServer, WebSocket } from "ws";
const wss  = new WebSocketServer({port:8080});

const allSockets: WebSocket[] = [];

wss.on("connection", (socket)=>{
    socket.send("connected to real time chat application");
    allSockets.push(socket);
    socket.on("message", (message)=>{
        allSockets.forEach((sock)=>{
            if(sock !== socket){
                sock.send(message.toString());
            }
        })
    })
})