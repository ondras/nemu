(function (nemu_transport_js) {
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
			let x = Math.cos(entity.angle) * ARENA_RADIUS * SIZE;
			let y = Math.sin(entity.angle) * ARENA_RADIUS * SIZE;
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

	log(level, ...data) {
		if (level < this._options.level) { return; }
		this._options.facility(`[${this._prefix}]`, ...data);
	}
}

class StateQueue$1 {
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
			if (item.time <= time) { indexBefore = i; }
			if (item.time >= time) {
				indexAfter = i;
				break;
			}
		}

		if (indexBefore == -1) { // older than available
//            console.log("<")
			return data[0].state;
		} else if (indexAfter == -1) { // newer than available
//            console.log(">")
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

class Component {
	constructor(loggerPrefix, app, options) {
		this._logger = new Logger(loggerPrefix, options.log);
		this._app = app;
		this._options = options;

		this._stateQueue = new StateQueue$1();

		setInterval(() => this._dumpStats(), 2000);
	}

	_dumpStats() {
		this._log(1, "stats: queue size: %s", this._stateQueue.getSize());
	}

	_log(level, ...data) {
		return this._logger.log(level, ...data);
	}
}

const server$1 = {

};

const client = {
	delay: 0
};

const app = {

};

function merge(obj1, obj2) {
	return Object.assign({}, obj1, obj2);
}

const SIM = 60; // FPS
const NOTIFY = 8; // FPS

class Server {
	constructor(app$$1, options) {
		options = merge(server$1, options);
		app$$1 = merge(app, app$$1);
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

		setInterval(() => this._tick(), 1000/SIM);
		setInterval(() => this._notify(), 1000/NOTIFY);
	}

	_onMessage(clientSocket, {type, data, t}) {
		this._log("received message %s", type);
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
		let oldtime = this._stateQueue.getNewestTime();
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

const DEFAULT_OPTIONS = {
    delay: 0
};

class Client extends Component {
    constructor(socket, app$$1, options) {
        options = merge(client, options);
        app$$1 = merge(app, app$$1);
        super("client", app$$1, options);

        this._socket = socket;
        this._socket.onOpen = () => this._onOpen();
        this._socket.onMessage = (message) => this._onMessage(message);

        this._options = Object.assign({}, DEFAULT_OPTIONS);
        this._serverTimeOffset = null;
        this._states = new StateQueue();

        this.setOptions(options);
    }

    setOptions(options) {
        Object.assign(this._options, options);

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

            The largest backlog is necessary for L=0. In this case, we need it to be (one snapshot) larger than the delay. 

            150 is a large safe inter-snapshot delay for reasonable servers.
        */
        this._stateQueue.setBacklog(this._options.delay + 150);

        return this;
    }

    getState() {
        return this._stateQueue.getStateAt(this._now());
    }

    _onMessage({type, data, t}) {
        if (type != "fyi") { this._log("received message %s", type); }

        switch (type) {
            case "fyi":
                this._stateQueue.add(t, data);
            break;

            case "wut":
                let now = Date.now();
                let latency = now - this._pingTime;

                this._serverTimeOffset = (t - now) + latency/2;
                this._log("latency %s ms round-trip", latency);
                this._log("server time offset %s", this._serverTimeOffset);
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

class DemoClient {
    constructor(server) {
        let serverTransport = new nemu_transport_js.ProxyTransport();
        server.addClient(serverTransport);

        let clientTransport = new nemu_transport_js.ProxyTransport();
        let client = new Client(clientTransport);

        serverTransport.setOther(clientTransport);
        clientTransport.setOther(serverTransport);

        this._client = client;
        this._transports = [serverTransport, clientTransport];
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
       this._transports.forEach(t => t.setLatency(latency));
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

/* velocity in rads/s */
let model = {
    "a": {angle:0, color:"red", velocity:1},
    "b": {angle:Math.PI, color:"blue", velocity:-1}
};

let server = new Server(model);
server.start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

let c1 = new DemoClient(server);
document.body.appendChild(c1.getNode());
/*
let c2 = new DemoClient(server);
document.body.appendChild(c2.getNode());
*/

}(nemu_transport_js));
