import { messages } from "./common";

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        console.log("Main thread listening")
        const callback = (event: MessageEvent) => {
            listener(event.data);
        }
        worker.addEventListener("message", callback);
        return () => worker.removeEventListener("message", callback);
    },
    send: (data) => {
        console.log("Main thread sending")
        console.log(data)
        worker.postMessage(data);
    },
    namespace: "worker",
});

const divideBtn = document.getElementById("divide");
const addBtn = document.getElementById("add");
const helloBtn = document.getElementById("hello");
if (!divideBtn || !addBtn || !helloBtn) throw new Error("Something went wrong");

divideBtn.addEventListener("click", async () => {
    const result = await sendMessage("divide", 10 , 2);
    console.log("10 divided by 2 makes " + result);
});

addBtn.addEventListener("click", async () => {
    const result = await sendMessage("add", 10 , 2);
    console.log("10 added with 2 makes " + result);
});

helloBtn.addEventListener("click", async () => {
    const result = await sendMessage("greet", "Arthur Dent");
    console.log(result);
});
