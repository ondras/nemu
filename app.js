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
			let x = Math.cos(entity.angle) * ARENA_RADIUS * SIZE;
			let y = Math.sin(entity.angle) * ARENA_RADIUS * SIZE;
			ctx.beginPath();
			ctx.arc(C + x, C + y, SIZE * PLAYER_RADIUS, 0, PI2, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
		}
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

    if (!entity1) { return entity2; } // new entity arrived to state2
    if (!entity2) { return entity1; } // old entity removed from state1

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

/**
 * @param {object} state1
 * @param {object} state2
 * @param {number} frac 0..1
 */
function lerpState(state1, state2, frac) {
    let newState = {};
    let oldState = (frac < 0.5 ? state1 : state2);
    for (let id in oldState) {
        newState[id] = lerpEntity(id, state1, state2, frac);
    }
    return newState;
}

class StateQueue {
    /**
     * @param {number} backlog Maximum age (in ms)
     */
    constructor(backlog = 1000) {
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

            return lerpState(item1.state, item2.state, frac);
        }
    }
}

const SIM = 60; // FPS
const NOTIFY = 8; // FPS

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

        let newState = this._createNewState(state, (now-time)/1000);
        this._states.add(now, newState);
    }

    _createNewState(state, dt) {
        let newState = {};
        for (let id in state) {
            let entity = state[id];
            let newEntity = Object.assign({}, entity);
            newEntity.angle += dt * newEntity.velocity;
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
    delay: 0
}

class Client {
    constructor(transport, options) {
        this._transport = transport;
        this._transport.onOpen = () => this._onOpen();
        this._transport.onMessage = (message) => this._onMessage(message);

        this._options = Object.assign({}, DEFAULT_OPTIONS);
        this._serverTimeOffset = null;
        this._states = new StateQueue();

        this.setOptions(options);

        setInterval(() => this._dumpStats(), 2000);
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
        this._states.setBacklog(this._options.delay + 150);

        return this;
    }

    getState() {
        return this._states.getStateAt(this._now());
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
                this._log("latency %s ms round-trip", latency);
                this._log("server time offset %s", this._serverTimeOffset);
            break;
        }
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
        this._latency = 0;
    }

    setLatency(latency) {
        this._latency = latency;
        return this;
    }

    setOther(other) {
        this._other = other;
        this.onOpen();
        return this;
    }

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
        this._other.onClose();
        return this;
    }
}

class DemoClient {
    constructor(server) {
        let serverTransport = new ProxyTransport();
        server.addClient(serverTransport);

        let clientTransport = new ProxyTransport();
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

}());
