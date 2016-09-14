function lerp(value1, value2, frac) {
    return value1 + frac * (value2 - value1);
}

function lerpEntity(id, state1, state2, frac) {
    let entity1 = state1[id];
    let entity2 = state2[id];
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

function lerpState(state1, state2, frac) {
    let state = {};
    for (let id in state1) {
        state[id] = lerpEntity(id, state1, state2, frac);
    }
    return state;
}

export default class StateQueue {
    constructor() {
        this._data = [];
    }

    push(time, state) {
        this._data.push({time, state});
    }

    getStateAt(time) {
        let len = this._data.length;
        if (len == 0) { return null; }

        let indexBefore = -1, indexAfter = -1;
        for (let i=0; i<this._data.length; i++) {
            let item = this._data[i];
            if (item.time <= time) { indexBefore = i; }
            if (item.time >= time) {
                indexAfter = i;
                break;
            }
        }

        if (indexBefore == -1) { // older than available
            return this._data[0].state;
        } else if (indexAfter == -1) { // newer than available
            return this._data[len-1].state;
        } else {
            let item1 = this._data[indexBefore];
            let item2 = this._data[indexAfter];
            let frac = (time - item1.time) / (item2.time - item1.time);

            return lerpState(item1.state, item2.state, frac);
        }
    }
}
