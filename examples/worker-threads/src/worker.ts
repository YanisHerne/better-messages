import { parentPort } from "worker_threads";
import { messages } from "./common";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listeners = new Set<(...args: any) => any>();

const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        if (!parentPort) throw new Error();
        parentPort.addListener("message", listener);
        listeners.add(listener);
        return () => parentPort?.removeListener("message", listener);
    },
    send: (data) => {
        if (!parentPort) throw new Error();
        parentPort.postMessage(data);
    },
    namespace: "default",
});

void sendMessage("status", "hello");

function calculateFibonacci(n: number): number {
    if (n <= 1) {
        return n;
    }
    return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

onMessage("fibonacci", (n) => {
    const result = calculateFibonacci(n);
    return result;
});
onMessage("exit", () => {
    for (const listener of listeners) {
        parentPort?.removeListener("message", listener);
    }
    void sendMessage("status", "goodbye");
});
