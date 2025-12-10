import { makeWorkerMessages } from "better-messages";

export const { main: mainMessages, worker: workerMessages } = makeWorkerMessages<{
    greet: (name: string) => string;
    add: (x: number, y: number) => number;
    divide: (x: number, y: number) => number;
    ping: (msg: string) => string;
}>();
