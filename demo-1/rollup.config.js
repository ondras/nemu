import includePaths from "rollup-plugin-includepaths";

let opts = {
	paths: [".."]
}

export default {
    entry: "src/app.js",
    format: "iife",
    dest: "app.js",
    plugins: [ includePaths(opts) ]
};
