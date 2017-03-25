import { lerp as slerp } from "./scalar.js";

export function lerp(arr1, arr2, frac) {
	return arr1.map((val, index) => slerp(val, arr2[index]), frac);
}
