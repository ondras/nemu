import log from "./log.js";
import StateQueue from "./statequeue.js";

export default class Client {
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
