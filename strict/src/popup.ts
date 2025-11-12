import { createMessage } from "./common";

const background = createMessage<"background">();

// Autocomplete works:
// background.|
//            ╭────────╮
//            │ add    │
//            │ divide │
//            │ inject │
//            ╰────────╯
// Note that only the fields that were specified in the Contract under the key
// `background` are showing up.
// 
// Hover info is given:
// background.add
//             ╭───────────────────────────────────────────────────────────╮
//             │ (property) add: (x: number, y: number) => Promise<number> │
//             ╰───────────────────────────────────────────────────────────╯
//
// Good typescript errors:
//
// background.add("This is supposed to be a number", 2);
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// error: Argument of type 'string' is not assignable to parameter of type 'number'.
//
// background.inject(true);
//                   ^^^^
// error: Expected 0 arguments, but got 1. 

const injectButton = document.getElementById("inject");
if (!injectButton) throw new Error();
injectButton.addEventListener("click", () => {
    void background.inject();
});

const divideButton = document.getElementById("input-1")
if (!divideButton) throw new Error();
divideButton.addEventListener("click", (async () => {
    const num = await background.divide(10, 2);
    // typeof num === "number"
    console.log("10 divided by 2 makes " + num);
}) as () => void);

const addButton = document.getElementById("input-2")
if (!addButton) throw new Error();
addButton.addEventListener("click", (async () => {
    const num = await background.add(10, 2);
    // typeof num === "number"
    console.log("10 plus 2 makes " + num);
}) as () => void);

