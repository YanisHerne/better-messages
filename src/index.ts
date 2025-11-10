/*
 * This type defines what types the passed messaging contract can be: Any
 * record where the values are all functions of any type. The keys are used
 * to keep track of what listeners should respond to which messages, the
 * parameter types of the functions are the input schema of the messages, and 
 * the return types are the response schema of the messages. If there is no
 * response, the function can be typed as a void return type. Return types do
 * not need to be explicitly typed as Promise<T>. Promises and async functions
 * vs. plain values will both work out of the box.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Contract = Record<any, (...args: any[]) => any>

/**
 * Extracts the parameter types for any function in a Contract from that
 * function's key.
 */
type Input<
    C extends Contract,
    K extends keyof C,
> = Parameters<C[K]>

/**
 * The internal input embeds the Input type in a container type so that adds a
 * tag property (from the name of that property in the Contract type) to
 * discriminate over internally so that the correct listener callback is
 * invoked by onMessage.
 */
type InternalInput<
    C extends Contract,
    K extends keyof C,
> = {
    tag: K,
    msg: Input<C, K>
}

/**
 * This is the type asserted in the callback of the internal event listener.
 * It is then discriminated over via the tags to dispatch the message to the
 * correct user-provided handler.
 */
type AllInternalInputs<C extends Contract> = {
  [K in keyof C]: { tag: K, msg: Input<C, K> }
}[keyof C];

/**
 * Extracts the return typesfor any function in a Contract from that function's
 * key.
 */
type Output<
    C extends Contract,
    K extends keyof C,
> = ReturnType<C[K]>;

/**
 * The tagged version of the output, which is passeed into the `sendResponse`
 * callback.
 */
type InternalOutput<
    C extends Contract,
    K extends keyof C,
> = {
    tag: K,
    msg: Output<C, K>
}

/**
 * This is the type that is the union of all possible types that may be
 * returned by onMessage handlers, and passed into the `sendResponse` callback.
 */
type AllInternalOutputs<C extends Contract> = {
    [K in keyof C]: InternalOutput<C, K>
}[keyof C];

type Handler<
    C extends Contract,
    K extends keyof C
> = (
    sender: chrome.runtime.MessageSender,
    ...message: Input<C,K>
) => Output<C,K> | Promise<Output<C,K>>

export interface BetterMessages<C extends Contract> {
    onMessage<K extends keyof C>(
        tag: K,
        handler: (
            sender: chrome.runtime.MessageSender,
            ...message: Input<C,K>
        ) => Output<C,K> | Promise<Output<C,K>>,
    ): void
    onMessage(
        handlers: {
            [K in keyof C]?: (
                sender: chrome.runtime.MessageSender,
                ...message: Input<C,K>
            ) => Output<C,K> | Promise<Output<C,K>>;
        },
    ): void;

    sendMessage<K extends keyof C>(
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>;
    sendMessage<K extends keyof C>(
        tabId: number,
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>
    sendMessage<K extends keyof C>(
        tabAndFrameId: {
            tabId: number,
            frameId: number,
        },
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>
}

/**
 * The `makeMessages` function is the entry point for `better-messages`. It takes a generic type
 * parameter to define your message **Contract**. This contract is an object type where:
 * 
 * * Keys are the names of your messages.
 * * Values are functions, where:
 *   * The **parameter types** define the data sent with the message (`Input<C, K>`).
 *   * The **return types** define the data received as a response (`Output<C, K>`).
 *   * You do **not** need to explicitly wrap return types in `Promise<T>`. Both synchronous and
 *     asynchronous handlers (returning plain values or Promises) are handled automatically. If no
 *     response is expected, the return type can be `void`.
 * 
 * `makeMessages` returns an object containing two functions: `onMessage` and `sendMessage`, both of
 * which are configured with your defined `Contract`.
 */
export const makeMessages = <C extends Record<any, (...args: any[]) => any>>(): BetterMessages<C> => {
    const onMessage = <K extends keyof C>(...args: 
        | [handlers: { [K in keyof C]?: Handler<C, K> }]
        | [tag: K, handler: Handler<C,K>]
    ): void => {
        chrome.runtime.onMessage.addListener(
            (
                message: AllInternalInputs<C>,
                sender: chrome.runtime.MessageSender,
                sendResponse: (response?: AllInternalOutputs<C>) => void,
            ): boolean => {
                let handler: Handler<C,K> | undefined;
                if (typeof args[0] === "string") {
                    handler = args[1] as Handler<C,K>;
                } else {
                    // Find which handler to use for this message
                    // The type assertion needed since typescript isn't smart
                    // enough to see the arguments as a tagged union
                    const handlers: {
                        [K in keyof C]?: Handler<C,K>
                    } = args[0] as {
                        [K in keyof C]?: Handler<C,K>
                    };
                    handler = handlers[message.tag];
                }
                if (!handler) return false

                const result = handler(sender, ...message.msg);
                if (result instanceof Promise) {
                    // Async is allowed in the modern API, but the function
                    // return `true` early so that the browser knows to keep
                    // the port open for the sendResponse callback to fire
                    void result.then(sendResponse);
                    return true;
                } else {
                    sendResponse(result);
                    return false;
                }
            },
        );
    };

    const sendMessage = <K extends keyof C>(...args:
        | [tag: K, ...message: Input<C,K>]
        | [tabId: number, tag: K, ...message: Input<C, K>]
        | [
            tabAndFrameId: { tabId: number; frameId: number },
            tag: K,
            ...message: Input<C, K>
        ]
    ): Promise<Output<C, K>> => {
        // The type assertions below are required since typescript can't
        // do type narrowing over variadic tuples, apparently
        if (typeof args[0] === "number") {
            // In this case, the overload for sending to a tab has been called
            const internal: InternalInput<C, K> = {
                tag: args[1],
                msg: args.slice(2) as InternalInput<C, K>["msg"],
            }
            return chrome.tabs.sendMessage(args[0], internal);
        } else if (typeof args[0] === "object") {
            // In this case, the overload for sending to a tab and a frame has
            // been called
            const internal: InternalInput<C, K> = {
                tag: args[1],
                msg: args.slice(2) as InternalInput<C, K>["msg"],
            }
            return chrome.tabs.sendMessage(args[0].tabId, internal, { frameId: args[0].frameId });
        } else {
            // In this case, the overload for sending via the runtime object
            // (to the background script or popup script) has been called
            const internal: InternalInput<C, K> = {
                tag: args[0],
                msg: args.slice(1) as InternalInput<C, K>["msg"],
            }
            return chrome.runtime.sendMessage<InternalInput<C,K>,Output<C,K>>(internal);
        }
    };

    return { onMessage, sendMessage };
}

