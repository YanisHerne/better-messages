import { workerMessages } from "./common";

const { onMessage, sendMessage } = workerMessages;

let count = 0;
setInterval(() => {
    void (async () => {
        count++;
        const response = await sendMessage("ping", `Pinging from web worker for ${count} times`);
        console.log(response);
    })();
}, 1000);

onMessage({
    greet: (name) => `Hello, ${name}!`,
    add: (x, y) => x + y,
    divide: (x, y) => x / y,
});
