import Renderer from "./renderer.js";

const SIZE = 10;

let model = [
    {angle:0, color:"red", velocity:.02},
    {angle:Math.PI, color:"blue", velocity:-.02},
]

let r = new Renderer(model);
document.body.appendChild(r.getNode());
r.start();

setInterval(() => {
    model.forEach(entity => {
        entity.angle += .02;
    })
}, 1000/60);
