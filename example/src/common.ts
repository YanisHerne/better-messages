import { makeMessages } from "better-messages";

export const { onMessage, sendMessage, sendMessageToTab } = makeMessages<{
    inject: () => void
    hello: (x: string) => string
    divide: (x: number, y: number) => number
    add: (x: number, y: number) => number
    concat: (x: string, y: string) => string
    length: (x: string) => number
}>();
