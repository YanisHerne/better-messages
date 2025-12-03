import { onMessage, sendMessage, customMessages } from "./common";

onMessage({
    inject: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tab!.id;
        if (!tabId) return;
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["./content.js"],
        });
        await sendMessage(tabId, "hello", "Hello from background to content");

        let count = 0;
        setInterval(async () => {
            count++;
            if (!tabId) return;
            try {
                await sendMessage(
                    tabId,
                    "hello",
                    `Hello for ${count} times from background to content`,
                );
            } catch {}
        }, 1000);
    },

    // x and y inputs are automatically typed as numbers
    divide: (x, y) => x / y,

    add: (x, y) => x + y,

    // error: Object literal may only specify known properties, and 'subtract'
    // does not exist in type ...
    // subtract: (x, y) => x - y,

    // error:  Type 'string' is not assignable to type 'number | Promise<number>'.
    // add: (x, y) => "This is a string",
});

const { onMessage: onMessageCustom } = customMessages({
    listen: (listener) => {
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    },
    send: (data: any) => {
        chrome.runtime.sendMessage(data);
    },
    namespace: "custom",
});

onMessageCustom("greet", (name) => {
    console.log("Hello with custom messages");
    return `Hello, ${name}!`;
});
