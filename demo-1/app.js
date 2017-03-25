(function () {
'use strict';

function lerp(value1, value2, frac) {
	return value1 + frac * (value2 - value1);
}

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

		if (indexBefore == -1) { // older than available
//            console.log("<")
			return data[0].state;
		} else if (indexAfter == -1) { // newer than available
//           console.log(">")
			return data[len-1].state;
		} else {
//            console.log("=")
			let item1 = data[indexBefore];
			let item2 = data[indexAfter];
			let frac = (time - item1.time) / (item2.time - item1.time);

			return this._app.state.interpolate(item1.state, item2.state, frac);
		}
	}
}

function merge(obj1, obj2) {
	return Object.assign({}, obj1, obj2);
}

class Component {
	constructor(loggerPrefix, app, options) {
		this._app = app;
		this._options = {};
		this._stateQueue = new StateQueue(app);

		this.setOptions(options);
		this._logger = new Logger(loggerPrefix, options.log);

		setInterval(() => this._dumpStats(), 2000);
	}

	setOptions(options) {
		this._options = merge(this._options, options);
		return this;
	}

	_dumpStats() {
		this._log(1, "stats: queue size: %s", this._stateQueue.getSize());
	}

	_log(level, ...data) {
		return this._logger.log(level, ...data);
	}
}

const server$1 = {
	fps: {
		sim: 60,
		notify: 12
	}
};

const client$1 = {
	delay: 100
};

const app$1 = {

};

class Client extends Component {
	constructor(socket, app$$1, options) {
		options = merge(client$1, options);
		app$$1 = merge(app$1, app$$1);
		super("client", app$$1, options);

		this._socket = socket;
		this._socket.onOpen = () => this._onOpen();
		this._socket.onMessage = (message) => this._onMessage(message);

		this._serverTimeOffset = null;
	}

	setOptions(options) {
		super.setOptions(options);
		/*
			Given a current (server) time T and latency L, the latest server-side snapshot
			is from T-L. Our StateQueue stores records from T-L (newest) to T-L-backlog (oldest).

			When retrieving state data, we use _now(), which corresponds to T-delay. We need to make sure
			this value is somewhere in the middle of the StateQueue.

			(The delay value shall be always greater or equal to L, or we will never have data recent enough.)
			
			0-------------------------------T
						 <---backlog---><-L->
								<---delay--->
								^
								\------_now()

			The largest backlog is necessary for L=0. In this case, we need it to be (>=1 snapshot) larger than the delay. 

			150 is a large safe inter-snapshot delay for reasonable servers.
		*/
		this._stateQueue.setBacklog(this._options.delay + 150);

		return this;
	}

	getState() {
		return this._stateQueue.getStateAt(this._now());
	}

	_onMessage({type, data, t}) {
		if (type != "fyi") { this._log(0, "received message %s", type); }

		switch (type) {
			case "fyi":
				this._stateQueue.add(t, data);
			break;

			case "wut":
				let now = Date.now();
				let latency = now - this._pingTime;

				this._serverTimeOffset = (t - now) + latency/2;
				this._log(2, "latency %s ms round-trip", latency);
				this._log(2, "server time offset %s", this._serverTimeOffset);
			break;
		}
	}

	_now() {
		return Date.now() + this._serverTimeOffset - this._options.delay;
	}

	_send(message) {
		this._socket.send(message);
	}

	_onOpen() {
		this._pingTime = Date.now();
		this._send({type:"lol"});
	}
}

class Server extends Component {
	constructor(app$$1, options) {
		options = merge(server$1, options);
		app$$1 = merge(app$1, app$$1);
		super("server", app$$1, options);

		this._startTime = 0;
		this._clients = [];
	}

	addClient(socket) {
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

class Proxy extends Socket {
	send(message) {
		if (this._latency) {
			setTimeout(() => {
				this._other.onMessage(message);
			}, this._latency);
		} else {
			this._other.onMessage(message);
		}
		return this;
	}

	close() {
		if (this._latency) {
			setTimeout(() => {
				this._other.onClose();
			}, this._latency);
		} else {
			this._other.onClose();
		}
		return this;
	}
}

class FakeServer extends Proxy {
	constructor(clientSocket) {
		super();
		this._other = clientSocket;
	}
}

class FakeClient extends Proxy {
	constructor(server) {
		super();
		this._latency = 0;
		this._other = new FakeServer(this);

		setTimeout(() => {
			server.addClient(this._other);
			this.onOpen();
		}, 0);
	}

	setLatency(latency) {
		this._latency = latency;
		this._other.latency = latency;
		return this;
	}
}

const app = {
	state: {
		initial: () => 0,
		interpolate: lerp,
		advance: (oldState, dt) => oldState + dt
	}
};

const serverOptions = {
	log: {
		level: 0, // all
		facility: console.log
	}
};

const clientOptions = {
	log: {
		level: 0, // all
		facility: console.log
	}
};

let server = new Server(app, serverOptions).start();
let socket = new FakeClient(server);
let client = new Client(socket, app, clientOptions);

setInterval(() => document.body.innerHTML = client.getState(), 50);

}());
