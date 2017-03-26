import * as app from "./app.js";
import GameServer from "nemu/server.js";
import { Server as Socket } from "nemu/socket/websocket.js";

const PORT = 8080;
const WebSocketServer = require("websocket").server;

const gameServer = new GameServer(app).start();

const httpServer = require("http").createServer((request, response) => {
    response.writeHead(404);
    response.end();
});
httpServer.listen(PORT);

const wsServer = new WebSocketServer({
    httpServer,
    autoAcceptConnections: true
});
wsServer.on("connect", connection => {
	let socket = new Socket(connection);
	gameServer.addClient(socket);
});
