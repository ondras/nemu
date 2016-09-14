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

const SIM = 60; // FPS
const NOTIFY = 4; // FPS

class Server {
    constructor(initialState) {
        this._state = initialState;
        this._clients = [];
    }

    addClient(transport) {
        transport.onMessage = (message) => this._onMessage(transport, message);
        this._clients.push(transport)
    }

    onConnect(clientId) {
        this._clients.push(clientId);
    }

    getState() {
        return this._state;
    }

    start() {
        setInterval(() => this._tick(), 1000/SIM);
        setInterval(() => this._notify(), 1000/NOTIFY);
    }

    _onMessage(clientTransport, {type, data, t}) {
        log("[server] received message %s", type);
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
        for (let id in this._state) {
            let entity = this._state[id];
            entity.angle += entity.velocity;

        }
    }

    _send(clientTransport, message) {
        message.t = Date.now();
        clientTransport.send(message);
    }

    _notify() {
        let state = JSON.parse(JSON.stringify(this._state));
        let message = {
            type: "fyi",
            data: state
        }
        this._clients.forEach(t => this._send(t, message));
    }
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
    constructor() {
        this._data = [];
    }

    push(time, state) {
        this._data.push({time, state});
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

class Client {
    constructor(transport) {
        this._transport = transport;
        this._transport.onOpen = () => this._onOpen();
        this._transport.onMessage = (message) => this._onMessage(message);

        this._serverTimeOffset = null;

        this._states = new StateQueue();
    }

    _onMessage({type, data, t}) {
        if (type != "fyi") log("[client] received message %s", type);
        switch (type) {
            case "fyi":
                this._states.push(t, data);
            break;

            case "wut":
                let now = Date.now();
                let latency = now - this._pingTime;

                this._serverTimeOffset = (t - now) + latency/2;
                log("[client] latency %s", latency);
                log("[client] server time offset %s", this._serverTimeOffset);
            break;
        }
    }

    getState() {
        let time = Date.now() + this._serverTimeOffset - 1000;
        return this._states.getStateAt(time);
    }

    _send(message) {
        this._transport.send(message);
    }

    _onOpen() {
        this._pingTime = Date.now();
        this._send({type:"lol"});
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