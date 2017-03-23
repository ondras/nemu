import log from "./log.js";
import StateQueue from "./statequeue.js";

const SIM = 60; // FPS
const NOTIFY = 8; // FPS

export default class Server {
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
