/**
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
    onMessage: (
        handlers: {
            [K in keyof C]?: (
                sender: chrome.runtime.MessageSender,
                ...message: Input<C,K>
            ) => Output<C,K> | Promise<Output<C,K>>;
        },
    ) => void;

    sendMessageToTab: <K extends keyof C>(
        tabId: number,
        tag: K,
        ...message: Input<C, K>
    ) => Promise<Output<C, K>>

    sendMessage: <K extends keyof C>(
        type: K,
        ...message: Input<C, K>
    ) => Promise<Output<C, K>>;
}

export const makeMessages = <C extends Contract>(): BetterMessages<C> =>{
    const onMessage = (handlers: {
        [K in keyof C]?: (
            sender: chrome.runtime.MessageSender,
            ...message: Input<C, K>
        ) => Output<C, K> | Promise<Output<C, K>>;
    }): void => {
        chrome.runtime.onMessage.addListener(
            (
                message: AllInternalInputs<C>,
                sender: chrome.runtime.MessageSender,
                sendResponse: (response?: AllInternalOutputs<C>) => void,
            ): boolean => {
                // Find which handler to use for this message
                const handler = handlers[message.tag];
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

    const sendMessageToTab = async <K extends keyof C>(
        tabId: number,
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>> => {
        const internal: InternalInput<C, K> = {
            tag: tag,
            msg: message,
        }
        return chrome.tabs.sendMessage<InternalInput<C,K>,Output<C,K>>(tabId, internal);
    };

    const sendMessage = <K extends keyof C>(
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>> => {
        const internal: InternalInput<C, K> = {
            tag: tag,
            msg: message,
        }
        return chrome.runtime.sendMessage<InternalInput<C,K>,Output<C,K>>(internal);
    };

    return { onMessage, sendMessage, sendMessageToTab };
}

