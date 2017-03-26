(function () {
'use strict';

const ARENA_RADIUS = 0.4;
const PLAYER_RADIUS = 0.09;
const PI2 = Math.PI * 2;

class Renderer {
	constructor(component) {
		this._component = component;
		this._node = document.createElement("canvas");
		this._tick();
	}

	getNode() {
		return this._node;
	}

	_tick() {
		this._render();
		requestAnimationFrame(() => this._tick());
	}

	_render() {
		let SIZE = this._node.clientWidth;
		this._node.width = this._node.height = SIZE;

		let model = this._component.getState();
		if (!model) { return; }

		let ctx = this._node.getContext("2d");
		let C = SIZE/2;

		/* arena */
		ctx.beginPath();
		ctx.arc(C, C, SIZE * ARENA_RADIUS, 0, PI2, true);
		ctx.stroke();

		ctx.lineWidth = 3;

		for (let id in model) {
			let entity = model[id];
			let x = entity.position[0] * ARENA_RADIUS * SIZE;
			let y = entity.position[1] * ARENA_RADIUS * SIZE;
			ctx.beginPath();
			ctx.arc(C + x, C + y, SIZE * PLAYER_RADIUS, 0, PI2, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
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

const server$1 = {
	fps: {
		sim: 60,
		notify: 12
	},
	log
};

const client = {
	delay: 0,
	log
};

const app$1 = {

};

class Server extends Component {
	constructor(app$$1 = {}, options = {}) {
		merge(options, server$1);
		merge(app$$1, app$1);
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

class Client extends Component {
	constructor(socket, app$$1 = {}, options = {}) {
		merge(options, client);
		merge(app$$1, app$1);
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
		this._other._latency = latency;
		return this;
	}
}

class DemoClient {
    constructor(server, app) {
        this._socket = new FakeClient(server);
        this._client = new Client(this._socket, app);

        this._node = this._build();

        this._setLatency(0);
        this._setDelay(0);
    }

    getNode() { return this._node; }

    _build(client) {
        let node = document.createElement("div");
        node.classList.add("demo-client");

        let latency = this._buildLatency();
        node.appendChild(latency);

        let delay = this._buildDelay();
        node.appendChild(delay);

        let r = new Renderer(this._client);
        node.appendChild(r.getNode());

        return node;
    }

    _buildLatency() {
        let node = document.createElement("label");
        node.classList.add("latency");
        node.innerHTML = "Latency";

        let input = this._buildRange();
        input.oninput = e => this._setLatency(e.target.valueAsNumber);
        node.appendChild(input);

        let span = document.createElement("span");
        node.appendChild(span);

        return node;
    }

    _buildDelay() {
        let node = document.createElement("label");
        node.classList.add("delay");
        node.innerHTML = "Delay";

        let input = this._buildRange();
        input.oninput = e => this._setDelay(e.target.valueAsNumber);
        node.appendChild(input);

        let span = document.createElement("span");
        node.appendChild(span);

        return node;
    }

    _setLatency(latency) {
       this._node.querySelector(".latency input").value = latency;
       this._node.querySelector(".latency span").innerHTML = latency;
       this._socket.setLatency(latency);
    }

    _setDelay(delay) {
       this._node.querySelector(".delay input").value = delay;
       this._node.querySelector(".delay span").innerHTML = delay;
       this._client.setOptions({delay});
    }

    _buildRange() {
        let node = document.createElement("input");
        node.type = "range";
        node.max = 1000;
        return node;
    }
}

function lerp$1(value1, value2, frac) {
	return value1 + frac * (value2 - value1);
}

function lerp$2(arr1, arr2, frac) {
	return arr1.map((val, index) => lerp$1(val, arr2[index], frac));
}

function lerp$$1(obj1, obj2, frac) {
	return Object.keys(obj1).reduce((acc, key) => {
		let val = obj1[key];
		switch (true) {
			case typeof(val) == "number": acc[key] = lerp$1(val, obj2[key], frac); break;
			case val instanceof Array: acc[key] = lerp$2(val, obj2[key], frac); break;
			default: acc[key] = val;
		}
		return acc;
	}, {});
}

let model = {
    "a": {angle:0, color:"red", velocity:1, position:[0,0]},
    "b": {angle:Math.PI, color:"blue", velocity:-1, position:[0,0]}
};

const app = {
	state: {
		initial: () => model,
		interpolate: (state1, state2, frac) => {
			let newState = {};
			let oldState = (frac < 0.5 ? state1 : state2);
			for (let id in oldState) {
				let e1 = state1[id];
				let e2 = state2[id];
				if (!e1 || !e2) { continue; }
				newState[id] = lerp$$1(e1, e2, frac);
			}
			return newState;
		},
		advance: (oldState, dt) => Object.keys(oldState).reduce((acc, key) => {
			let entity = Object.assign({}, oldState[key]);
			entity.angle += dt * entity.velocity;
			entity.position = [Math.cos(entity.angle), Math.sin(entity.angle)];
			acc[key] = entity;
			return acc;
		}, {})
	}
};

let server = new Server(app).start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

let c1 = new DemoClient(server, app);
document.body.appendChild(c1.getNode());

}());
