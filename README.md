# stompjs-wrapper

Wrapper for Stomp-js

## Dependencies

- sockjs-client
- stompjs

## Usage

Create new instance
```js
import SocketClient from "SocketClient";

// pass options to new socket client instance
const options = {
    url: "ws://localhost:8080/ws",
    reconnectDelay: 5000, // use 0 to disable auto reconnection
    headers: { Authorization: "Bearer " + "YOUR_JWT_TOKEN" },
    debug: (() => {})
}
const socket = new SocketClient(options);
```
```js
// or simply pass a websocket url
const socket = new SocketClient("ws://localhost:8080/ws");
```

Setup callback functions
```js
// setup(
//     headers: object, 
//     connectCallback: CallbackFunction, 
//     errorCallback: CallbackFunction, 
//     closeEventCallback: CallbackFunction
// )
socket.setup(
    // you can also set your headers here
    { Authorization: "Bearer " + "YOUR_JWT_TOKEN" },
    () => {
        console.log("WebSocket connected");
    },
    frame => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
    },
    event => {
        console.error("WebSocket closed with code " + event.code);
    }
);
```

Start connection
```js
socket.connect();
```

Subscribe to destination
```js
// subscribe(destination: string, callback: CallbackFunction)
socket.subscribe("/topic/posts", message => console.log(message));
```

Send message to destination
```js
// publish(
//     destination: string,
//     body: string,
//     [Optional] headers: object || boolean
// )
socket.publish(
    "/topic/posts",
    "Hello World",
    { priority: 9 }
);
```

Send binary message to destination
```js
// publishBinary(
//     destination: string,
//     binaryBody: Uint8Array,
//     [Optional] headers: object
// )
const jsonToBinary = (json) => {
    let str = JSON.stringify(json, null, 0);
	let res = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++)
		res[i] = str.charCodeAt(i);
	return res;
}
socket.publishBinary(
    "/topic/posts",
    jsonToBinary("{'msg': 'Hellow World'}"),
    { "content-type": "application/octet-stream" }
);
```

Unsubscribe destination
```js
// unsubscribe(destination: string)
socket.unsubscribe("/topic/posts");
```

Unsubscribe all destinations
```js
socket.unsubscribeAll();
```

Disconnect
```js
socket.disconnect();
```

Manually reconnect
```js
socket.reconnect();
```
