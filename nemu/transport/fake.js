import Transport from "./transport.js";

class Proxy extends Transport {
	send(message) {
		if (this._latency) {
			setTimeout(() => {
				this._other.onMessage(message);
			}, this._latency);
		} else {
			this._other.onMessage(message);
		}
		return this;
	}

	close() {
		if (this._latency) {
			setTimeout(() => {
				this._other.onClose();
			}, this._latency);
		} else {
			this._other.onClose();
		}
		return this;
	}
}

class FakeServer extends Proxy {
	constructor(clientTransport) {
		super();
		this._other = clientTransport;
	}
}

export default class FakeClient extends Proxy {
	constructor(server) {
		super();
		this._latency = 0;
		this._other = new FakeServer(this);

		setTimeout(() => {
			server.addClient(this._other);
			this.onOpen();
		}, 0);
	}

	setLatency(latency) {
		this._latency = latency;
		this._other._latency = latency;
		return this;
	}
}
