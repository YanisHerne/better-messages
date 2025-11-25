import { onMessage, sendInjected, listenInjected } from "./common";

let count = 0;
onMessage({
    hello: async (x) => {
        console.log(x)
        count++;
        const result = await sendInjected("greet", "Content Script");
        console.log(result);
        return x + ", count is " + count;
    }
});

console.log("Hello from content script");
const s = document.createElement('script');
s.src = chrome.runtime.getURL("inject.js");
document.head.appendChild(s);

listenInjected({
    greet: (name: string) => `Hello, ${name}!`,
});
