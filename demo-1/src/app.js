import { lerp } from "nemu/interpolator/scalar.js";
import Client from "nemu/client.js";
import Server from "nemu/server.js";
import FakeSocket from "nemu/socket/fake.js";

const app = {
	state: {
		initial: () => 0,
		interpolate: lerp,
		advance: (oldState, dt) => oldState + dt
	}
}

const serverOptions = {
	log: {
		level: 0, // all
		facility: console.log
	}
}

const clientOptions = {
	log: {
		level: 0, // all
		facility: console.log
	}
}

let server = new Server(app, serverOptions).start();
let socket = new FakeSocket(server);
let client = new Client(socket, app, clientOptions);

setInterval(() => document.body.innerHTML = client.getState(), 50);
