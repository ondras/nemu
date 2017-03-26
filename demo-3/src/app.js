import { lerp } from "nemu/interpolator/scalar.js";

const app = {
	state: {
		initial: () => 0,
		interpolate: lerp,
		advance: (oldState, dt) => oldState + dt
	}
}

export default app;
