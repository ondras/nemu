import log from "./log.js";

export default class Client {
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
