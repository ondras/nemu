function lerp(value1, value2, frac) {
    return value1 + frac * (value2 - value1);
}

function lerpEntity(id, state1, state2, frac) {
    let entity1 = state1[id];
    let entity2 = state2[id];

    if (!entity1) { return entity2; } // new entity arrived to state2
    if (!entity2) { return entity1; } // old entity removed from state1

    let entity = {};

    for (let key in entity1) {
        let value1 = entity1[key];
        let value2 = entity2[key];
        if (typeof(value1) == "number") { /* scalar interpolation */
            entity[key] = lerp(value1, value2, frac);
        } else if (value1 instanceof Array) { /* vector interpolation */
            entity[key] = value1.map((v1, index) => lerp(v1, value2[index], frac));
        } else { /* other values are copied */
            entity[key] = value1;
        }
    }

    return entity;
}

/**
 * @param {object} state1
 * @param {object} state2
 * @param {number} frac 0..1
 */
function lerpState(state1, state2, frac) {
    let newState = {};
    let oldState = (frac < 0.5 ? state1 : state2);
    for (let id in oldState) {
        newState[id] = lerpEntity(id, state1, state2, frac);
    }
    return newState;
}

export default class StateQueue {
    /**
     * @param {number} backlog Maximum age (in ms)
     */
    constructor(backlog = 1000) {
        this._data = [];
        this.setBacklog(backlog);
    }

    getSize() { return this._data.length; }

    setBacklog(backlog) {
        this._backlog = backlog;
        return this;
    }

    add(time, state) {
        let data = this._data;
        let maxAge = time-this._backlog;

        /* front of the queue: discard events that are *newer* than this one */
        while (data.length && data[data.length-1].time >= time) { data.pop(); }

        /* push to the front */
        data.push({time, state});

        /* back of the queue: discard old records */
        while (data.length > 2 && data[0].time < maxAge) { data.shift(); }
    }

    getNewestState() {
        let len = this._data.length;
        if (len == 0) { return null; }

        return this._data[len-1].state;
    }

    getNewestTime() {
        let len = this._data.length;
        if (len == 0) { return null; }

        return this._data[len-1].time;
    }

    getStateAt(time) {
        let data = this._data;
        let len = data.length;
        if (len == 0) { return null; }

        let indexBefore = -1, indexAfter = -1;
        for (let i=0; i<data.length; i++) {
            let item = data[i];
            if (item.time <= time) { indexBefore = i; }
            if (item.time >= time) {
                indexAfter = i;
                break;
            }
        }

        if (indexBefore == -1) { // older than available
//            console.log("<")
            return data[0].state;
        } else if (indexAfter == -1) { // newer than available
//            console.log(">")
            return data[len-1].state;
        } else {
//            console.log("=")
            let item1 = data[indexBefore];
            let item2 = data[indexAfter];
            let frac = (time - item1.time) / (item2.time - item1.time);

            return lerpState(item1.state, item2.state, frac);
        }
    }
}
