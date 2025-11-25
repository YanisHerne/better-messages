import { sendInjected, listenInjected } from "./common";

console.log("Injected script");

listenInjected({
    greet: (name: string) => `Hello from injected script, ${name}!`,
});

setInterval(async () => { 
    const result = await sendInjected("greet", "Injected Script")
    console.log(result);
}, 1000);
