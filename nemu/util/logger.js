export default class Logger {
	constructor(prefix, options) {
		this._prefix = prefix;
		this._options = options;
	}

	log(level, msg, ...args) {
		if (level < this._options.level) { return; }
		msg = `[${this._prefix}] ${msg}`;
		args.unshift(msg);
		this._options.facility(...args);
	}
}
