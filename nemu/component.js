import log from "./log.js";
import StateQueue from "./statequeue.js";

export default class Component {
	constructor(name) {
		this._name = name;
		this._states = new StateQueue();

		setInterval(() => this._dumpStats(), 2000);
	}

	_dumpStats() {
		this._log("stats: queue size: %s", this._states.getSize());
	}

	_log(msg, ...args) {
		return log(`[${this._name}] ${msg}`, ...args);
	}
}
