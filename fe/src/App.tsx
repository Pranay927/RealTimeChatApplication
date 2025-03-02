import { useEffect, useState, useRef } from "react";

function App() {
  const [clientMsg, setClientMsg] = useState(""); // state variable to store this clients msg...
  const [msgs, setMsgs] = useState<string[]>([]);
  let ws = useRef<WebSocket | null>(null);

  /* ✅ The WebSocket instance is created only once on mount.
     ✅ It’s stored persistently in ws.current, so you can access it later (e.g., in event handlers). */
  useEffect(() => {
    ws.current = new WebSocket("http://localhost:8080");
    console.log(ws);
    console.log(typeof ws);

    ws.current.onopen = () => {
      ws.current?.send(
        JSON.stringify({
            type : 'JOIN', 
            payload:{
                roomID :'red'
            }
        })
      );
    };

    ws.current.onmessage = (e) => {
      console.log(e.data);
      setMsgs((m) => [...m, e.data]);
    };

    return () => {
      ws.current?.close(); // what happens if you don't add cleanup _ Strict mode
    };
  }, []);

  const sendMessageToWSS = () => {
    if (clientMsg.trim() == "") return;

    ws.current?.send(
        JSON.stringify(
            {
                type : 'CHAT',
                payload:{
                    roomID: 'red',
                    message: clientMsg
                }
            }
        )
    );

    setMsgs((m) => [...m, clientMsg]);
    
    setClientMsg("");
  };
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-black">
      <div className="bg-neutral-900 border border-purple-500 shadow-lg shadow-slate-50 h-4/5 w-3/4 rounded-md overflow-auto scroll-m-0 ">
        <div className=""></div>
        <div className="p-2">
          {msgs.map((m, index) => (
            <div
              key={index}
              className="text-black bg-neutral-200 w-fit m-1 rounded-md px-2 py-1 transition-transform font-mono hover:scale-105"
            >
              {m}
            </div>
          ))}
        </div>
      </div>
      <div className="w-3/4 p-2 py-1 flex justify-between">
        <input
          className="w-5/6 bg-neutral-200 rounded-lg outline-none font-mono p-2 py-1"
          type="text"
          value={clientMsg}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessageToWSS();
            }
          }}
          onChange={(e) => setClientMsg(e.target.value)}
        />

        <button
          className="text-white mr-10 px-10 py-2 shadow-2xl shadow-blue-600 bg-blue-500 rounded-lg font-mono font-semibold  hover:bg-blue-600 outline-none"
          onClick={sendMessageToWSS}
        >
          send
        </button>
      </div>
    </div>
  );
}

export default App;
