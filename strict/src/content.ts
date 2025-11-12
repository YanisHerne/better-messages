import { onMessage } from "./common";

let count = 0;
onMessage<"content">({
    hello: (x) => {
        console.log(x)
        count++;
        return x + ", count is " + count;
    },
    concat: (x, y) => x + y,
    length: (x) => x.length,
});
