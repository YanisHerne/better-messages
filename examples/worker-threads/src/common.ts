import { makeCustom } from "better-messages";

export const messages = makeCustom<{
    fibonacci: (n: number) => number
    status: (message: string) => void
    exit: () => void
}>();
