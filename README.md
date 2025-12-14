# better-messages

[![Build and Test](https://img.shields.io/github/actions/workflow/status/YanisHerne/better-messages/tests.yml?branch=main&logo=github&style=for-the-badge&label=Build%20and%20Test)](https://github.com/YanisHerne/better-messages/actions/workflows/tests.yml)
[![NPM Version](https://img.shields.io/npm/v/better-messages.svg?style=for-the-badge)](https://www.npmjs.com/package/better-messages)

`better-messages` is a small, self-contained library that provides an ergonomic, type-safe way to communicate between different local javascript contexts. Originally for browser extensions, it easily generalizes to other cross-context usecases, including Web Workers, Service Workers, Shared Workers, and more. `better-messages` includes adapters for [Browser Extensions](#browser-extensions) and for [Web Workers](#web-workers). Adapters for other usecases can be written trivially in less than a dozen lines.

Traditional cross-context messaging with raw APIs is boilerplate-heavy and prone to runtime errors. `better-messages` solves this with:
*   **Type Safety:** Define your messages upfront and let TypeScript enforce correct input and output types.
*   **Terseness:** No more manual type checking, validating, or type assertions.
*   **Ergonomics:** Benefit from excellent IDE support, including autocomplete for message names and argument suggestions.
*   **Efficiency:** A tiny bundle footprint (>1KB minified & compressed)
*   **Universal Adaptability:** A small, ~10-line adapter to work with any messaging API.

## At a Glance

```typescript
// ./common.ts
import { makeChromeMessages } from "better-messages";

export const { onMessage, sendMessage } = makeChromeMessages<{
    hello: (name: string) => string;
    add: (x: number, y: number) => number;
    getTheme: () => "auto" | "light" | "dark";
}>();
```
```typescript
// ./background.ts
import { onMessage } from "./common";

onMessage({
    hello: (name) => `Hello, ${name}!`,
    add: (x, y) => x + y,
    getTheme: async () => {
        return await someStorageApi();
    },
});
```
```typescript
// ./popup.ts
import { sendMessage } from "./common";

const greeting = await sendMessage("hello", "Arthur Dent");
console.log(greeting);

const sum = await sendMessage("add", 5, 3);
console.log(sum);

const theme = await sendMessage("getTheme");
console.log(theme);
```

## Getting Started

### Install with your favorite package manager:

```bash
npm/pnpm/yarn install better-messages
```

### Basic Contract:

Type-safety in `better-messages` is defined with the **Contract**, a typescript interface or object type passed as a type parameter to the library's entry points. In a **Contract**, the keys are the names of the messages and the values are functions that define the data to be sent (parameter types) and the data that will be in the response (return types).

Passing the **Contract** as a type parameter to an entrypoint of `better-messages` yields `onMessage` and `sendMessage`, which will be used to listen for and send messages. In the example below, we use the included browser extension adapter, `makeChromeMessages`. Be sure to do this in a shared file that may be imported by every javascript context that will need to communicate. 

```typescript
// ./common.ts
import { makeChromeMessages } from "better-messages";

export const { onMessage, sendMessage } = makeChromeMessages<{
    hello: (name: string) => string;
    add: (x: number, y: number) => number;
    getTheme: () => "auto" | "light" | "dark";
}>();
```

The contract above defines three messages: 
* "hello" takes in a "name" of type `string`, and returns a `string`.
* "add" takes in two parameters of type `number` and returns a `number`.
* "getTheme" takes no parameters and returns a union of the string literals `"auto"`, `"light"`, and `"dark"`.

### Listening for Messages:

`onMessage` can be invoked in two different ways:
* With a single parameter, an object in which the keys are names of the messages and the values are functions implementing the **Contract**'s function types. Any `Partial<Contract>` may be passed.
* With two parameters, where the first parameter is the name of the message, and the second parameter is the listener callback.

Parameters will be automatically typed correctly, and return types will be enforced to match the **Contract**.

```typescript
// ./background.ts
import { onMessage } from "./common";

onMessage({
    hello: (name) => `Hello, ${name}!`, // `name` is typed as string
    add: (x, y) => x + y, // Return type enforced as "number"
    getTheme: async () => {
        // Asynchronous handlers work out of the box
        return await someStorageApi();
    },
});

// Partial subsets of the Contract are allowed
onMessage({
    hello: (name) => `Hello, ${name}!`,
});

// This two-parameter syntax is also valid when listening to only one message
onMessage("hello", (name) => `Hello, ${name}!`);

// Type-safety in action:

onMessage({
    randomKey: () => true,
//  ^^^^^^^^^
// error: Object literal may only specify known properties, and 'randomKey' does
//        not exist in type ...
});

onMessage({
    getTheme: () => "day",
//  ^^^^^^^^
// error: Type '() => "day"' is not assignable to type '() => "auto" | light" |
//        "dark" | Promise<"auto" | "light" | "dark">'.
//        Type '"day"' is not assignable to type '"auto" | "light" | "dark" |
//        Promise<"auto" | "light" | "dark">'
});
```

### Sending Messages

Use `sendMessage` to invoke a message. You'll get autocomplete for message names and type checking for arguments. The return type is also automatically inferred.

```typescript
// ./popup.ts
import { sendMessage } from "./common";

// TypeScript ensures "hello" takes a string and returns a string
const response = await sendMessage("hello", "Arthur Dent");
console.log(response); // "Hello, Arthur Dent!"

// Example with multiple arguments
const sum = await sendMessage("add", 5, 3);
console.log(sum); // 8

// Example with no arguments
const theme = await sendMessage("getTheme");
console.log(theme); // "auto" | "light" | "dark"

// Autocomplete for available messages:
const foo = await sendMessage(█
//                            ╭────────────╮
//                            │ "hello"    │
//                            │ "add"      │
//                            │ "getTheme" │
//                            ╰────────────╯
```

### Strict Contract (Categorized Messaging)

For more complex applications, a **StrictContract** allows you to organize your messages into categories. Each top-level key is a category, and its value is its own specific **Contract**. As before, pass the **StrictContract** to an entrypoint (in this case, `makeChromeMessages`) as the first type parameter.

```typescript
// common.ts
import { makeChromeMessages } from "better-messages";

export const { onMessage, createMessage, sendMessage } = makeChromeMessages<{
    background: {
        inject: () => void;
        divide: (x: number, y: number) => number;
        add: (x: number, y: number) => number;
    };
    content: {
        hello: (name: string) => string;
        concat: (x: string, y: string) => string;
        length: (x: string) => number;
    };
}>();

```

> [!Note]
> The method names in each category must be unique across the entire **StrictContract**. Entrypoints to `better-messages` will return `never` if this restriction is violated, such as in the following example, where both the "background" and "content" categories have an "add" method.
> ```typescript
> const { onMessage, createMessage, sendMessage } = makeChromeMessages<{
>     background: {
>         add: (x: number, y: number) => number
>     }
>     content: {
>         add: (x: string, y: string) => string 
>     }
> }>();
> ```

#### Listening for Messages (Strict Contract)

As with normal **Contract**s, use `onMessage` to register handlers. However, when using Strict Messages, you must provide a type argument that is a category (top-level key) from your **StrictContract**. Adding a listener that is not specified under the chosen category, or neglecting to add a listener that *was* specified under the chosen category, will result in a typescript error. Also, the two parameter overload is unavailable. A handler will only listen for messages within its declared category, providing better separation of concerns and preventing accidental cross-category message handling.

```typescript
// background.ts
import { onMessage } from "./common";

onMessage<"background">({ // Note the type parameter
    inject: async () => {
        console.log("Injecting content script!");
        // Code for chrome.executeScript and stuff here
    },
    divide: (x, y) => x / y,
    add: (x, y) => x + y,
});
```

```typescript
// content.ts
import { onMessage } from "./common";

onMessage<"content">({
    hello: (name) => `Hello, ${name}!`,
    concat: (x, y) => x + y,
    length: (x) => x.length,
});
```

#### Sending Messages (Strict Contract)

Sending messages works the same for **StrictContract**s as for normal **Contract**s.

```typescript
// popup.ts
import { sendMessage } from "./common";

const quotient = await sendMessage("divide", 66, 3);
console.log(quotient); // 22

const sum = await sendMessage("add", 5, 3);
console.log(sum); // 8
```

For a more object-oriented feel, `createMessage` allows you to generate a callable object for a specific category by passing a category from your **StrictContract** as the type parameter.

```typescript
// popup.ts
import { createMessage } from "./common";

// Create a message object specifically for the "background" category
const background = createMessage<"background">();

const quotient = await background.divide(66, 3);
console.log(quotient); // 22

const sum = await background.add(5, 3);
console.log(sum); // 8
```

## Included Adapters

These are the included adapters for the most common usecases. When they are not used, downstream bundlers can trivially identify them as unused code and tree-shake them out.

### Browser Extensions

The included adapter for [Browser Extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) is called `makeChromeMessages`, and it uses the `chrome.runtime` and `chrome.tabs` APIs to send and receive messages from different javascript contexts. The `chrome` object rather than the `browser` object is used because although both objects are exposed in Safari and Firefox, Chrome only exposes the `chrome` object.
Sending messages to specific tabs can be done by placing an additional parameter before the message name in `sendMessage` or providing a single parameter to `createMessage` when using **StrictContracts**. This parameter is of type `ChromeOptions`, and includes keys for "tabId" and optionally "frameId".

```typescript
type ChromeOptions = {
    tabId: number;
    frameId?: number;
};
```

Below are some examples showcasing the specific features of the browser extension adapter:

```typescript
// ./common.ts
import { makeChromeMessages } from "better-messages";

export const { onMessage, sendMessage, createMessage } = makeChromeMessages<{
    background: {
        foo: () => void
    }
    content: {
        bar: (x: string, y: number) => boolean
    }
    popup: {
        baz: () => void
    }
}>();
```
```typescript
// ./background.ts
import { onMessage, sendMessage, createMessage } from "better-messages";

onMessage<"background">({
    foo: () => {
        console.log("Some function in here");
    },
});

// Send to popup with `chrome.runtime.sendMessage`
void sendMessage("baz")

// Get a tabId that has a content script already running with `chrome.scripting`
const tabId = someOtherFunction();

// Send to a specific tab with `chrome.tabs.sendMessage`
void sendMessage({ tabId: tabId }, "bar", "Some string", 0);

// Make an object that sends to a specific tab with `chrome.tabs.sendMessage`
const content = createMessage<"content">({ tabId: tabId });
void content.baz("Some string", 0);
```

### Web Workers

The included adapter for [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) is called `makeWorkerMessages`. A simplified set of type signatures is below:

```typescript
export function makeWorkerMessages<C extends Contract>(): {
    main: (worker: Worker) => Messages<C>;
    worker: Messages<C>;
};
export function makeWorkerMessages<C extends StrictContract>(): {
    main: (worker: Worker) => StrictMessages<C>;
    worker: StrictMessages<C>;
};
```

`makeWorkerMessages` is called in a common file by passing your **Contract** or **StrictContract** as a type parameter. It returns an object with two keys, "main" and "worker", which are the separate adapters for the main context and the worker context.

```typescript
// ./common.ts
import { makeWorkerMessages } from "better-messages";

export const { main, worker } = makeWorkerMessages<{
    add: (x: number, y: number) => number,
    divide: (x: number, y: number) => number,
    greet: (greeting: string) => void
}>
```

To use the worker adapter, simply import it from your common file and destructure the object. When using a **StrictContract**, the "worker" object will also have a `createMessage` method in addition to `onMessage` and `sendMessage`. The other **StrictContract** restrictions will also apply.

```typescript
// ./worker.ts
import { worker } from "better-messages";

const { onMessage, sendMessage } = worker;

onMessage({
    add: (x, y) => x + y,
    divide: (x, y) => x / y,
});
```

To use the main thread adapter, first construct the worker as you normally would, and then call "main" with a reference to the worker as the only parameter. This will then return an object with `onMessage` and `sendMessage`. When using a **StrictContract**, the returned object will also have a `createMessage` method, and the other restrictions will apply.

```typescript
// ./main.ts
import { main } from "better-messages";

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
const { onMessage, sendMessage } = main(worker);

onMessage("greet", (greeting) => {
    console.log("Worker sent a greeting to main thread:\n" + greeting)
    const sum = sendMessage("add", 1, 2);
    console.log("The sum of 1 and 2 is " + sum);
    const divide = sendMessage("divide", 6, 2);
    console.log("6 divided by 2 makes " + divide);
});
```

## Custom Adapters

The `makeMessages` function allows you adapt the library to any underyling communication medium. It takes a **Contract** or **StrictContract** as a type parameter. It has multiple overloads for different usecases. This allows you to choose between flat or strictly categorized contracts, and whether to provide the adapter configuration immediately (for symmetric protocols) or defer it (for assymetric protocols where the adapter must be different in different contexts). Below are the simplified overload signatures for `makeMessages`.

```typescript
function makeMessages<C extends Contract, O = undefined>(
    adapter: Adapter<O>,
): Messages<C, O>;
function makeMessages<C extends Contract, O = undefined>(): (
    adapter: Adapter<O>,
) => Messages<C, O>;
function makeMessages<C extends StrictContract, O = undefined>(
    adapter: Adapter<O>,
): StrictMessages<C, O>;
function makeMessages<C extends StrictContract, O = undefined>(): (
    adapter: Adapter<O>
) => StrictMessages<C, O>;
```

The adapter configuration object takes three keys:

```typescript
type NormalAdapter = {

    // A function that takes in an arbitrary listener and attaches it to the underlying messaging mechanism. 
    // It should return a cleanup function of type `() => void` that removes the listener.
    listen: (listener: (data: any) => void) => () => void;

    // A function that takes one parameter, "data", of type `any`, and sends it via the underlying messaging mechanism.
    send: (data: any) => void;

    // An optional, unique string to prevent message collisions if multiple instances are using the same messaging mechanism.
    namespace?: string;
};
```

### Example 1: Custom Events for Chrome Extension Injected Scripts

This example shows how to use `makeMessages` for type-safe communication between a content script and an injected script within a Browser Extension, using Custom Event dispatching on the document object to send the data.

The contract has one method called "greet", which takes in a `string` and returns a `string`. The object we pass to `makeMessages` has the "listen", "send", and "namespace" keys. The "listen" key takes in an unknown function, `listener`, which we put into a helper callback that unwraps the data from the Custom Event before delegating to the listener. We then attach the our helper callback, and return a function, which will remove the listener. The "send" key takes in unknown data and dispatches an event that data onto the document object.

```typescript
// common.ts
import { makeMessages } from "better-messages";

export const { sendMessage: sendInjected, onMessage: listenInjected } = makeMessages<{
    greet: (name: string) => string;
}>({
    listen: (listener) => {
        // Helper callback for unwrapping data
        const callback = (event: CustomEvent<{ detail: any }>) => {
            listener(event.detail);
        };
        // Type assertions since Typescript doesn't have a good way for typing listeners for CustomEvents
        document.body.addEventListener("better-messages-injected", callback as (event: Event) => void);
        return () => document.body.removeEventListener("better-messages-injected", callback as (event: Event) => void);
    },
    send: (data: any) => {
        document.body.dispatchEvent(new CustomEvent<{ detail: any }>("better-messages-injected", { detail: data }));
    },
    namespace: "injected", // Optional namespace prevents collisions when using the same medium for multiple contracts
});
```

Usage in the injected script:

```typescript
// inject.ts
import { sendInjected, listenInjected } from "./common";

listenInjected({
    greet: (name: string) => `Hello from injected script, ${name}!`,
});

setInterval(async () => {
    const result = await sendInjected("greet", "Injected Script");
    console.log("Content script responded to injected script with:", result);
}, 1000);
```

Usage in the content script:

```typescript
// content.ts
import { sendInjected, listenInjected } from "./common";

listenInjected({
    greet: (name: string) => `Hello, ${name}!`,
});

setInterval(async () => {
    const result = await sendInjected("greet", "Content Script");
    console.log("Injected script responded to content script with:", result);
}, 1000);
```

### Example 2: Asymmetric Protocols for Web Workers

This example shows how `makeMessages` works with assymetric protocols, wherein the underlying communication API differs over the separate javascript contexts. We pass the Contract to `makeCustom`, but we do not pass any runtime parameters. This returns a new function, which we then call in the two discrete contexts with the Adapter object (in this case inside the main thread and inside the Web Worker), finally returning `onMessage` and `sendMessage`.

This is merely an example of assymetric protocols. The [included `makeWorkerMessages` adapter](#web-workers) will likely be more convenient when using Web Workers.

```typescript
// common.ts
import { makeMessages } from "better-messages";

export const messages = makeMessages<{
    greet: (name: string) => string;
    add: (x: number, y: number) => number;
    divide: (x: number, y: number) => number;
    ping: (msg: string) => string;
}>();
```

Web Worker implementation:

```typescript
// worker.ts
import { messages } from "./common";

// Configure the adapter specifically for the Web Worker context
const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        const callback = (event: MessageEvent) => {
            listener(event.data);
        };
        self.addEventListener("message", callback);
        return () => self.removeEventListener("message", callback);
    },
    send: (data) => {
        self.postMessage(data); // Web Workers use postMessage on `self`
    },
});

let pingCountWorker = 0;
setInterval(async () => {
    pingCountWorker++;
    const response = await sendMessage("ping", `Pinging from web worker for ${pingCountWorker} times`);
    console.log("[Worker]", response);
}, 1000);

onMessage({
    greet: (name) => `Hello, ${name}!`,
    add: (x, y) => x + y,
    divide: (x, y) => x / y,
});
```

Main thread implementation:

```typescript
// index.ts (for the main thread)
import { messages } from "./common";

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

// Configure the adapter specifically for the Main Thread context
const { onMessage, sendMessage } = messages({
    listen: (listener) => {
        const callback = (event: MessageEvent) => {
            listener(event.data);
        };
        worker.addEventListener("message", callback);
        return () => worker.removeEventListener("message", callback);
    },
    send: (data) => {
        worker.postMessage(data); // Main thread uses postMessage on the worker instance
    },
});

const result = await sendMessage("divide", 10, 2);
console.log("10 divided by 2 makes " + result);
const result = await sendMessage("add", 10, 2);
console.log("10 added with 2 makes " + result);
const result = await sendMessage("greet", "Arthur Dent");
console.log(result);

let pingCountMain = 0;
onMessage("ping", (msg) => {
    pingCountMain++;
    console.log("[Main Thread] Received:", msg);
    return `Main thread received web worker ping for ${pingCountMain} times`;
});
```

## License

This project is licensed under the MIT license. see the [license](LICENSE) file for details.

---
