import { makeMessages, makeCustom } from "better-messages";

export const { onMessage, sendMessage } = makeMessages<{
    inject: () => void;
    hello: (x: string) => string;
    divide: (x: number, y: number) => number;
    add: (x: number, y: number) => number;
    concat: (x: string, y: string) => string;
    length: (x: string) => number;
}>();

//export const { onMessage: onMessageCustom, sendMessage: sendMessageCustom } = makeCustom<{
//    greet: (name: string) => string
//}>({
//    listen: (listener) => {
//        chrome.runtime.onMessage.addListener(listener);
//    },
//    unlisten: (listener) => {
//        chrome.runtime.onMessage.removeListener(listener);
//    },
//    send: (data: any) => {
//        chrome.runtime.sendMessage(data);
//    },
//    namespace: "custom"
//});

export const customMessages = makeCustom<{
    greet: (name: string) => string;
}>();

export const { sendMessage: sendInjected, onMessage: listenInjected } = makeCustom<{
    greet: (name: string) => string;
}>({
    listen: (listener) => {
        const callback = (event: CustomEvent<{ detail: any }>) => {
            listener(event.detail);
        };
        document.body.addEventListener(
            "better-messages-injected",
            callback as (event: Event) => void,
        );
        return () =>
            document.body.removeEventListener(
                "better-messages-injected",
                callback as (event: Event) => void,
            );
    },
    send: (data: any) => {
        document.body.dispatchEvent(
            new CustomEvent<{ detail: any }>("better-messages-injected", { detail: data }),
        );
    },
    namespace: "injected",
});
