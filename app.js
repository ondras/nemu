(function () {
'use strict';

const SIZE = 100;

class Renderer {
	constructor(component) {
		this._component = component;
		this._node = document.createElement("canvas");
		this._node.width = this._node.height = SIZE;
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
		let model = this._component.getState();
		if (!model) { return; }
		let ctx = this._node.getContext("2d");
		ctx.clearRect(0, 0, this._node.width, this._node.height);

		for (let id in model) {
			let entity = model[id];
			let x = Math.cos(entity.angle) * SIZE / 3;
			let y = Math.sin(entity.angle) * SIZE / 3;
			ctx.beginPath();
			ctx.arc(SIZE/2 + x, SIZE/2 + y, 10, 0, 2*Math.PI, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
		};
	}
}

function log(...args) {
    return console.log.apply(console, args);
}

function lerp(value1, value2, frac) {
    return value1 + frac * (value2 - value1);
}

function lerpEntity(id, state1, state2, frac) {
    let entity1 = state1[id];
    let entity2 = state2[id];
    let entity = {};

    for (let key in entity1) {
        let value1 = entity1[key];
        let value2 = entity2[key];
        if (typeof(value1) == "number") { /* scalar interpolation */
            entity[key] = lerp(value1, value2, frac);
        } else if (value1 instanceof Array) { /* vector interpolation */
            entity[key] = value1.map((v1, index) => lerp(v1, value2[index], frac));
        } else { /* other values are copied */
            entity[key] = value1;
        }
    }

    return entity;
}

function lerpState(state1, state2, frac) {
    let state = {};
    for (let id in state1) {
        state[id] = lerpEntity(id, state1, state2, frac);
    }
    return state;
}

class StateQueue {
    /**
     * @param {number} backlog Maximum age (in ms)
     */
    constructor(backlog = 1000) {
        this._backlog = backlog;
        this._data = [];
    }

    getSize() {
        return this._data.length;
    }

    add(time, state) {
        /* IMPROVE: guarantee monotonic time by checking for proper insert index? */
        this._data.push({time, state});

        /* remove old records */
        while (time-this._data[0].time > this._backlog) { this._data.shift(); }
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
        let len = this._data.length;
        if (len == 0) { return null; }

        let indexBefore = -1, indexAfter = -1;
        for (let i=0; i<this._data.length; i++) {
            let item = this._data[i];
            if (item.time <= time) { indexBefore = i; }
            if (item.time >= time) {
                indexAfter = i;
                break;
            }
        }

        if (indexBefore == -1) { // older than available
            return this._data[0].state;
        } else if (indexAfter == -1) { // newer than available
            return this._data[len-1].state;
        } else {
            let item1 = this._data[indexBefore];
            let item2 = this._data[indexAfter];
            let frac = (time - item1.time) / (item2.time - item1.time);

            return lerpState(item1.state, item2.state, frac);
        }
    }
}

const SIM = 60; // FPS
const NOTIFY = 10; // FPS

class Server {
    constructor(initialState) {
        this._startTime = this._now();
        this._clients = [];

        this._states = new StateQueue(1000);
        this._states.add(this._now(), initialState);
    }

    addClient(transport) {
        transport.onMessage = (message) => this._onMessage(transport, message);
        this._clients.push(transport)
    }

    getState() {
        return this._states.getNewestState();
    }

    start() {
        setInterval(() => this._tick(), 1000/SIM);
        setInterval(() => this._notify(), 1000/NOTIFY);
        setInterval(() => this._dumpStats(), 2000);
    }

    _onMessage(clientTransport, {type, data, t}) {
        this._log("received message %s", type);
        switch (type) {
            case "hai":
                this._send(clientTransport, {type:"xxx"});
            break;

            case "lol":
                this._send(clientTransport, {type:"wut"});
            break;
        }
    }

    _tick() {
        let state = this._states.getNewestState();
        let time = this._states.getNewestTime();
        let now = this._now();

        let newState = this._createNewState(state, now - time);
        this._states.add(now, newState);
    }

    _createNewState(state, dt) {
        let newState = {};
        for (let id in state) {
            let entity = state[id];
            let newEntity = Object.assign({}, entity);
            newEntity.angle += newEntity.velocity;
            newState[id] = newEntity;
        }
        return newState;
    }

    _send(clientTransport, message) {
        if (!message.t) { message.t = this._now(); }
        clientTransport.send(message);
    }

    _now() {
        return Date.now() - (this._startTime || 0);
    }

    _notify() {
        let state = this._states.getNewestState();
        let time = this._states.getNewestTime();

        let message = {
            type: "fyi",
            data: state,
            t: time
        }
        this._clients.forEach(t => this._send(t, message));
    }

    _dumpStats() {
        this._log("stats: queue size: %s", this._states.getSize());
    }

    _log(msg, ...args) {
        return log(`[server] ${msg}`, ...args);
    }
}

const DEFAULT_OPTIONS = {
    delay: 300
}

class Client {
    constructor(transport, options) {
        this._transport = transport;
        this._transport.onOpen = () => this._onOpen();
        this._transport.onMessage = (message) => this._onMessage(message);

        this._options = Object.assign({}, DEFAULT_OPTIONS, options);

        this._serverTimeOffset = null;
        this._states = new StateQueue(2*this._options.delay);

        setInterval(() => this._dumpStats(), 2000);
    }

    _onMessage({type, data, t}) {
        if (type != "fyi") { this._log("received message %s", type); }

        switch (type) {
            case "fyi":
                this._states.add(t, data);
            break;

            case "wut":
                let now = Date.now();
                let latency = now - this._pingTime;

                this._serverTimeOffset = (t - now) + latency/2;
                this._log("latency %s", latency);
                this._log("server time offset %s", this._serverTimeOffset);
            break;
        }
    }

    getState() {
        return this._states.getStateAt(this._now());
    }

    _now() {
        return Date.now() + this._serverTimeOffset - this._options.delay;
    }

    _send(message) {
        this._transport.send(message);
    }

    _onOpen() {
        this._pingTime = Date.now();
        this._send({type:"lol"});
    }

    _dumpStats() {
        this._log("stats: queue size: %s", this._states.getSize());
    }

    _log(msg, ...args) {
        return log(`[client] ${msg}`, ...args);
    }

}

class Transport {
    send(message) {}
    close() {}
    onMessage(message) {}
    onClose() {}
    onOpen() {}
}

class ProxyTransport extends Transport {
    constructor() {
        super();
        this._other = null;
    }

    setOther(other) {
        this._other = other;
        this.onOpen();
    }

    send(message) {
//        setTimeout(() => {
            this._other.onMessage(message);
//        }, 100);
    }

    close() { this._other.onClose(); }
}

let model = {
    "a": {angle:0, color:"red", velocity:.02},
    "b": {angle:Math.PI, color:"blue", velocity:-.02}
};

let server = new Server(model);
server.start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

function createClient() {
    let serverTransport = new ProxyTransport();
    server.addClient(serverTransport);

    let clientTransport = new ProxyTransport();
    let client = new Client(clientTransport);

    serverTransport.setOther(clientTransport);
    clientTransport.setOther(serverTransport);

    let r = new Renderer(client);
    document.body.appendChild(r.getNode());

}

createClient();

}());