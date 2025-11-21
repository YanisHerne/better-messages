import { makeMessages, makeCustom} from "better-messages";

export const { onMessage, sendMessage } = makeMessages<{
    inject: () => void
    hello: (x: string) => string
    divide: (x: number, y: number) => number
    add: (x: number, y: number) => number
    concat: (x: string, y: string) => string
    length: (x: string) => number
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
    greet: (name: string) => string
}>();
