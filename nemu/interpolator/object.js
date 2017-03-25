import { lerp as slerp } from "./scalar.js";
import { lerp as alerp } from "./array.js";

export function lerp(obj1, obj2, frac) {
	return Object.keys(obj1).reduce((acc, key) => {
		let val = obj1[key];
		switch (true) {
			case typeof(val) == "number": acc[key] = slerp(val, obj2[key], frac); break;
			case val instanceof Array: acc[key] = alerp(val, obj2[key], frac); break;
			default: acc[key] = val;
		}
		return acc;
	}, {});
}
