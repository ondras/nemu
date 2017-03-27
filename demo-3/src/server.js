import * as app from "./app.js";
import GameServer from "nemu/server.js";
import { Server as Transport } from "nemu/transport/websocket.js";

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
	let transport = new Transport(connection);
	gameServer.addClient(transport);
});
