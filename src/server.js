import log from "./log.js";

const SIM = 60; // FPS
const NOTIFY = 30; // FPS

export default class Server {
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
