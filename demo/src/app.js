import Renderer from "./renderer.js";
import Server from "nemu/server.js";
import DemoClient from "./democlient.js";

/* velocity in rads/s */
let model = {
    "a": {angle:0, color:"red", velocity:1},
    "b": {angle:Math.PI, color:"blue", velocity:-1}
};

let server = new Server(model);
server.start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

let c1 = new DemoClient(server);
document.body.appendChild(c1.getNode());
/*
let c2 = new DemoClient(server);
document.body.appendChild(c2.getNode());
*/