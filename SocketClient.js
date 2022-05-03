import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";

export default class SocketClient {
  constructor(options = {}) {
    if (typeof options === "string") {
      options = { url: options };
    }
    this.url = options.url || undefined;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.headers = options.headers || {};
    this.debug = options.debug || (() => {});

    if (!this.url) {
      console.error("Socket url not defined");
      return;
    }

    this.webSocketFactory = () => new SockJS(this.url);
    this.connectCallback = () => {};
    this.errorCallback = () => {};
    this.closeEventCallback = () => {};

    // ([ "queue/destination", { subscription: StompSubscription Object, callback: Function } ])
    this.channels = new Map();
    // ([ "queue/destination", { callback: Function } ])
    this.queue = new Map();
    // to support reconnection, pass a function that returns a new socket instance
    this.client = Stomp.over(this.webSocketFactory);
    this.client.debug = this.debug;
    this.isConnected = false;
  }

  setup(headers, connectCallback, errorCallback, closeEventCallback) {
    if (this.client) {
      // save params
      this.headers = headers || this.headers;
      this.connectCallback = connectCallback || this.connectCallback;
      this.errorCallback = errorCallback || this.errorCallback;
      this.closeEventCallback = closeEventCallback || this.closeEventCallback;
      // setup
      this.client.connectHeaders = this.headers;
      this.client.onConnect = frame => {
        this.isConnected = true;
        this._subscribeDestinationsInQueue();
        this.connectCallback(frame);
      };
      this.client.onStompError = frame => {
        this.isConnected = false;
        this._moveDestinationsToQueue();
        this.errorCallback(frame);
        this.reconnect();
      };
      this.client.onWebSocketClose = event => {
        this.isConnected = false;
        this._moveDestinationsToQueue();
        this.closeEventCallback(event);
        this.reconnect();
      };
    }
  }

  connect() {
    if (this.client && !this.isConnected) {
      this.client.activate();
    }
  }

  disconnect() {
    if (this.client && this.isConnected) {
      this.client.deactivate();
      this.isConnected = false;
    } else {
      console.error("Cannot close socket\n No socket connected");
    }
  }

  reconnect() {
    if (this.reconnectDelay > 0) {
      setTimeout(this._reconnect.bind(this), this.reconnectDelay);
    }
  }

  subscribe(destination, callback) {
    if (this.client && this.isConnected) {
      this._subscribeToDestination(destination, callback);
    } else {
      // if socket not connected, add to queue and wait for connection
      if (!this.queue.has(destination)) {
        this.queue.set(destination, {
          callback: callback
        });
      }
    }
  }

  unsubscribe(destination) {
    if (this.client && this.isConnected) {
      let channel = this.channels.get(destination);
      channel.subscription.unsubscribe();
      this.channels.delete(destination);
    } else {
      console.error(`Cannot unsubscribe ${destination}\n No socket connected`);
    }
  }

  unsubscribeAll() {
    if (this.client && this.isConnected) {
      for (const [, channel] of this.channels.entries()) {
        channel.subscription.unsubscribe();
      }
      this.channels.clear();
    } else {
      console.error("Cannot unsubscribe all\n No socket connected");
    }
  }

  publish(destination, body, headers) {
    if (this.client && this.isConnected) {
      let payload = { destination, body };
      if (typeof headers == "boolean") {
        payload.skipContentLengthHeader = headers;
      } else if (_isObject(headers)) {
        payload.headers = headers;
      }
      this.client.publish(payload);
    } else {
      console.error(
        `Cannot send message to ${destination}\n No socket connected`
      );
    }
  }

  publishBinary(destination, binaryBody, headers) {
    if (this.client && this.isConnected) {
      this.client.publish({
        destination,
        binaryBody,
        headers
      });
    } else {
      console.error(
        `Cannot send message to ${destination}\n No socket connected`
      );
    }
  }

  _reconnect() {
    if (!this.isConnected) {
      console.info("Websocket disconnected. Trying to reconnect.");
      // create new stomp client
      this.client = Stomp.over(this.webSocketFactory);
      this.setup();
      this.connect();
    }
  }

  _moveDestinationsToQueue() {
    // move all subscribed destinations to queue
    this.channels.forEach((value, key) => {
      if (!this.queue.has(key)) {
        this.queue.set(key, {
          destination: key,
          callback: value.callback
        });
      }
    });
    this.channels.clear();
  }

  _subscribeDestinationsInQueue() {
    // subscribe all destinations in queue
    if (this.queue.size > 0) {
      this.queue.forEach((value, key) => {
        this._subscribeToDestination(key, value.callback);
      });
      this.queue.clear();
    }
  }

  _subscribeToDestination(destination, callback) {
    if (!this.channels.has(destination)) {
      let subscription = this.client.subscribe(destination, callback);
      this.channels.set(destination, { subscription, callback });
    } else {
      console.log(`Already subscribed to ${destination}`);
    }
  }

  _isObject() {
    return !(value instanceof Date) && !Array.isArray(value) && !Object.is(value, null) && !Object.is(value, undefined) && !(value instanceof Function);
  }
}
