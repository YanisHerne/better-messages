# better-messages

Simplify browser extension messaging in TypeScript. `better-messages` provides an ergonomic,
type-safe way to manage communication between different parts of your extension (e.g., background,
popup, content script).

## Why `better-messages`?

Traditional browser extension messaging with the raw APIs is boilerplate-heavy and prone to runtime errors. `better-messages` solves this by:

*   **Type Safety:** Define your message contract once, and `better-messages` ensures all your message senders and listeners adhere to it, catching errors at compile time.
*   **Ergonomics:** No more manual type checking, validating, or type assertions. Write clean, readable code.
*   **Organization:** Ensure that each part of your extension has a clearly defined set of listeners, instead of wrangling a bunch of randomly placed functions.

## Installation
```bash
npm/pnpm/yarn install better-messages
```

## Usage

Start by defining your messaging contract in a shared file (e.g., `common.ts`). The contract is an
object where keys are message names, and values are functions. The function arguments define the
data sent, and the return type defines the data received.

```typescript
// ./common.ts
import { makeMessages } from "better-messages";

export const { onMessage, sendMessage } = makeMessages<{
    hello: (name: string) => string;
    add: (x: number, y: number) => number;
    getTheme: () => "auto" | "light" | "dark";
}>();
```

### Listening for Messages (`onMessage`)

Use `onMessage` to register handlers for your defined messages by passing an object that has is any partial subset of your Contract. TypeScript automatically provides
correct argument types and enforces return types, and your IDE will give you autocomplete and hover information. You can also use an alternate syntax wherein only a single listener is instantiated, by passing two parameters, where the first parameter is the name of the message, and the second parameter is the listener callback.

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

Use `sendMessage` to invoke a message. You'll get autocomplete for message names and type checking
for arguments. The return type is also automatically inferred.

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
