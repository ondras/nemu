import Renderer from "renderer.js";
import Server from "server.js";
import Client from "client.js";
import {ProxyTransport} from "transport.js";

let model = {
    "a": {angle:0, color:"red", velocity:.02},
    "b": {angle:Math.PI, color:"blue", velocity:-.02}
};

let server = new Server(model);
server.start();

let r1 = new Renderer(server);
document.body.appendChild(r1.getNode());

function createClient() {
    let serverTransport = new ProxyTransport();
    server.addClient(serverTransport);

    let clientTransport = new ProxyTransport();
    let client = new Client(clientTransport);

    serverTransport.setOther(clientTransport);
    clientTransport.setOther(serverTransport);

    let r = new Renderer(client);
    document.body.appendChild(r.getNode());

}

createClient();
