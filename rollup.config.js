import includePaths from "rollup-plugin-includepaths";

export default {
    entry: "src/app.js",
    format: "iife",
    dest: "app.js",
    plugins: [ includePaths() ]
};
