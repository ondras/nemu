import Transport from "./transport.js";

export class Client extends Transport {
	constructor(ws) {
		super();
		this._ws = ws;
		this._ws.addEventListener("message", this);
		this._ws.addEventListener("close", this);
		this._ws.addEventListener("open", this);
	}

	send(message) { this._ws.send(JSON.stringify(message)); }
	close() { this._ws.close(); }

	handleEvent(e) {
		switch (e.type) {
			case "message": this.onMessage(JSON.parse(e.data)); break;
			case "close": this.onClose(); break;
			case "open": this.onOpen(); break;
		}
	}
}

export class Server extends Transport {
	constructor(connection) {
		super();
		this._connection = connection;
		connection.on("message", m => this.onMessage(JSON.parse(m.utf8Data)));
		connection.on("close", e => this.onClose());
	}

	send(message) { this._connection.send(JSON.stringify(message)); }
	close() { this._connection.close(); }
}
