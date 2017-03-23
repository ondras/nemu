export class Transport {
    send(message) {}
    close() {}
    onMessage(message) {}
    onClose() {}
    onOpen() {}
}

export class WebSocketClient extends Transport {
    constructor(ws) {
        super();
        this._ws = ws;
        this._ws.addEventListener("message", this);
        this._ws.addEventListener("close", this);
        this._ws.addEventListener("open", this);
    }

    send(message) { this._ws.send(JSON.stringify(message)); }
    close() { this._ss.close(); }

    handleEvent(e) {
        switch (e.type) {
            case "message": this.onMessage(JSON.parse(e.data)); break;
            case "close": this.onClose(); break;
            case "open": this.onOpen(); break;
        }
    }
}

export class ProxyTransport extends Transport {
    constructor() {
        super();
        this._other = null;
        this._latency = 0;
    }

    setLatency(latency) {
        this._latency = latency;
        return this;
    }

    setOther(other) {
        this._other = other;
        this.onOpen();
        return this;
    }

    send(message) {
        if (this._latency) {
            setTimeout(() => {
                this._other.onMessage(message);
            }, this._latency);
        } else {
            this._other.onMessage(message);
        }
        return this;
    }

    close() { 
        this._other.onClose();
        return this;
    }
}
