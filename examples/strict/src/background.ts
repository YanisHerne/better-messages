import { onMessage, sendMessage, onMessageCustom, sendMessageCustom } from "./common";

onMessage<"background">({
    inject: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tab!.id;
        if (!tabId) return;
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["./content.js"],
        });
        await sendMessage(tabId, "hello", "Hello from background");

        let count = 0;
        setInterval(async () => {
            count++;
            if (!tabId) return;
            try {
                await sendMessage(tabId, "hello", `Hello for ${count} times`);
            } catch {}
        }, 1000);
    },

    // x and y inputs are automatically typed as numbers
    divide: (x, y) => x / y,

    add: (x, y) => x + y,

    // error: Object literal may only specify known properties, and 'subtract'
    // does not exist in type ...
    // subtract: (_, x, y) => x - y,

    // error:  Type 'string' is not assignable to type 'number | Promise<number>'.
    // add: (_, x, y) => "This is a string",
});

onMessageCustom<"background">({
    greet: async (name) => {
        const response = await sendMessageCustom("respond", "How is your day going?");
        console.log("Response: " + response);
        return `Hello, ${name}!`;
    },
});
