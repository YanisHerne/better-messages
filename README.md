# better-messages

**Easy, Ergonomic, and Type-Safe Messaging for JavaScript Contexts**

`better-messages` is a small, self-contained library that provides an ergonomic, type-safe way to manage communication between different local javascript contexts. Originally for browser extensions, it easily generalizes to other cross-context usecases, including Web Workers, Service Workers, Shared Workers, and more.

## Why `better-messages`?

Traditional browser extension messaging with the raw APIs is boilerplate-heavy and prone to runtime errors. `better-messages` solves this by:

*   **Type Safety:** Define your message contracts upfront and let TypeScript enforce parameter types, return types, and available message names. Catch messaging bugs at compile time!
*   **Ergonomics:** No more manual type checking, validating, or type assertions. Enjoy a clean and intuitive API for sending and receiving messages. Write clean, readable code.
*   **Asynchronous Support:** Message handlers seamlessly support asynchronous operations (e.g., `async/await`).
*   **IDE Autocomplete:** Benefit from excellent IDE support, including autocomplete for message names and argument suggestions.
*   **Organization:** Ensure that each part of your extension has a clearly defined set of listeners, instead of wrangling a bunch of randomly placed functions.
*   **Efficiency:** A tiny bundle footprint (>1KB brotli)
*   **Universal Adaptability:** A small, ~10-line adapter allows `better-messages` to work with any messaging API.

## Getting Started (Chrome Extension)

### Install with your favorite package manager:

```bash
npm/pnpm/yarn install better-messages
```

### Basic Contract:

The core concept when using `better-messages` is the **Contract**, a typescript interface or object type that defines all of your messages: what parameters they take and what kind of response they return. This contract is an object type where the keys are the message names, and the values are functions defining the inputs (parameter types) and outputs (return types).

Make a shared file to be imported by every context that will need to communicate. Import `makeMessages` from `better-messages` and pass your Contract as a type parameter. Export `onMessage` and `sendMessage`, which will be used to listen for and send messages.

```typescript
// ./common.ts
import { makeMessages } from "better-messages";

export const { onMessage, sendMessage } = makeMessages<{
    hello: (name: string) => string;
    add: (x: number, y: number) => number;
    getTheme: () => "auto" | "light" | "dark";
}>();
```

This contract has three messages. 
* "hello" takes in a "name" of type `string`, and returns a `string`.
* "add" takes in two parameters of type `number` and returns a `number`.
* "getTheme" takes no parameters and returns a union of the string literals `"auto"`, `"light"`, and `"dark"`.

#### Listen for messages:

Use `onMessage` to register handlers for your defined messages by passing an object where the keys are names of the messages and the values are functions that match your Contract. You can also use an alternate syntax wherein only a single listener is instantiated, by passing two parameters, where the first parameter is the name of the message, and the second parameter is the listener callback. TypeScript automatically provides correct argument types and enforces return types, and your IDE will give you autocomplete and hover information. 

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

// Partial subsets of the Contract are allowed too
onMessage({
    hello: (name) => `Hello, ${name}!`,
});

// This two-parameter syntax is also valid when listening to only one message
onMessage("hello", (name) => `Hello, ${name}!`);

// Type-safety in action:

onMessage({
    randomKey: () => true,
//  ^^^^^^^^^
// error: Object literal may only specify known properties, and 'randomKey' does not exist in type 
});

onMessage({
    getTheme: () => "day",
//  ^^^^^^^^
// error: Type '() => "day"' is not assignable to type '(args_0: MessageSender) => "auto" | 
//            "light" | "dark" | Promise<"auto" | "light" | "dark">'.
//        Type '"day"' is not assignable to type '"auto" | "light" | "dark" |
//            Promise<"auto" | "light" | "dark">'.});
});
```

#### Sending Messages (`sendMessage`)

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

For more complex applications, a `StrictContract` allows you to organize your messages into mutually exclusive categories. Each top-level key is a category, and its value is its own specific `Contract`. This means a handler will only listen for messages within its declared category, providing better separation of concerns and preventing accidental cross-category message handling.

First, define your `StrictContract` in a shared file:

```typescript
// common.ts
import { makeMessages } from "better-messages";

export const { onMessage, createMessage, sendMessage } = makeMessages<{
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
> The method names in each category must be unique across the entire Strict Contract. `makeMessages` will create a typescript error if this restriction is violated, such as in the following example, where both the "background" and "content" categories have an "add" method.
> ```typescript
> const { onMessage, sendMessage } = makeMessages<{
>     background: {
>         add: (x: number, y: number) => number
>     }
>     content: {
>         add: (x: string, y: string) => string 
>     }
> }>();
> ```

#### Listening for Messages

Use `onMessage` to register handlers for your defined messages. However, when using Strict Messages, you must provide a type argument that is a category (top-level key) from your Strict Contract. Adding a listener that is not specified under the chosen category, or neglecting to add a listener that *was* specified under the chosen category, will result in a typescript error.

```typescript
// background.ts
import { onMessage } from "./common";

onMessage<"background">({ // Note the type parameter
    inject: async () => {
        console.log("Injecting content script!");
        // Code for chrome.executeScript and stuff here
    },
    divide: (x, y) => x / y,
    add: (x, y, sender) => {
        console.log("[Add] message from:");
        console.log(sender); // You get access to the MessageSender object here
        return x + y;
    },
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

#### Sending Messages

Sending messages works the same for Strict Contracts as for normal Contracts. You'll get autocomplete for message names and type enforcement for arguments. The return type is also automatically inferred.

```typescript
// popup.ts
import { sendMessage } from "./common";

const quotient = await sendMessage("divide", 66, 3);
console.log(quotient); // 22

const sum = await sendMessage("add", 5, 3);
console.log(sum); // 8
```

For a more object-oriented feel, `createMessage` allows you to generate a callable object for a specific category by passing a category from your Strict Contract as the type parameter.

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

## Custom Adapters with `makeCustom`

The `makeCustom` function allows you to create your own messaging instance by providing a simple adapter for any messaging API.

The adapter configuration object requires three keys:
*   `listen`: A function that takes a `listener` callback and attaches it to the underlying messaging mechanism. It should return a cleanup function to remove the listener.
*   `send`: A function that takes one parameter, `data`, of type `any`, and sends it via the underlying messaging mechanism.
*   `namespace`: A unique string to prevent message collisions if multiple `makeCustom` instances are using the same underlying messaging channel.

### `makeCustom` Overloads

`makeCustom` is highly flexible and offers four distinct overloads to suit your needs. Here are the simplified signatures:

1.  **Flat Contract with Immediate Config:**
    `makeCustom<Contract>(config)`
    (Used in Example 1: Injected Scripts)

2.  **Flat Contract with Deferred Config:**
    `makeCustom<Contract>()` which returns `(config) => { onMessage, sendMessage }`
    (Used in Example 2: Web Workers)

3.  **Strict Contract with Immediate Config:**
    `makeCustom<StrictContract>(config)`

4.  **Strict Contract, Deferred Config:**
    `makeCustom<StrictContract>()` which returns `(config) => { onMessage, createMessage, sendMessage }`

This allows you to choose between flat or strictly categorized contracts, and whether to provide the adapter configuration immediately (for symmetric protocols) or defer it (for assymetric protocols where the adapter must be different in different contexts).

### Example 1: Custom Events for Chrome Extension Injected Scripts

This example shows how to use `makeCustom` for type-safe communication between a content script and an injected script within a Browser Extension, using Custom Event dispatching on the document object to send the data.

Here's the contract and the adapter. The contract has one method called "greet", which takes in a `string` and returns a `string`. The object we pass to `makeCustom` has the "listen", "send", and "namespace" keys. The "listen" key takes in an unknown function, `listener`, which we put into our won callback that unwraps the data from the Custom Event. We then attach the listener, and return a function, which will remove the listener. The "send" key takes in unknown data and dispatches an event holding that data onto the document object.

```typescript
// common.ts
import { makeCustom } from "better-messages";

export const { sendMessage: sendInjected, onMessage: listenInjected } = makeCustom<{
    greet: (name: string) => string;
}>({
    listen: (listener) => {
        const callback = (event: CustomEvent<{ detail: any }>) => {
            listener(event.detail);
        };
        document.body.addEventListener("better-messages-injected", callback as (event: Event) => void);
        return () => document.body.removeEventListener("better-messages-injected", callback as (event: Event) => void);
    },
    send: (data: any) => {
        document.body.dispatchEvent(new CustomEvent<{ detail: any }>("better-messages-injected", { detail: data }));
    },
    namespace: "injected",
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

This example shows how `makeCustom` works with assymetric protocols, wherein the underlying communication API differs over the separate javascript contexts. We pass the Contract to `makeCustom`, but we do not pass any runtime parameters. This returns a new function, which we then call in the two discrete contexts (in this case inside the main thread and inside the Web Worker), returning our `onMessage` and `sendMessage` functions.

```typescript
// common.ts
import { makeCustom } from "better-messages";

export const messages = makeCustom<{
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
    namespace: "worker",
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
    namespace: "worker",
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
