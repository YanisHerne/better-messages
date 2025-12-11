import { expect, test, expectTypeOf } from "vitest";
import { makeMessages, type Adapter, type Messages, type StrictMessages } from "../src/index";
import { EventEmitter } from "node:events";

test("Custom - Flat Contract - Immediate Adapter ", async () => {
    expectTypeOf(makeMessages).parameter(0).toExtend<never>();

    type MyContract = {
        greet: (name: string) => string;
    };
    const events = new EventEmitter();
    const { onMessage, sendMessage } = makeMessages<MyContract>({
        listen: (listener) => {
            events.on("message", listener);
            return () => events.off("message", listener);
        },
        send: (data) => {
            events.emit("message", data);
        },
        namespace: "default",
    });
    expectTypeOf({ onMessage, sendMessage }).toExtend<Messages<MyContract>>();

    onMessage("greet", (name) => `Hello, ${name}!`);
    const greeting = await sendMessage("greet", "Ford Prefect");
    expect(greeting).toBe("Hello, Ford Prefect!");
});

test("Custom - Strict Contract - Immediate Adapter", async () => {
    const events = new EventEmitter();
    expectTypeOf(makeMessages).parameter(0).toExtend<never>();

    type MyContract = {
        foo: {
            greet: (name: string) => string;
        };
        bar: {
            add: (x: number, y: number) => number;
        };
    };
    const { onMessage, sendMessage, createMessage } = makeMessages<MyContract>({
        listen: (listener) => {
            events.on("message", listener);
            return () => events.off("message", listener);
        },
        send: (data) => {
            events.emit("message", data);
        },
        namespace: "default",
    });
    expectTypeOf({ onMessage, sendMessage, createMessage }).toExtend<StrictMessages<MyContract>>();

    onMessage<"foo">({
        greet: (name) => `Hello, ${name}!`,
    });
    onMessage<"bar">({
        add: (x, y) => x + y,
    });
    const greeting = await sendMessage("greet", "Ford Prefect");
    expect(greeting).toBe("Hello, Ford Prefect!");
    const sum = await sendMessage("add", 10, 2);
    expect(sum).toBe(12);
});

test("Custom - Flat Contract - Deferred Adapter ", async () => {
    type MyContract = {
        greet: (name: string) => string;
    };
    const messages = makeMessages<MyContract>();
    expectTypeOf(messages).toBeFunction();
    expectTypeOf(messages).parameter(0).toExtend<Adapter>();

    const events = new EventEmitter();
    const { onMessage, sendMessage } = messages({
        listen: (listener) => {
            events.on("message", listener);
            return () => events.off("message", listener);
        },
        send: (data) => {
            events.emit("message", data);
        },
        namespace: "default",
    });
    expectTypeOf({ onMessage, sendMessage }).toExtend<Messages<MyContract>>();

    onMessage("greet", (name) => `Hello, ${name}!`);
    const greeting = await sendMessage("greet", "Ford Prefect");
    expect(greeting).toBe("Hello, Ford Prefect!");
});

test("Custom - Strict Contract - Deferred Adapter", async () => {
    type MyContract = {
        foo: {
            greet: (name: string) => string;
        };
        bar: {
            add: (x: number, y: number) => number;
        };
    };
    const messages = makeMessages<MyContract>();

    const events = new EventEmitter();
    const { onMessage, sendMessage, createMessage } = messages({
        listen: (listener) => {
            events.on("message", listener);
            return () => events.off("message", listener);
        },
        send: (data) => {
            events.emit("message", data);
        },
        namespace: "default",
    });
    expectTypeOf({ onMessage, sendMessage, createMessage }).toExtend<StrictMessages<MyContract>>();

    onMessage<"foo">({
        greet: (name) => `Hello, ${name}!`,
    });
    onMessage<"bar">({
        add: (x, y) => x + y,
    });

    const greeting = await sendMessage("greet", "Ford Prefect");
    expect(greeting).toBe("Hello, Ford Prefect!");

    const bar = createMessage<"bar">();
    expectTypeOf(bar.add).toBeFunction();
    expectTypeOf(bar.add).parameters.toExtend<[x: number, y: number]>();
    expectTypeOf(bar.add).returns.toExtend<Promise<number>>();
    const sum = await bar.add(10, 2);
    expect(sum).toBe(12);
});

test("Custom - Strict Contract - Invalid Contract", () => {
    const events = new EventEmitter();
    type MyContract = {
        foo: {
            greet: (name: string) => string;
        };
        bar: {
            greet: (name: string) => string;
        };
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const messages = makeMessages<MyContract>({
        listen: (listener) => {
            events.on("message", listener);
            return () => events.off("message", listener);
        },
        send: (data) => {
            events.emit("message", data);
        },
        namespace: "default",
    });
});
