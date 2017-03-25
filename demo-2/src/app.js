import Renderer from "./renderer.js";
import Server from "nemu/server.js";
import DemoClient from "./democlient.js";

import { lerp } from "nemu/interpolator/object.js";

/* velocity in rads/s */
let model = {
    "a": {angle:0, color:"red", velocity:1},
    "b": {angle:Math.PI, color:"blue", velocity:-1}
};

const app = {
	state: {
		initial: () => model,
		interpolate: (state1, state2, frac) => {
			let newState = {};
			let oldState = (frac < 0.5 ? state1 : state2);
			for (let id in oldState) {
				let e1 = state1[id];
				let e2 = state2[id];
				if (!e1 || !e2) { continue; }
				newState[id] = lerp(e1, e2, frac);
			}
			return newState;
		},
		advance: (oldState, dt) => Object.keys(oldState).reduce((acc, key) => {
			let entity = Object.assign({}, oldState[key]);
			entity.angle += dt * entity.velocity;
			acc[key] = entity;
			return acc;
		}, {})
	}
}

let server = new Server(app).start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

let c1 = new DemoClient(server, app);
document.body.appendChild(c1.getNode());
