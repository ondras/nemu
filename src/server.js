import log from "./log.js";

const SIM = 60; // FPS
const NOTIFY = 4; // FPS

export default class Server {
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
