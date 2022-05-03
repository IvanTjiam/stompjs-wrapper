import SocketClient from "SocketClient";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const url = "ws://localhost:3000/ws";

const socket = new SocketClient(url);

socket.setup(
    // headers
    { Authorization: "Bearer " + token },
    // connectCallback
    () => {
        console.log("WebSocket connected");
    },
    // errorCallback
    frame => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
    },
    // closeEventCallback
    event => {
        console.error("WebSocket closed with code " + event.code);
    }
);

socket.connect();

socket.subscribe(
    `/topic/posts`,
    message => {
        const body = JSON.parse(message.body);
        let data = body.data;
        if (!Array.isArray(data)) data = [data];
        data.forEach(e => console.log(e));
    }
);

socket.publish(`/topic/posts`, "Hello World");
