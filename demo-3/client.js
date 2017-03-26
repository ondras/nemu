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

class Socket {
	onOpen() {}

	send(message) {}
	onMessage(message) {}

	close() {}
	onClose() {}
}

class Client extends Socket {
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



const client$1 = {
	delay: 0,
	log
};

const app$3 = {

};

class Client$1 extends Component {
	constructor(socket, app$$1 = {}, options = {}) {
		merge(options, client$1);
		merge(app$$1, app$3);
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

let ws$1 = new WebSocket("ws://localhost:8080");
let socket = new Client(ws$1);
let client = new Client$1(socket, app$2);

setInterval(() => document.body.innerHTML = client.getState(), 50);

}());
