(function () {
'use strict';

const SIZE$1 = 100;

class Renderer {
	constructor(model) {
		this._model = model;
		this._running = false;
		this._node = document.createElement("canvas");
		this._node.width = this._node.height = SIZE$1;
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
			let x = Math.cos(entity.angle) * SIZE$1 / 3;
			let y = Math.sin(entity.angle) * SIZE$1 / 3;
			ctx.beginPath();
			ctx.arc(SIZE$1/2 + x, SIZE$1/2 + y, 10, 0, 2*Math.PI, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
		});
	}
}

let model = [
    {angle:0, color:"red", velocity:.02},
    {angle:Math.PI, color:"blue", velocity:-.02},
]

let r = new Renderer(model);
document.body.appendChild(r.getNode());
r.start();

setInterval(() => {
    model.forEach(entity => {
        entity.angle += .02;
    })
}, 1000/60);

}());