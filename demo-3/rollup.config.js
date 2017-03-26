import includePaths from "rollup-plugin-includepaths";

let opts = {
	paths: [".."]
}

export default {
    format: "iife",
    plugins: [ includePaths(opts) ]
};
