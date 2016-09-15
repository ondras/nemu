import log from "./log.js";
import StateQueue from "./statequeue.js";

const DEFAULT_OPTIONS = {
    delay: 300
}

export default class Client {
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
