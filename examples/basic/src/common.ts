import { makeChromeMessages, makeCustom } from "better-messages";

export const { onMessage, sendMessage } = makeChromeMessages<{
    inject: () => void;
    hello: (x: string) => string;
    divide: (x: number, y: number) => number;
    add: (x: number, y: number) => number;
    concat: (x: string, y: string) => string;
    length: (x: string) => number;
}>();

export const { onMessage: onMessageCustom, sendMessage: sendMessageCustom } = makeCustom<{
    greet: (name: string) => string;
}>({
    listen: (listener) => {
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    },
    send: (data) => {
        void chrome.runtime.sendMessage(data);
    },
    namespace: "custom",
});

export const customMessages = makeCustom<{
    greet: (name: string) => string;
}>();

export const { sendMessage: sendInjected, onMessage: listenInjected } = makeCustom<{
    greet: (name: string) => string;
}>({
    listen: (listener) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    send: (data) => {
        document.body.dispatchEvent(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
            new CustomEvent<{ detail: any }>("better-messages-injected", { detail: data }),
        );
    },
});
