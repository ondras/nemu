import Renderer from "renderer.js";
import Server from "server.js";
import Client from "client.js";

let clients = {};
let model = [
    {angle:0, color:"red", velocity:.02},
    {angle:Math.PI, color:"blue", velocity:-.02},
];

const serverOptions = {
    send(id, message) {
        clients[id].onMessage(message);
    }
}

let server = new Server(model, serverOptions);
server.start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

let ID = "1";
let DELAY = 100;
let clientOptions = {
    connect() {
        server.onConnect(ID)
        return Promise.resolve();
    },

    send(message) {
        setTimeout(() => {
            server.onMessage(ID, message);
        }, DELAY);
    }
}

let c1 = new Client(clientOptions);
clients[ID] = c1;

//let r2 = new Renderer(c1);
//document.body.appendChild(r2.getNode());
