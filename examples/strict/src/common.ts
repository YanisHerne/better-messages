import { makeChromeMessages, makeCustom } from "better-messages";

export const { onMessage, createMessage, sendMessage } = makeChromeMessages<{
    background: {
        inject: () => void;
        divide: (x: number, y: number) => number;
        add: (x: number, y: number) => number;
    };
    content: {
        hello: (x: string) => string;
        concat: (x: string, y: string) => string;
        length: (x: string) => number;
    };
}>();

export const { onMessage: onMessageCustom, sendMessage: sendMessageCustom } = makeCustom<{
    background: {
        greet: (name: string) => string;
    };
    popup: {
        respond: (query: string) => string;
    };
}>({
    listen: (listener) => {
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    },
    send: (data) => {
        void chrome.runtime.sendMessage(data);
    },
});
