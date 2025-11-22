import { sendMessage, customMessages} from "./common";

const { sendMessage: sendMessageCustom } = customMessages({
    listen: (listener) => {
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    },
    send: (data: any) => {
        chrome.runtime.sendMessage(data);
    },
    namespace: "custom",
});

const injectButton = document.getElementById("inject");
if (!injectButton) throw new Error();
injectButton.addEventListener("click", async () => {
    console.log("Inject");
//    void sendMessage("inject");
    const thing = await sendMessageCustom("greet", "Rory");
    console.log("Thing: " + thing);
});

const divideButton = document.getElementById("input-1")
if (!divideButton) throw new Error();
divideButton.addEventListener("click", (async () => {
    const num = await sendMessage("divide", 10, 2)
    // typeof num === "number"
    console.log("10 divided by 2 makes " + num);
}) as () => void);

const addButton = document.getElementById("input-2")
if (!addButton) throw new Error();
addButton.addEventListener("click", (async () => {
    const num = await sendMessage("add", 10, 2)
    // typeof num === "number"
    console.log("10 plus 2 makes " + num);
}) as () => void);

// Autocomplete works:
// sendMessage("|
//            ╭──────────╮
//            │ "add"    │
//            │ "inject" │
//            │ "hello"  │
//            │ "divide" │
//            │ "concat" │
//            │ "length" │
//            ╰──────────╯

// sendMessage("random-message");
//             ^^^^^^^^^^^^^^^^
// error: Argument of type '"random-message"' is not assignable to parameter of type '"inject" | "hello" | "divide" | "add" | "concat" | "length"'.

// sendMessage("add")
// ^^^^^^^^^^^
// error: Expected 3 arguments, but got 1.

// sendMessage("add", "This is a string", 5);
//                    ^^^^^^^^^^^^^^^^^^
// error: Argument of type 'string' is not assignable to parameter of type 'number'.

// sendMessage("add", 10, true)
//                        ^^^^
// error: Argument of type 'boolean' is not assignable to parameter of type 'number'.
