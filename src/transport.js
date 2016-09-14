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
    }

    setOther(other) {
        this._other = other;
        this.onOpen();
    }

    send(message) {
//        setTimeout(() => {
            this._other.onMessage(message);
//        }, 100);
    }

    close() { this._other.onClose(); }
}
