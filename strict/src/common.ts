import { makeStrictMessages } from "better-messages";

export const { onMessage, createMessage, sendMessage } = makeStrictMessages<{
    background: {
        inject: () => void
        divide: (x: number, y: number) => number
        add: (x: number, y: number) => number
    }
    content: {
        hello: (x: string) => string
        concat: (x: string, y: string) => string
        length: (x: string) => number
    }
}>();
