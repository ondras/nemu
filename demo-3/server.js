(function () {
'use strict';

function lerp(value1, value2, frac) {
	return value1 + frac * (value2 - value1);
}

const app = {
	state: {
		initial: () => 0,
		interpolate: lerp,
		advance: (oldState, dt) => oldState + dt
	}
};




var app$2 = Object.freeze({
	default: app
});

class Logger {
	constructor(prefix, options) {
		this._prefix = prefix;
		this._options = options;
	}

	log(level, msg, ...args) {
		if (level < this._options.level) { return; }
		msg = `[${this._prefix}] ${msg}`;
		args.unshift(msg);
		this._options.facility(...args);
	}
}

class StateQueue {
	/**
	 * @param {number} backlog Maximum age (in ms)
	 */
	constructor(app, backlog = 1000) {
		this._app = app;
		this._data = [];
		this.setBacklog(backlog);
	}

	getSize() { return this._data.length; }

	setBacklog(backlog) {
		this._backlog = backlog;
		return this;
	}

	add(time, state) {
		let data = this._data;
		let maxAge = time-this._backlog;

		/* front of the queue: discard events that are *newer* than this one */
		while (data.length && data[data.length-1].time >= time) { data.pop(); }

		/* push to the front */
		data.push({time, state});

		/* back of the queue: discard old records */
		while (data.length > 2 && data[0].time < maxAge) { data.shift(); }
	}

	getNewestState() {
		let len = this._data.length;
		if (len == 0) { return null; }

		return this._data[len-1].state;
	}

	getNewestTime() {
		let len = this._data.length;
		if (len == 0) { return null; }

		return this._data[len-1].time;
	}

	getStateAt(time) {
		let data = this._data;
		let len = data.length;
		if (len == 0) { return null; }

		let indexBefore = -1, indexAfter = -1;
		for (let i=0; i<data.length; i++) {
			let item = data[i];
			if (item.time == time) { return item.state; }
			if (item.time < time) { indexBefore = i; }
			if (item.time > time) {
				indexAfter = i;
				break;
			}
		}

		if (indexBefore == -1) { /* older than available */
//            console.log("<")
			if (data.length == 1) { return data[0].state; }
			/* extrapolate to past */
			indexBefore = 0;
			indexAfter = 1;
		} else if (indexAfter == -1) { /* newer than available */
//           console.log(">")
			if (data.length == 1) { return data[len-1].state; }
			/* extrapolate to future */
			indexBefore = len-2;
			indexAfter = len-1;
		} else {
// 		     console.log("=")
		}

		let item1 = data[indexBefore];
		let item2 = data[indexAfter];
		let frac = (time - item1.time) / (item2.time - item1.time);

		return this._app.state.interpolate(item1.state, item2.state, frac);
	}
}

function merge(obj1, obj2) {
	return Object.assign(obj1, obj2);
}

class Component {
	constructor(loggerPrefix, app, options = {}) {
		this._options = {};
		this._app = app;
		this._stateQueue = new StateQueue(app);

		this.setOptions(options);
		this._logger = new Logger(loggerPrefix, this._options.log);

		setInterval(() => this._dumpStats(), 2000);
	}

	setOptions(options) {
		merge(this._options, options);
		return this;
	}

	_dumpStats() {
		this._log(1, "stats: queue size: %s", this._stateQueue.getSize());
	}

	_log(level, ...data) {
		return this._logger.log(level, ...data);
	}
}

const log = {
	facility: console.log,
	level: 1
};

const server = {
	fps: {
		sim: 60,
		notify: 12
	},
	log
};



const app$3 = {

};

class Server extends Component {
	constructor(app$$1 = {}, options = {}) {
		merge(options, server);
		merge(app$$1, app$3);
		super("server", app$$1, options);

		this._startTime = 0;
		this._clients = [];
	}

	addClient(socket) {
		this._log(2, "new client");
		socket.onMessage = (message) => this._onMessage(socket, message);
		this._clients.push(socket);
	}

	getState() {
		return this._stateQueue.getNewestState();
	}

	start() {
		this._startTime = Date.now();
		this._stateQueue.add(this._now(), this._app.state.initial());

		setInterval(() => this._tick(), 1000/this._options.fps.sim);
		setInterval(() => this._notify(), 1000/this._options.fps.notify);

		return this;
	}

	_onMessage(clientSocket, {type, data, t}) {
		this._log(0, "received message %s", type);
		switch (type) {
			case "hai":
				this._send(clientSocket, {type:"xxx"});
			break;

			case "lol":
				this._send(clientSocket, {type:"wut"});
			break;
		}
	}

	_tick() {
		let oldState = this._stateQueue.getNewestState();
		let oldTime = this._stateQueue.getNewestTime();
		let newTime = this._now();
		let dt = (newTime-oldTime)/1000;

		let newState = this._app.state.advance(oldState, dt);
		this._stateQueue.add(newTime, newState);
	}

	_send(clientSocket, message) {
		if (!message.t) { message.t = this._now(); }
		clientSocket.send(message);
	}

	_now() {
		return Date.now() - this._startTime;
	}

	_notify() {
		let state = this._stateQueue.getNewestState();
		let time = this._stateQueue.getNewestTime();

		let message = {
			type: "fyi",
			data: state,
			t: time
		};
		this._clients.forEach(t => this._send(t, message));
	}
}

class Socket {
	onOpen() {}

	send(message) {}
	onMessage(message) {}

	close() {}
	onClose() {}
}

class Server$1 extends Socket {
	constructor(connection) {
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

const PORT = 8080;
const WebSocketServer = require("websocket").server;

const gameServer = new Server(app$2).start();

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
	let socket = new Server$1(connection);
	gameServer.addClient(socket);
});

}());
