import {
    expect,
    test,
    expectTypeOf
} from 'vitest';
import {
    makeCustom,
    type CustomConfig,
    type CustomMessages,
    type CustomStrictMessages,
} from "../src/index";
import { EventEmitter } from "node:events";

test("Custom - Flat Contract - Immediate Config ", async () => {
    expectTypeOf(makeCustom).parameter(0).toExtend<never>();

    type MyContract = {
        greet: (name: string) => string;
    }
    const events = new EventEmitter();
    const { onMessage, sendMessage }= makeCustom<MyContract>({
        listen: (listener) => {
            events.on("message", listener);
            return () => events.off("message", listener);
        },
        send: (data) => {
            events.emit("message", data);
        },
        namespace: "default",
    });
    expectTypeOf({ onMessage, sendMessage }).toExtend<CustomMessages<MyContract>>();

    onMessage("greet", (name) => `Hello, ${name}!`);
    const greeting = await sendMessage("greet", "Ford Prefect");
    expect(greeting).toBe("Hello, Ford Prefect!");
});

test("Custom - Strict Contract - Immediate Config", async () => {
    const events = new EventEmitter();
    expectTypeOf(makeCustom).parameter(0).toExtend<never>();

    type MyContract = {
        foo: {
            greet: (name: string) => string;
        }
        bar: {
            add: (x: number, y: number) => number;
        }
    }
    const { onMessage, sendMessage, createMessage }= makeCustom<MyContract>({
        listen: (listener) => {
            events.on("message", listener);
            return () => events.off("message", listener);
        },
        send: (data) => {
            events.emit("message", data);
        },
        namespace: "default",
    });
    expectTypeOf({ onMessage, sendMessage, createMessage }).toExtend<CustomStrictMessages<MyContract>>();

    onMessage<"foo">({
        greet: (name) => `Hello, ${name}!`
    });
    onMessage<"bar">({
        add: (x, y) => x + y,
    });
    const greeting = await sendMessage("greet", "Ford Prefect");
    expect(greeting).toBe("Hello, Ford Prefect!");
    const sum = await sendMessage("add", 10, 2);
    expect(sum).toBe(12);
});

test("Custom - Flat Contract - Deferred Config ", async () => {
    type MyContract = {
        greet: (name: string) => string;
    }
    const messages = makeCustom<MyContract>();
    expectTypeOf(messages).toBeFunction();
    expectTypeOf(messages).parameter(0).toExtend<CustomConfig>();

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
    expectTypeOf({ onMessage, sendMessage }).toExtend<CustomMessages<MyContract>>();

    onMessage("greet", (name) => `Hello, ${name}!`);
    const greeting = await sendMessage("greet", "Ford Prefect");
    expect(greeting).toBe("Hello, Ford Prefect!");
});

test("Custom - Strict Contract - Deferred Config", async () => {
    type MyContract = {
        foo: {
            greet: (name: string) => string;
        }
        bar: {
            add: (x: number, y: number) => number;
        }
    }
    const messages = makeCustom<MyContract>();

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
    expectTypeOf({ onMessage, sendMessage, createMessage }).toExtend<CustomStrictMessages<MyContract>>();

    onMessage<"foo">({
        greet: (name) => `Hello, ${name}!`
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

test("Custom - Strict Contract - Invalid Contract", async () => {
    const events = new EventEmitter();
    type MyContract = {
        foo: {
            greet: (name: string) => string;
        }
        bar: {
            greet: (name: string) => string;
        }
    }
    // @ts-expect-error
    const messages = makeCustom<MyContract>({
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
