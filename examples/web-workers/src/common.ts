import { makeCustom } from "better-messages";

export const messages = makeCustom<{
    greet: (name: string) => string
    add: (x: number, y: number) => number
    divide: (x: number, y: number) => number
    ping: (msg: string) => string
}>();
