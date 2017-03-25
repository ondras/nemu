export default class StateQueue {
	/**
	 * @param {number} backlog Maximum age (in ms)
	 */
	constructor(app, backlog = 1000) {
		this._app = app;
		this._data = [];
		this.setBacklog(backlog);
	}

	getSize() { return this._data.length; }

	setBacklog(backlog) {
		this._backlog = backlog;
		return this;
	}

	add(time, state) {
		let data = this._data;
		let maxAge = time-this._backlog;

		/* front of the queue: discard events that are *newer* than this one */
		while (data.length && data[data.length-1].time >= time) { data.pop(); }

		/* push to the front */
		data.push({time, state});

		/* back of the queue: discard old records */
		while (data.length > 2 && data[0].time < maxAge) { data.shift(); }
	}

	getNewestState() {
		let len = this._data.length;
		if (len == 0) { return null; }

		return this._data[len-1].state;
	}

	getNewestTime() {
		let len = this._data.length;
		if (len == 0) { return null; }

		return this._data[len-1].time;
	}

	getStateAt(time) {
		let data = this._data;
		let len = data.length;
		if (len == 0) { return null; }

		let indexBefore = -1, indexAfter = -1;
		for (let i=0; i<data.length; i++) {
			let item = data[i];
			if (item.time == time) { return item.state; }
			if (item.time < time) { indexBefore = i; }
			if (item.time > time) {
				indexAfter = i;
				break;
			}
		}

		if (indexBefore == -1) { // older than available
//            console.log("<")
			return data[0].state;
		} else if (indexAfter == -1) { // newer than available
//           console.log(">")
			return data[len-1].state;
		} else {
//            console.log("=")
			let item1 = data[indexBefore];
			let item2 = data[indexAfter];
			let frac = (time - item1.time) / (item2.time - item1.time);

			return this._app.state.interpolate(item1.state, item2.state, frac);
		}
	}
}
