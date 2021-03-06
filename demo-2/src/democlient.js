import Client from "nemu/client.js";
import FakeTransport from "nemu/transport/fake.js";
import Renderer from "./renderer.js";

export default class DemoClient {
    constructor(server, app) {
        this._transport = new FakeTransport(server);
        this._client = new Client(this._transport, app);

        this._node = this._build();

        this._setLatency(0);
        this._setDelay(0);
    }

    getNode() { return this._node; }

    _build(client) {
        let node = document.createElement("div");
        node.classList.add("demo-client");

        let latency = this._buildLatency();
        node.appendChild(latency);

        let delay = this._buildDelay();
        node.appendChild(delay);

        let r = new Renderer(this._client);
        node.appendChild(r.getNode());

        return node;
    }

    _buildLatency() {
        let node = document.createElement("label");
        node.classList.add("latency");
        node.innerHTML = "Latency";

        let input = this._buildRange();
        input.oninput = e => this._setLatency(e.target.valueAsNumber);
        node.appendChild(input);

        let span = document.createElement("span");
        node.appendChild(span);

        return node;
    }

    _buildDelay() {
        let node = document.createElement("label");
        node.classList.add("delay");
        node.innerHTML = "Delay";

        let input = this._buildRange();
        input.oninput = e => this._setDelay(e.target.valueAsNumber);
        node.appendChild(input);;

        let span = document.createElement("span");
        node.appendChild(span);

        return node;
    }

    _setLatency(latency) {
       this._node.querySelector(".latency input").value = latency;
       this._node.querySelector(".latency span").innerHTML = latency;
       this._transport.setLatency(latency);
    }

    _setDelay(delay) {
       this._node.querySelector(".delay input").value = delay;
       this._node.querySelector(".delay span").innerHTML = delay;
       this._client.setOptions({delay});
    }

    _buildRange() {
        let node = document.createElement("input");
        node.type = "range";
        node.max = 1000;
        return node;
    }
}
