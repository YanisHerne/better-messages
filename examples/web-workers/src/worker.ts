import { messages } from "./common";

const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        console.log("worker listening")
        self.addEventListener("message", (event) => {
            console.log("worker got:")
            console.log(event.data);
            listener(event.data)
        });
    },
    unlisten: (listener) => {
        self.removeEventListener("message", listener);
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
