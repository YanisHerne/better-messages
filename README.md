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
*   **Efficiency:** A tiny bundle footprint (~1.1KB brotli)
*   **Universal Adaptability:** A small, ~10-line adapter allows `better-messages` to work with *any* messaging API.

## Getting Started

### Install with your favorite package manager:

```bash
npm/pnpm/yarn install better-messages
```

### Define your contract:

Do this in a shared file that can be imported by every context that will need to communicate. This contract is an object type where the keys are the message names, and the values are functions defining the inputs and outputs. The parameters define the data type(s) to be sent, and the return types define the data type(s) of the responses. Export `onMessage` and `sendMessage`, which will be used to listen for and send messages.

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
* "getTheme" takes no parameters and returns a union of the string literals "auto", "light", and "dark".

### Listen for messages:

Use `onMessage` to register handlers for your defined messages by passing an object that has is any partial subset of your Contract. TypeScript automatically provides correct argument types and enforces return types, and your IDE will give you autocomplete and hover information. You can also use an alternate syntax wherein only a single listener is instantiated, by passing two parameters, where the first parameter is the name of the message, and the second parameter is the listener callback.

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

// This is also valid if you only want to implement this message here
onMessage({
    hello: (name) => `Hello, ${name}!`,
});

// This syntax is also valid
onMessage("hello", (name) => `Hello, ${name}!`);

// Examples of typescript type enforcement:

onMessage({
    randomKey: () => true,
//  ^^^^^^^^^
// error: Object literal may only specify known properties, and 'randomKey' does not exist in type 
});

onMessage({
    getTheme: () => "day",
//  ^^^^^^^^
// error: Type '() => "day"' is not assignable to type '(args_0: MessageSender) => "auto" | "light" | "dark" | Promise<"auto" | "light" | "dark">'. Type '"day"' is not assignable to type '"auto" | "light" | "dark" | Promise<"auto" | "light" | "dark">'.});
});
```

### Sending Messages (`sendMessage`)

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
                              ╭────────────╮
                              │ "hello"    │
                              │ "add"      │
                              │ "getTheme" │
                              ╰────────────╯
```

## Usage (Strict Mode)

`better-messages` also incorporates a strict mode that slightly reduces flexibility in return for a more organized structure. Again, defining your contract in a shared file. This time, the contract is a "Strict Contract", an object in which the keys are "categories", and the values are subobjects that are normal Contracts, where the keys are the names, and values are functions. The function arguments define the sent data, and the return type defines the response data.

```typescript
// ./common.ts
import { makeStrictMessages } from "better-messages";

export const { onMessage, createMessage, sendMessage } = makeStrictMessages<{
    background: {
        // Message from popup to background to inject content script, with no response.
        inject: () => void
        // Divide x by y
        divide: (x: number, y: number) => number
        // Add x and y
        add: (x: number, y: number) => number
    }
    content: {
        // Respond to a hello
        hello: (name: string) => string
        // Concatenate two strings
        concat: (x: string, y: string) => string
        // Get the length of a string
        length: (x: string) => number
    }
}>();
```

### Listening for Messages (`onMessage`)

Use `onMessage` to register handlers for your defined messages. However, when using Strict Messages, you must provide a type argument that is a top-level key from your Strict Contract. Adding an erroneous listener when the contract doesn't call for one under the chosen category in the Strict Contract, or neglecting to add a listener that was specified in the Strict Contract, will create a typescript error.

```typescript
// ./background.ts
import { onMessage } from "./common";

onMessage<"background">({ // Note the type parameter
    // Everything else works the same way
    inject: async () => { // chrome apis will probably need async
        console.log("Injecting content script!");
        // Code for chrome.executeScript and stuff here
    },
    divide: (x, y) => x / y,
    add: (x, y, sender) => {
        console.log("[Add] message from:")
        console.log(sender)
        return x + y;
    },
});
```
```typescript
// ./content.ts
import { onMessage } from "./common";

onMessage<"content">({
    hello: (name) => `Hello, ${name}!`, // `name` is typed as string
    concat: (x, y) => x + y,
    length: (x) => x.length,
});
```

### Sending Messages (`sendMessage` or `createMessage`)

Use `sendMessage` to invoke a message. You'll get autocomplete for message names and type checking
for arguments. The return type is also automatically inferred.

```typescript
// ./popup.ts
import { sendMessage, createMessage } from "./common";

const quotient = await sendMessage("divide", 66, 3);
console.log(quotient) // 22

const sum = await sendMessage("add", 5, 3);
console.log(sum); // 8
```

You can get an object-type syntax using `createMessage`, which you may find more ergonomic. Passing a key from your Strict Contract as the type parameter for `createMessage` will create an object with the corresponding methods for that key in the Strict Contract.

```typescript
// or you can use it this way:

// Note the type parameter, to message to the background script from the popup script
const background = createMessage<"background">();

const quotient = await background.divide(66, 3);
console.log(quotient) // 22

const sum = await background.add(5, 3);
console.log(sum); // 8
```

## Usage

The core idea behind `better-messages` is the **Contract**. A Contract is a TypeScript interface that defines the shape of your messages: what parameters they take and what kind of response they return.

### Basic Contract (Flat Messaging)

With a basic contract, you define a flat list of messages. This is great for simpler applications or when you don't need distinct categories for your message listeners.

First, define your `Contract` in a shared file:

```typescript
// common.ts
import { makeMessages } from "better-messages";

export const { onMessage, sendMessage } = makeMessages<{
    hello: (name: string) => string;
    add: (x: number, y: number) => number;
    getTheme: () => "auto" | "light" | "dark";
}>();
```

Then, implement your message handlers in the receiving context:

```typescript
// background.ts
import { onMessage } from "./common";

// Implement all messages defined in the contract
onMessage({
    hello: (name) => `Hello, ${name}!`, // `name` is typed as string
    add: (x, y) => x + y, // Return type enforced as "number"
    getTheme: async () => {
        // Asynchronous handlers work out of the box
        // return await someStorageApi();
        return "light";
    },
});

// You can also implement a subset of messages
onMessage({
    hello: (name) => `Hello, ${name}!`,
});

// Or use the single message syntax
onMessage("hello", (name) => `Hello, ${name}!`);
```

Sending messages is just as straightforward:

```typescript
// popup.ts
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
```

#### Type Safety in Action

`better-messages` leverages TypeScript to prevent common messaging errors:

```typescript
// Incorrect message name
onMessage({
    randomKey: () => true,
//  ^^^^^^^^^
//  error: Object literal may only specify known properties, and 'randomKey'
//         does not exist in type ...
});

// Incorrect return type
onMessage({
    getTheme: () => "day",
//  ^^^^^^^^
//  error: Type '() => "day"' is not assignable to type ...
//         Type '"day"' is not assignable to type '"auto" | "light" | "dark"'
});
```

#### IDE Autocomplete

Enjoy intelligent autocomplete suggestions for message names and arguments directly in your IDE:

```typescript
// Autocomplete for available messages:
const foo = await sendMessage("getTheme");
                              // ╭────────────╮
                              // │ "hello"    │
                              // │ "add"      │
                              // │ "getTheme" │
                              // ╰────────────╯
```

### Strict Contract (Categorized Messaging)

For more complex applications, a `StrictContract` allows you to organize your messages into mutually exclusive categories. This means a handler can only listen for messages within its declared category, providing better separation of concerns and preventing accidental cross-category message handling.

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

Implement handlers for specific categories using the type parameter:

```typescript
// background.ts
import { onMessage } from "./common";

// Listen for messages directed to the "background" category
onMessage<"background">({
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

// Listen for messages directed to the "content" category
onMessage<"content">({
    hello: (name) => `Hello, ${name}!`,
    concat: (x, y) => x + y,
    length: (x) => x.length,
});
```

Sending messages with `sendMessage` works similarly, inferring the category from the message name:

```typescript
// popup.ts
import { sendMessage } from "./common";

const quotient = await sendMessage("divide", 66, 3);
console.log(quotient); // 22

const sum = await sendMessage("add", 5, 3);
console.log(sum); // 8
```

#### Object-Oriented Messaging with `createMessage`

For a more object-oriented feel, `createMessage` allows you to generate a callable object for a specific category:

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

While `makeMessages` and `makeStrictMessages` provide out-of-the-box support for Chrome Extension Runtime messaging, `better-messages` is designed to be highly adaptable. The `makeCustom` function allows you to create your own messaging instance by providing a simple adapter for any messaging API. This makes `better-messages` truly universal for any JavaScript context.

The adapter configuration object requires three keys:
*   `listen`: A function that takes a `listener` callback and attaches it to the underlying messaging mechanism. It should return a cleanup function to remove the listener.
*   `send`: A function that takes data and sends it via the underlying messaging mechanism.
*   `namespace`: A unique string to prevent message collisions if multiple `makeCustom` instances are using the same underlying messaging channel.

### `makeCustom` Overloads

`makeCustom` is highly flexible and offers four distinct overloads to suit your needs:

1.  **Flat Contract with Immediate Config:**
    `makeCustom<ContractType>(config)`
    (Used in Example 1: Injected Scripts)

2.  **Flat Contract, Config Deferred:**
    `makeCustom<ContractType>()` which returns `(config) => { onMessage, sendMessage }`
    (Used in Example 2: Web Workers)

3.  **Strict Contract with Immediate Config:**
    `makeCustom<StrictContractType>(config)`

4.  **Strict Contract, Config Deferred:**
    `makeCustom<StrictContractType>()` which returns `(config) => { onMessage, createMessage, sendMessage }`

This allows you to choose between flat or strictly categorized contracts, and whether to provide the adapter configuration immediately or defer it for dynamic setup, which is particularly useful for asymmetric communication protocols.

### Example 1: Custom Events for Chrome Extension Injected Scripts

This example demonstrates how to use `makeCustom` to enable type-safe communication between a content script and an injected script within a Chrome Extension, leveraging `CustomEvent` for messaging.

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
        // Use a specific event name for our messages
        document.body.addEventListener("better-messages-injected", callback as (event: Event) => void);
        return () => document.body.removeEventListener("better-messages-injected", callback as (event: Event) => void);
    },
    send: (data: any) => {
        // Dispatch a CustomEvent with the message data
        document.body.dispatchEvent(new CustomEvent<{ detail: any }>("better-messages-injected", { detail: data }));
    },
    namespace: "injected", // Unique namespace for this communication
});
```

Usage in the injected script:

```typescript
// inject.ts
import { sendInjected, listenInjected } from "./common";

console.log("Injected script active.");

listenInjected({
    greet: (name: string) => `Hello from injected script, ${name}!`,
});

setInterval(async () => {
    const result = await sendInjected("greet", "Injected Script");
    console.log("[Injected Script]", result);
}, 1000);
```

Usage in the content script:

```typescript
// content.ts
import { sendInjected, listenInjected } from "./common";

console.log("Hello from content script.");

// Inject the script into the page context
const s = document.createElement('script');
s.src = chrome.runtime.getURL("inject.js");
document.head.appendChild(s);

setInterval(async () => {
    const result = await sendInjected("greet", "Content Script");
    console.log("[Content Script]", result);
}, 1000);

listenInjected({
    greet: (name: string) => `Hello, ${name}!`,
});
```

### Example 2: Asymmetric Protocols for Web Workers

`makeCustom` also provides an overload that supports asymmetric protocols, where the adapter configuration might be different on each side of the communication. In this scenario, you call `makeCustom` with only the contract type parameter, which returns a function. You then call *that* function with the specific adapter config for the current context to get your `onMessage` and `sendMessage` functions.

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

const divideBtn = document.getElementById("divide");
const addBtn = document.getElementById("add");
const helloBtn = document.getElementById("hello");
if (!divideBtn || !addBtn || !helloBtn) throw new Error("Something went wrong");

divideBtn.addEventListener("click", async () => {
    const result = await sendMessage("divide", 10, 2);
    console.log("10 divided by 2 makes " + result);
});

addBtn.addEventListener("click", async () => {
    const result = await sendMessage("add", 10, 2);
    console.log("10 added with 2 makes " + result);
});

helloBtn.addEventListener("click", async () => {
    const result = await sendMessage("greet", "Arthur Dent");
    console.log(result);
});

let pingCountMain = 0;
onMessage("ping", (msg) => {
    pingCountMain++;
    console.log("[Main Thread] Received:", msg);
    return `Main thread received web worker ping for ${pingCountMain} times`;
});
```

## License

This project is licensed under the MIT license. see the [license](license) file for details.

---
