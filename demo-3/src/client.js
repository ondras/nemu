import * as app from "./app.js";
import { Client as Transport } from "nemu/transport/websocket.js";
import Client from "nemu/client.js";

let ws = new WebSocket("ws://localhost:8080");
let transport = new Transport(ws);
let client = new Client(transport, app);

setInterval(() => document.body.innerHTML = client.getState(), 50);
