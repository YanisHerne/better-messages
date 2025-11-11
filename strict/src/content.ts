import { onMessage } from "./common";

let count = 0;
onMessage<"content">({
    hello: (_, x) => {
        console.log(x)
        count++;
        return x + ", count is " + count;
    },
    concat: (_, x, y) => x + y,
    length: (_, x) => x.length,
});
