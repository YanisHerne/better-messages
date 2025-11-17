import { makeMessages, makeCustom } from "better-messages";

export const { onMessage, sendMessage } = makeMessages<{
    inject: () => void
    hello: (x: string) => string
    divide: (x: number, y: number) => number
    add: (x: number, y: number) => number
    concat: (x: string, y: string) => string
    length: (x: string) => number
}>();

export const { onMessage: onMessageCustom, sendMessage: sendMessageCustom } = makeCustom<{
    greet: (name: string) => string
}>(
    (listener) => {
        chrome.runtime.onMessage.addListener(listener);
        //window.addEventListener("message", listener);
    },
    (listener) => {
        chrome.runtime.onMessage.removeListener(listener);
        //window.removeEventListener("message", listener);
    },
    (data: any) => {
        chrome.runtime.sendMessage(data);
        //window.postMessage(data);
    },
    "custom"
);
