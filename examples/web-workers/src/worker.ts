import { messages } from "./common";

const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        const callback = (event: MessageEvent) => {
            listener(event.data)
        }
        self.addEventListener("message", callback);
        return () => self.removeEventListener("message", callback);
    },
    send: (data) => {
        self.postMessage(data);
    },
    namespace: "worker",
});

let count = 0;
setInterval(async () => {
    count++;
    const response = await sendMessage("ping", `Pinging from web worker for ${count} times`);
    console.log(response);
}, 1000);

onMessage({
    greet: (name) => `Hello, ${name}!`,
    add: (x, y) => x + y,
    divide: (x, y) => x / y,
});
