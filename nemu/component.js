import Logger from "./util/logger.js";
import StateQueue from "./util/statequeue.js";
import merge from "./util/merge.js";

export default class Component {
	constructor(loggerPrefix, app, options) {
		this._app = app;
		this._options = {};
		this._stateQueue = new StateQueue(app);

		this.setOptions(options);
		this._logger = new Logger(loggerPrefix, options.log);

		setInterval(() => this._dumpStats(), 2000);
	}

	setOptions(options) {
		this._options = merge(this._options, options);
		return this;
	}

	_dumpStats() {
		this._log(1, "stats: queue size: %s", this._stateQueue.getSize());
	}

	_log(level, ...data) {
		return this._logger.log(level, ...data);
	}
}
