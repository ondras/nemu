const SIZE = 100;

export default class Renderer {
	constructor(component) {
		this._component = component;
		this._node = document.createElement("canvas");
		this._node.width = this._node.height = SIZE;
		this._tick();
	}

	getNode() {
		return this._node;
	}

	_tick() {
		this._render();
		requestAnimationFrame(() => this._tick());
	}

	_render() {
		let model = this._component.getModel();
		let ctx = this._node.getContext("2d");
		ctx.clearRect(0, 0, this._node.width, this._node.height);

		model.forEach(entity => {
			let x = Math.cos(entity.angle) * SIZE / 3;
			let y = Math.sin(entity.angle) * SIZE / 3;
			ctx.beginPath();
			ctx.arc(SIZE/2 + x, SIZE/2 + y, 10, 0, 2*Math.PI, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
		});
	}
}
