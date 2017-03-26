import * as app from "./app.js";
import { Client as Socket } from "nemu/socket/websocket.js";
import Client from "nemu/client.js";

let ws = new WebSocket("ws://localhost:8080");
let socket = new Socket(ws);
let client = new Client(socket, app);

setInterval(() => document.body.innerHTML = client.getState(), 50);
