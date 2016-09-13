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
		let model = this._component.getModel();
		let ctx = this._node.getContext("2d");
		ctx.clearRect(0, 0, this._node.width, this._node.height);

		model.forEach(entity => {
			let x = Math.cos(entity.angle) * SIZE / 3;
			let y = Math.sin(entity.angle) * SIZE / 3;
			ctx.beginPath();
			ctx.arc(SIZE/2 + x, SIZE/2 + y, 10, 0, 2*Math.PI, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
		});
	}
}

function log(...args) {
    return console.log.apply(console, args);
}

const SIM = 60; // FPS
class Server {
    constructor(model, options) {
        this._model = model;
        this._options = options;
        this._clients = [];
    }

    onConnect(clientId) {
        this._clients.push(clientId);
    }

    getModel() {
        return this._model;
    }

    start() {
        setInterval(() => this._tick(), 1000/SIM);
//        setInterval(() => this._notify(), 1000/NOTIFY);
    }

    onMessage(clientId, {type, data, t}) {
        log("[server] received message %s", type);
        switch (type) {
            case "hai":
                this._send(clientId, {type:"xxx"});
            break;

            case "lol":
                this._send(clientId, {type:"wut"});
            break;
        }
    }

    _tick() {
        this._model.forEach(entity => {
            entity.angle += .02;
        })
    }

    _send(clientId, message) {
        message.t = Date.now();
        this._options.send(clientId, message);
    }

    _notify() {
        let message = {
            type: "fyi",
            data: this._model
        }
        this._clients.forEach(id => this._send(id, message));
    }
}

class Client {
    constructor(options) {
        this._options = options;
        this._options.connect().then(() => this._onConnect());
    }

    onMessage({type, data, t}) {
        log("[client] received message %s", type);
        switch (type) {
            case "fyi":
            break;

            case "wut":
                let now = Date.now();
                let latency = now - this._pingTime;
                log("[client] latency %s", latency);
            break;
        }
    }

    getModel() {
        return this._model;
    }

    _send(message) {
        this._options.send(message);
    }

    _onConnect() {
        this._pingTime = Date.now();
        this._send({type:"lol"});
    }
}

let clients = {};
let model = [
    {angle:0, color:"red", velocity:.02},
    {angle:Math.PI, color:"blue", velocity:-.02},
];

const serverOptions = {
    send(id, message) {
        clients[id].onMessage(message);
    }
}

let server = new Server(model, serverOptions);
server.start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

let ID = "1";
let DELAY = 100;
let clientOptions = {
    connect() {
        server.onConnect(ID)
        return Promise.resolve();
    },

    send(message) {
        setTimeout(() => {
            server.onMessage(ID, message);
        }, DELAY);
    }
}

let c1 = new Client(clientOptions);
clients[ID] = c1;

//let r2 = new Renderer(c1);
//document.body.appendChild(r2.getNode());

}());