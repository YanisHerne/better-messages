# better-messages

Simplify browser extension messaging in TypeScript. `better-messages` provides an ergonomic,
type-safe way to manage communication between different parts of your extension (e.g., background,
popup, content script).

## Why `better-messages`?

Traditional browser extension messaging with the raw APIs is boilerplate-heavy and prone to runtime
errors. `better-messages` solves this by:

*   **Type Safety:** Define your message contract once, and `better-messages` ensures all your
 message senders and listeners adhere to it, catching errors at compile time.
*   **Ergonomics:** No more manual type checking, type assertions or promise management. Write clean,
 readable code.
*   **Organization:** Ensure that each part of your extension has a clearly defined set of
 listeners, instead of wrangling a bunch of randomly placed functions.

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

Use `onMessage` to register handlers for your defined messages. TypeScript automatically provides
correct argument types and enforces return types.

```typescript
// ./background.ts
import { onMessage } from "./common";

onMessage({
    hello: (_, name) => `Hello, ${name}!`, // `name` is typed as string
    add: (_, x, y) => x + y, // Return type enforced as "number"
    getTheme: async () => {
        // Asynchronous handlers work out of the box
        return await someStorageApi();
    },
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
const foo = await sendMessage(|
                              ╭────────────╮
                              │ "hello"    │
                              │ "add"      │
                              │ "getTheme" │
                              ╰────────────╯
```

## API Reference

### `makeMessages`

The `makeMessages` function is the entry point for `better-messages`. It takes a generic type
parameter, `C`, which defines your message **Contract**. This contract is an object type where:

*   Keys are the names of your messages.
*   Values are functions, where:
    *   The **parameter types** define the data sent with the message (`Input<C, K>`).
    *   The **return types** define the data received as a response (`Output<C, K>`).
    *   You do **not** need to explicitly wrap return types in `Promise<T>`. Both synchronous and
        asynchronous handlers (returning plain values or Promises) are handled automatically. If no
        response is expected, the return type can be `void`.

`makeMessages` returns an object containing two functions: `onMessage` and `sendMessage`, both of
which are configured with your defined `Contract`.

```typescript
// Example Contract definition
export const { onMessage, sendMessage } = makeMessages<{
    // Message 'hello' takes a string and returns a string
    hello: (name: string) => string;
    // Message 'add' takes two numbers and returns a number
    add: (x: number, y: number) => number;
    // Message 'getTheme' takes no arguments and returns a union type
    getTheme: () => "auto" | "light" | "dark";
}>();
```

---

### `onMessage`

`onMessage` allows you to register handlers that respond to incoming messages defined in your
`Contract`.

**Signatures:**

```typescript
// ... C extends Contract ...

// Register a single handler for a specific message tag
onMessage<K extends keyof C>(
    tag: K,
    handler: (
        sender: chrome.runtime.MessageSender,
        ...message: Input<C, K>
    ) => Output<C, K> | Promise<Output<C, K>>,
): void;

// Register multiple handlers at once using an object map
onMessage(
    handlers: {
        [K in keyof C]?: (
            sender: chrome.runtime.MessageSender,
            ...message: Input<C, K>
        ) => Output<C, K> | Promise<Output<C, K>>;
    },
): void;
```

*   **`tag`**: The name of the message (a key from your `Contract`).
*   **`handler`**: A function that will be executed when the specified message is received.
    *   The first argument to the handler is the `chrome.runtime.MessageSender` object, providing
        information about the sender of the message (e.g., `tab` details).
    *   Subsequent arguments (`...message`) are automatically typed according to the `Input` type
        defined in your `Contract` for that message.
    *   The return value must match the `Output` type for that message in your `Contract`. You can
        return a direct value or a `Promise` resolving to the value; `better-messages` handles
        asynchronous responses automatically.
*   **`handlers`**: An object where keys are message names and values are the corresponding
    handler functions. This is the more common and ergonomic way to register multiple handlers.

**Example (single handler):**

```typescript
onMessage("hello", (sender, name) => {
    console.log(`Message from ${sender.tab?.id}`, name);
    return `Hello there, ${name}!`;
});
```

**Example (multiple handlers - as shown in Usage section):**

```typescript
onMessage({
    hello: (_, name) => `Hello, ${name}!`,
    getTheme: async () => {
        return await someStorageApi();
    },
});
```

---

### `sendMessage`

`sendMessage` allows you to send messages to other parts of your extension, as defined in your
`Contract`. It returns a `Promise` that resolves with the response from the message handler.

**Signatures:**

```typescript
// ... C extends Contract ...

// Send a message to the active context (e.g., background to popup, or popup to background)
sendMessage<K extends keyof C>(
    tag: K,
    ...message: Input<C, K>
): Promise<Output<C, K>>;

// Send a message to a specific tab
sendMessage<K extends keyof C>(
    tabId: number,
    tag: K,
    ...message: Input<C, K>
): Promise<Output<C, K>>;

// Send a message to a specific frame within a tab
sendMessage<K extends keyof C>(
    tabAndFrameId: {
        tabId: number;
        frameId: number;
    },
    tag: K,
    ...message: Input<C, K>
): Promise<Output<C, K>>;
```

*   **`tag`**: The name of the message (a key from your `Contract`). TypeScript will provide
    autocomplete suggestions.
*   **`...message`**: The arguments to send with the message, automatically type-checked against the
    `Input` type for the specified message in your `Contract`.
*   **`tabId`**: (Optional) The ID of the tab to send the message to. Omit this to send the message
    to the "global" listener (e.g., background script if sending from a popup/content script, or vice-versa).
*   **`tabAndFrameId`**: (Optional) An object specifying both `tabId` and `frameId` to send a
    message to a very specific frame within a tab (e.g., a content script in an iframe).

**Example (sending to default listener):**

```typescript
const response = await sendMessage("hello", "Earthling");
console.log(response); // "Hello there, Earthling!"
```

**Example (sending to a specific tab):**

```typescript
const tabId = 123; // Get this from chrome.tabs.query or similar
const sum = await sendMessage(tabId, "add", 10, 20);
console.log(`Sum in tab ${tabId}: ${sum}`); // 30
```

**Example (sending to a specific frame):**

```typescript
const frameLocation = { tabId: 456, frameId: 1 }; // From chrome.tabs.query, chrome.scripting, etc.
const theme = await sendMessage(frameLocation, "getTheme");
console.log(`Theme in frame: ${theme}`); // "light"
```
