import { makeMessages } from "better-messages";

export const messages = makeMessages<{
    fibonacci: (n: number) => number;
    status: (message: string) => void;
    exit: () => void;
}>();
