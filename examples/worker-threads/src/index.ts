import { Worker } from "worker_threads";
import path from "path";

import { messages } from "./common";

const workerPath = path.resolve("dist/worker.js");
const worker = new Worker(workerPath);

const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        worker.on("message", listener);
        return () => worker.off("message", listener);
    },
    send: (data) => {
        worker.postMessage(data);
    },
    namespace: "default",
});

onMessage("status", (message) => {
    console.log(`Worker says ${message} to main thread`);
});

console.log("Main thread started.");
const numberToCalculate = 10;
try {
    for (let i = 0; i < numberToCalculate; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log(`Calculating Fibonacci(${i}) in a worker thread...`);
        sendMessage("fibonacci", i).then((result) => {
            console.log(`Fibonacci(${i}) result: ${result}`);
        });
    }
} catch (error) {
    console.error("Error during worker execution:", error);
}

await sendMessage("exit");
console.log("Main thread finished.");
