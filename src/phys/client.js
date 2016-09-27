import log from "./log.js";
import StateQueue from "./statequeue.js";

const DEFAULT_OPTIONS = {
    delay: 0
}

export default class Client {
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
