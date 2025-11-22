import { messages } from "./common";

const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        console.log("worker listening")
        const callback = (event: MessageEvent) => {
            console.log("worker got:")
            console.log(event.data);
            listener(event.data)
        }
        self.addEventListener("message", callback);
        return () => self.removeEventListener("message", callback);
    },
    send: (data) => {
        console.log("worker sending")
        console.log(data);
        self.postMessage(data);
    },
    namespace: "worker",
});

onMessage({
    greet: (name) => `Hello, ${name}!`,
    add: (x, y) => x + y,
    divide: (x, y) => x / y,
});
