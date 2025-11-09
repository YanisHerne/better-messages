# better-messages

A typescript library to make Browser Extension messaging easy and ergonomic.

## Usage
Import `makeMessages` and call it, with the type parameter defining the messaging contract. The
contract is simply an object type where the keys are the names of the messages, and the values
are functions, where the input arguments define the data to be sent, the return values define the
data that will be returned. Promise-typed returns do not need to explicitly set, that is taken care
of automatically. Export `onMessage` and `sendMessage`, which are the ergonomic functions capturing
this type information.
```typescript
// ./common.ts
import { makeMessages } from "better-messages";

export const { onMessage, sendMessage } = makeMessages<{
    hello: (name: string) => string,
    add: (x: number, y: number) => number,
    getTheme: () => "auto" | "light" | "dark;
}>();
```
Use `onMessage` to listen for messages. Input arguments will automatically be typed correctly. For
example, below, the `name` argument for the `hello` function is automatically typed as a string.
Typescript will also enforce that `hello` returns a string, in accordance with the contract above.
Asynchronous and synchronous listeners are automatically handled, so Promise return types will work
without any additional effort.
```typescript
// ./background.ts
import { onMessage } from "./common";

onMessage({
    hello: (_, name) => `Hello, ${name}!`,
    getTheme: async () => {
        return await someStorageApi();
    }
});
```
Use `sendMessage` to call functions defined in the contract. The first argument will provide
autocomplete for keys that are defined in the contract. Typescript will enforce that the correct
quantity and types of arguments are passed. The return type will also be typed correctly, so the
type of `response` below is `string`.
```typescript
// ./popup.ts
import { sendMessage } from "./common";

const response = await sendMessage("hello", "Arthur Dent");
console.log(response); // "Hello, Arthur Dent!"
```
