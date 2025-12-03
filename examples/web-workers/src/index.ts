import { messages } from "./common";

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        const callback = (event: MessageEvent) => {
            listener(event.data);
        };
        worker.addEventListener("message", callback);
        return () => worker.removeEventListener("message", callback);
    },
    send: (data) => {
        worker.postMessage(data);
    },
    namespace: "worker",
});

const divideBtn = document.getElementById("divide");
const addBtn = document.getElementById("add");
const helloBtn = document.getElementById("hello");
if (!divideBtn || !addBtn || !helloBtn) throw new Error("Something went wrong");

divideBtn.addEventListener("click", async () => {
    const result = await sendMessage("divide", 10, 2);
    console.log("10 divided by 2 makes " + result);
});

addBtn.addEventListener("click", async () => {
    const result = await sendMessage("add", 10, 2);
    console.log("10 added with 2 makes " + result);
});

helloBtn.addEventListener("click", async () => {
    const result = await sendMessage("greet", "Arthur Dent");
    console.log(result);
});

let count = 0;
onMessage("ping", (msg) => {
    count++;
    console.log(msg);
    return `Main thread received web worker ping for ${count} times`;
});
