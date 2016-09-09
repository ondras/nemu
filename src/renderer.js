const SIZE = 100;

export default class Renderer {
	constructor(model) {
		this._model = model;
		this._running = false;
		this._node = document.createElement("canvas");
		this._node.width = this._node.height = SIZE;
	}

	getNode() {
		return this._node;
	}

	start() {
		if (this._running) { return; }
		this._running = true;
		requestAnimationFrame(() => this._tick());
	}

	stop() {
		this._running = false;
	}

	_tick() {
		if (!this._running) { return; }
		this._render();
		requestAnimationFrame(() => this._tick());
	}

	_render() {
		let ctx = this._node.getContext("2d");
		ctx.clearRect(0, 0, this._node.width, this._node.height);

		this._model.forEach(entity => {
			let x = Math.cos(entity.angle) * SIZE / 3;
			let y = Math.sin(entity.angle) * SIZE / 3;
			ctx.beginPath();
			ctx.arc(SIZE/2 + x, SIZE/2 + y, 10, 0, 2*Math.PI, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
		});
	}
}
