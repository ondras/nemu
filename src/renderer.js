const ARENA_RADIUS = 0.4;
const PLAYER_RADIUS = 0.09;
const PI2 = Math.PI * 2;

export default class Renderer {
	constructor(component) {
		this._component = component;
		this._node = document.createElement("canvas");
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
		let SIZE = this._node.clientWidth;
		this._node.width = this._node.height = SIZE;

		let model = this._component.getState();
		if (!model) { return; }

		let ctx = this._node.getContext("2d");
		let C = SIZE/2;

		/* arena */
		ctx.beginPath();
		ctx.arc(C, C, SIZE * ARENA_RADIUS, 0, PI2, true);
		ctx.stroke();

		ctx.lineWidth = 3;

		for (let id in model) {
			let entity = model[id];
			let x = Math.cos(entity.angle) * ARENA_RADIUS * SIZE;
			let y = Math.sin(entity.angle) * ARENA_RADIUS * SIZE;
			ctx.beginPath();
			ctx.arc(C + x, C + y, SIZE * PLAYER_RADIUS, 0, PI2, true);
			ctx.strokeStyle = entity.color;
			ctx.stroke();
		};
	}
}
