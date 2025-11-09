import { onMessage } from "./common";

let count = 0;
onMessage({
    hello: (_, x) => {
        console.log(x)
        count++;
        return x + ", count is " + count;
    }
});
