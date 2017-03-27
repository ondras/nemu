import Component from "./component.js";

import { app as appDefaults, server as serverDefaults } from "./util/defaults.js";
import merge from "./util/merge.js";

export default class Server extends Component {
	constructor(app = {}, options = {}) {
		merge(options, serverDefaults);
		merge(app, appDefaults);
		super("server", app, options);

		this._startTime = 0;
		this._clients = [];
	}

	addClient(transport) {
		this._log(2, "new client");
		transport.onMessage = (message) => this._onMessage(transport, message);
		this._clients.push(transport);
	}

	getState() {
		return this._stateQueue.getNewestState();
	}

	start() {
		this._startTime = Date.now();
		this._stateQueue.add(this._now(), this._app.state.initial());

		setInterval(() => this._tick(), 1000/this._options.fps.sim);
		setInterval(() => this._notify(), 1000/this._options.fps.notify);

		return this;
	}

	_onMessage(clientTransport, {type, data, t}) {
		this._log(0, "received message %s", type);
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
		let oldState = this._stateQueue.getNewestState();
		let oldTime = this._stateQueue.getNewestTime();
		let newTime = this._now();
		let dt = (newTime-oldTime)/1000;

		let newState = this._app.state.advance(oldState, dt);
		this._stateQueue.add(newTime, newState);
	}

	_send(clientTransport, message) {
		if (!message.t) { message.t = this._now(); }
		clientTransport.send(message);
	}

	_now() {
		return Date.now() - this._startTime;
	}

	_notify() {
		let state = this._stateQueue.getNewestState();
		let time = this._stateQueue.getNewestTime();

		let message = {
			type: "fyi",
			data: state,
			t: time
		}
		this._clients.forEach(t => this._send(t, message));
	}
}
