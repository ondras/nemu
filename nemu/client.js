import Component from "./component.js";

import { app as appDefaults, client as clientDefaults } from "./util/defaults.js";
import merge from "./util/merge.js";

export default class Client extends Component {
	constructor(socket, app, options) {
		options = merge(clientDefaults, options);
		app = merge(appDefaults, app);
		super("client", app, options);

		this._socket = socket;
		this._socket.onOpen = () => this._onOpen();
		this._socket.onMessage = (message) => this._onMessage(message);

		this._serverTimeOffset = null;
	}

	setOptions(options) {
		super.setOptions(options);
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

			The largest backlog is necessary for L=0. In this case, we need it to be (>=1 snapshot) larger than the delay. 

			150 is a large safe inter-snapshot delay for reasonable servers.
		*/
		this._stateQueue.setBacklog(this._options.delay + 150);

		return this;
	}

	getState() {
		return this._stateQueue.getStateAt(this._now());
	}

	_onMessage({type, data, t}) {
		if (type != "fyi") { this._log(0, "received message %s", type); }

		switch (type) {
			case "fyi":
				this._stateQueue.add(t, data);
			break;

			case "wut":
				let now = Date.now();
				let latency = now - this._pingTime;

				this._serverTimeOffset = (t - now) + latency/2;
				this._log(2, "latency %s ms round-trip", latency);
				this._log(2, "server time offset %s", this._serverTimeOffset);
			break;
		}
	}

	_now() {
		return Date.now() + this._serverTimeOffset - this._options.delay;
	}

	_send(message) {
		this._socket.send(message);
	}

	_onOpen() {
		this._pingTime = Date.now();
		this._send({type:"lol"});
	}
}
