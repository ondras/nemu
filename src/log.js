export default function log(...args) {
    return console.log.apply(console, args);
}
