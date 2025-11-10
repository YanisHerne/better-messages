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
type Contract = Record<any, (...args: any[]) => any>

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

interface BetterMessages<C extends Contract> {
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

type SendMessageArgs<C extends Contract, K extends keyof C> =
    | [tag: K, ...message: Input<C,K>]
    | [tabId: number, tag: K, ...message: Input<C, K>]
    | [
        tabAndFrameId: { tabId: number; frameId: number },
        tag: K,
        ...message: Input<C, K>
    ];

type OnMessageArgs<C extends Contract, K extends keyof C> =
    | [handlers: {
            [K in keyof C]?: (
                sender: chrome.runtime.MessageSender,
                ...message: Input<C, K>
            ) => Output<C, K> | Promise<Output<C, K>>;
        }]
    | [
        tag: K,
        handler: (
            sender: chrome.runtime.MessageSender,
            ...message: Input<C,K>
        ) => Output<C,K> | Promise<Output<C,K>>
        ]

/**
 * Send: Function that takes in a Contract generic and returns a new function
 * that takes in a tag and matching message, and returns a promise of the
 * resulting output type.
 * Receive: Function that takes in a Contract generic and returns a new function
 * that takes in handlers which adhere to the Contract, and then does the 
 * listening for the events which will trigger those handlers..
 */
export const makeMessages = <C extends Contract>(): BetterMessages<C> => {
    const onMessage = <K extends keyof C>(...args: OnMessageArgs<C, K>): void => {
        chrome.runtime.onMessage.addListener(
            (
                message: AllInternalInputs<C>,
                sender: chrome.runtime.MessageSender,
                sendResponse: (response?: AllInternalOutputs<C>) => void,
            ): boolean => {
                let handler: ((
                    sender: chrome.runtime.MessageSender,
                    ...message: Input<C,K>
                ) => Output<C, K> | Promise<Output<C, K>>) | undefined;
                if (typeof args[0] === "string") {
                    handler = args[1] as (
                        sender: chrome.runtime.MessageSender,
                        ...message: Input<C,K>
                    ) => Output<C, K> | Promise<Output<C, K>>;
                } else {
                    // Find which handler to use for this message
                    const handlers: {
                        [K in keyof C]?: (
                            sender: chrome.runtime.MessageSender,
                            ...message: Input<C, K>
                        ) => Output<C, K> | Promise<Output<C, K>>;
                    } = args[0] as {
                        [K in keyof C]?: (
                            sender: chrome.runtime.MessageSender,
                            ...message: Input<C, K>
                        ) => Output<C, K> | Promise<Output<C, K>>;
                    }
                    handler = handlers[message.tag];
                }
                if (!handler) return false

                const result = handler(sender, ...message.msg);
                if (result instanceof Promise) {
                    void result.then(sendResponse);
                    return true;
                } else {
                    sendResponse(result);
                    return false;
                }
            },
        );
    };

    const sendMessage = <K extends keyof C>(...args: SendMessageArgs<C, K>): Promise<Output<C, K>> => {
        if (typeof args[0] === "number") {
            const internal: InternalInput<C, K> = {
                tag: args[1],
                msg: args.slice(2) as InternalInput<C, K>["msg"],
            }
            return chrome.tabs.sendMessage(args[0], internal);
        } else if (typeof args[0] === "object") {
            const internal: InternalInput<C, K> = {
                tag: args[1],
                msg: args.slice(2) as InternalInput<C, K>["msg"],
            }
            return chrome.tabs.sendMessage(args[0].tabId, internal, { frameId: args[0].frameId });
        } else {
            const internal: InternalInput<C, K> = {
                tag: args[0],
                msg: args.slice(1) as InternalInput<C, K>["msg"],
            }
            return chrome.runtime.sendMessage<InternalInput<C,K>,Output<C,K>>(internal);
        }
    };

    return { onMessage, sendMessage };
}
