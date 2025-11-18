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
    ...args: [...Input<C,K>, chrome.runtime.MessageSender]
) => Output<C,K> | Promise<Output<C,K>>


type StrictContract = {
    [category: string]: Contract
}

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => 0 : never) extends (arg: infer I) => 0 ? I : never;

type UniqueKeys<T extends StrictContract> = keyof T[keyof T] extends never ? [] : [never, "Error: Names of methods (sub-keys) in a StrictContract must be unique across the entire contract"]
type Uniqueify<T extends StrictContract> = keyof T[keyof T] extends never ? T : never

type ExtractIndividualYProps<T extends StrictContract> = {
    [X in keyof T]: {
        [Y in keyof T[X]]: {
            [K in Y]: T[X][Y]
        }
    }[keyof T[X]]
}[keyof T]
type FlattenIntersection<T> = {
  [K in keyof T]: T[K];
};
type Flatten<T extends StrictContract> =
    FlattenIntersection<UnionToIntersection<ExtractIndividualYProps<T>>> extends Contract
    ? FlattenIntersection<UnionToIntersection<ExtractIndividualYProps<T>>>
    : never


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
export const makeMessages = <C extends Record<any, (...args: any[]) => any>>(): {
    onMessage<K extends keyof C>(
        this: void,
        tag: K,
        handler: (
            ...args: [...Input<C,K>, chrome.runtime.MessageSender]
        ) => Output<C,K> | Promise<Output<C,K>>,
    ): void
    onMessage(
        this: void,
        handlers: {
            [K in keyof C]?: (
                ...args: [...Input<C,K>, chrome.runtime.MessageSender]
            ) => Output<C,K> | Promise<Output<C,K>>;
        },
    ): void;

    sendMessage<K extends keyof C>(
        this: void,
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>;
    sendMessage<K extends keyof C>(
        this: void,
        tabId: number,
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>
    sendMessage<K extends keyof C>(
        this: void,
        tabAndFrameId: {
            tabId: number,
            frameId: number,
        },
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>
} => {
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

                const result = handler(...[...message.msg, sender] as [...Parameters<C[K]>, chrome.runtime.MessageSender]);
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


export const makeStrictMessages = <S extends StrictContract>(..._args: UniqueKeys<S>): {
    onMessage<G extends keyof S, C extends S[G] = S[G]>(
        this: void,
        handlers: {
            [K in keyof C]: (
                ...args: [...Input<C,K>, chrome.runtime.MessageSender]
            ) => Output<C,K> | Promise<Output<C,K>>;
        },
    ): void;

    createMessage<G extends keyof S, C extends S[G] = S[G]>(
        this: void,
        tabAndFrameId: {
            tabId: number,
            frameId: number,
        }
    ): {
        [K in keyof C]: (...message: Input<C,K>) => Promise<Output<C,K>>
    }
    createMessage<G extends keyof S, C extends S[G] = S[G]>(
        this: void,
        tabId: number,
    ): {
        [K in keyof C]: (...message: Input<C,K>) => Promise<Output<C,K>>
    }
    createMessage<G extends keyof S, C extends S[G] = S[G]>(this: void): {
         [K in keyof C]: (...message: Input<C,K>) => Promise<Output<C,K>>
     }

    sendMessage<C extends Flatten<Uniqueify<S>>, K extends keyof C>(
        this: void,
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>;
    sendMessage<C extends Flatten<Uniqueify<S>>, K extends keyof C>(
        this: void,
        tabId: number,
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>
    sendMessage<C extends Flatten<Uniqueify<S>>, K extends keyof C>(
        this: void,
        tabAndFrameId: {
            tabId: number,
            frameId: number,
        },
        tag: K,
        ...message: Input<C, K>
    ): Promise<Output<C, K>>
} => {
    const onMessage = <
    G extends keyof S,
    K extends keyof C,
    C extends S[G] = S[G],
    >(
        ...args: [handlers: { [K in keyof C]: Handler<C, K> }]
    ): void => {
        chrome.runtime.onMessage.addListener(
            (
                message: AllInternalInputs<C>,
                sender: chrome.runtime.MessageSender,
                sendResponse: (response?: AllInternalOutputs<C>) => void,
            ): boolean => {
                let handler: Handler<C,K> | undefined;
                const handlers: {
                    [K in keyof C]: Handler<C,K>
                } = args[0] as {
                    [K in keyof C]: Handler<C,K>
                };
                handler = handlers[message.tag];
                if (!handler) return false

                const result = handler(...[...message.msg, sender] as [...Parameters<C[K]>, chrome.runtime.MessageSender]);
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

    const sendMessage = <C extends Flatten<Uniqueify<S>>, K extends keyof C>(...args:
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

    const createMessage = <G extends keyof S, C extends S[G] = S[G]>(...args:
        | []
        | [tabId: number]
        | [tabAndFrameId: {
            tabId: number,
            frameId: number,
        }]
    ) => {
        // Since the original contract is not available at runtime, a real
        // object using its keys is impossible to construct. We simply fake the
        // object using a proxy object and type assertions. Once a property is
        // accessed on the object (which will be checked by typescript), all
        // the necessary information to construct the message is available at
        // runtime.
        const proxy = new Proxy(
            {} as C,
            {
                get: <K extends keyof C>(_target: C, tag: K, _receiver: unknown) => {
                    return (...message: Input<C,K>) => {
                        // Save space by delegating to the previous overloads. Indexing into the
                        // strict contract vs flattening makes typescript angry, requiring the
                        // type assertion. It is safe, however, since the type pre-assertion is
                        // actually stricter.
                        return sendMessage(...args, tag, ...message as Parameters<Flatten<Uniqueify<S>>[K]>);
                    }
                },
            },
        );
        return proxy as { [K in keyof C]: (...message: Parameters<C[K]>) => Promise<ReturnType<C[K]>> };
    }


    return { onMessage, createMessage, sendMessage };
}

type InternalCustom<
    C extends Contract,
    K extends keyof C,
> = {
    tag: K
    namespace: string
    id: string
} & ({
    msg: Parameters<C[K]>
    response: false
} | {
    msg: ReturnType<C[K]>
    response: true
})

type AllInternalCustom <C extends Contract> = {
    [K in keyof C]: InternalCustom<C,K>
}[keyof C]

type CustomArgs = {
    listen: (listener: (data: any) => Promise<any>) => void,
    unlisten: (listener: (data: any) => Promise<any>) => void,
    send: (data: any) => void,
    namespace: string,
}

interface CustomMessages<C extends Contract>{
    onMessage<K extends keyof C>(
        this: void,
        tag: K,
        handler: (
            ...args: Parameters<C[K]>
        ) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>,
    ): void
    onMessage(
        this: void,
        handlers: {
            [K in keyof C]?: (
                ...args: Parameters<C[K]>
            ) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>
        },
    ): void;

    sendMessage<K extends keyof C>(
        this: void,
        tag: K,
        ...message: Parameters<C[K]>
    ): Promise<ReturnType<C[K]>>;
}

export const makeCustomInternal = <C extends Record<any, (...args: any[]) => any>>(
    listen: (listener: (data: any) => Promise<any>) => void,
    unlisten: (listener: (data: any) => Promise<any>) => void,
    send: (data: any) => void,
    namespace: string,
): CustomMessages<C> => {
    const onMessage = <K extends keyof C>(...args: 
        | [handlers: { [K in keyof C]?: (...args: Input<C,K>) => Output<C,K> | Promise<Output<C,K>> }]
        | [tag: K, handler: (...args: Input<C,K>) => Output<C,K> | Promise<Output<C,K>> ]
    ): void => {
        listen(async (message: AllInternalCustom<C>) => {
            if (message.response || message.namespace !== namespace) return;
            let handler: ((...args: Input<C,K>) => Output<C,K> | Promise<Output<C,K>>) | undefined;
            if (typeof args[0] === "string" && args[0] === message.tag) {
                handler = args[1];
            } else {
                const handlers: {
                    [K in keyof C]?: (...args: Input<C,K>) => Output<C,K> | Promise<Output<C,K>>
                } = args[0] as {
                        [K in keyof C]?: (...args: Input<C,K>) => Output<C,K> | Promise<Output<C,K>>
                    };
                handler = handlers[message.tag];
            }
            if (!handler) throw new Error("Unrecognized message"); 
            const result = handler(...message.msg);
            send({
                tag: message.tag,
                msg: result,
                id: message.id,
                response: true,
            });
        });
    };

    const sendMessage = async <K extends keyof C>(
        tag: K,
        ...message: Input<C,K>
    ): Promise<Output<C, K>> => {
        const internal: InternalCustom<C, K> = {
            tag: tag,
            namespace: namespace,
            id: Date.now() + Math.floor(Math.random() * 1000) + "",
            msg: message,
            response: false,
        };
        return new Promise((resolve) => {
            const listener = async (data: AllInternalCustom<C>) => {
                if (data.tag === tag && data.id === internal.id && data.response) {
                    unlisten(listener);
                    resolve(data.msg);
                }
            }
            listen(listener);
            send(internal);
        });
    };

    return { onMessage, sendMessage };
}

//export const makeCustomBroken: {
//    // Returns an object with onMessage and sendMessage
//    <C extends Record<any, (...args: any[]) => any>>(config: CustomArgs): CustomMessages<C>
//
//    // Returns a function that then takes the config arguments and itself returns
//    // the object with onMessage and sendMessage
//    <C extends Record<any, (...args: any[]) => any>>(): (config: CustomArgs) => CustomMessages<C>
//} = <C extends Record<any, (...args: any[]) => any>>(
//    ...args: [] | [config: CustomArgs]
//): CustomMessages<C> | ((config: CustomArgs) => CustomMessages<C>) => {
//    if (args[0]) {
//        const { listen, unlisten, send, namespace } = args[0];
//        return makeCustomInternal<C>(listen, unlisten, send, namespace);
//    } else {
//        return (config: CustomArgs) => {
//            const { listen, unlisten, send, namespace } = config;
//            return makeCustomInternal<C>(listen, unlisten, send, namespace);
//        }
//    }
//}

export function makeCustom<C extends Record<any, (...args: any[]) => any>>(
    config: CustomArgs,
): CustomMessages<C>;
export function makeCustom<C extends Record<any, (...args: any[]) => any>>(): (
    config: CustomArgs,
) => CustomMessages<C>;
export function makeCustom<C extends Record<any, (...args: any[]) => any>>(
    ...args: [config: CustomArgs] | []
): CustomMessages<C> | ((config: CustomArgs) => CustomMessages<C>) {
    if (args.length === 1) {
        const { listen, unlisten, send, namespace } = args[0];
        return makeCustomInternal<C>(listen, unlisten, send, namespace);
    } else {
        // This is the function returned by the second overload
        return (config: CustomArgs) => {
            const { listen, unlisten, send, namespace } = config;
            return makeCustomInternal<C>(listen, unlisten, send, namespace);
        };
    }
}

export const makeCustomFactory: <C extends Record<any, (...args: any[]) => any>>() => (
    listen: (listener: (data: any) => Promise<any>) => void,
    unlisten: (listener: (data: any) => Promise<any>) => void,
    send: (data: any) => void,
    namespace: string,
) => {
    onMessage<K extends keyof C>(
        this: void,
        tag: K,
        handler: (
            ...args: Parameters<C[K]>
        ) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>,
    ): void
    onMessage(
        this: void,
        handlers: {
            [K in keyof C]?: (
                ...args: Parameters<C[K]>
            ) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>
        },
    ): void;

    sendMessage<K extends keyof C>(
        this: void,
        tag: K,
        ...message: Parameters<C[K]>
    ): Promise<ReturnType<C[K]>>;
} = <C extends Record<any, (...args: any[]) => any>>() => (
    listen: (listener: (data: any) => Promise<any>) => void,
    unlisten: (listener: (data: any) => Promise<any>) => void,
    send: (data: any) => void,
    namespace: string,
) => {
    return makeCustom<C>({ listen, unlisten, send, namespace });
}

export const makeCustomStrict = <S extends StrictContract>(
    listen: (listener: (data: any) => Promise<any>) => void,
    unlisten: (listener: (data: any) => Promise<any>) => void,
    send: (data: any) => void,
    namespace: string,
    ..._validStrictContract: UniqueKeys<S>
): {
    onMessage<G extends keyof S, C extends S[G] = S[G]>(
        this: void,
        handlers: {
            [K in keyof C]?: (
                ...args: Parameters<C[K]>
            ) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>
        },
    ): void;

    sendMessage<C extends Flatten<Uniqueify<S>>, K extends keyof C>(
        this: void,
        tag: K,
        ...message: Parameters<C[K]>
    ): Promise<ReturnType<C[K]>>;

    createMessage<G extends keyof S, C extends S[G] = S[G]>(this: void): {
         [K in keyof C]: (...message: Input<C,K>) => Promise<Output<C,K>>
     }
} => {
    const onMessage = <G extends keyof S, K extends keyof C, C extends S[G] = S[G]>(handlers: { 
        [K in keyof C]: (...args: Input<C,K>) => Output<C,K> | Promise<Output<C,K>>
    }): void => {
        listen(async (message: AllInternalCustom<C>) => {
            if (message.response || message.namespace !== namespace) return;
            let handler: ((...args: Input<C,K>) => Output<C,K> | Promise<Output<C,K>>) | undefined;
            handler = handlers[message.tag];
            if (!handler) throw new Error("Unrecognized message"); 

            const result = handler(...message.msg);
            send({
                tag: message.tag,
                msg: result,
                id: message.id,
                response: true,
            });
        });
    };

    const sendMessage = async <C extends Flatten<Uniqueify<S>>, K extends keyof C>(
        tag: K,
        ...message: Parameters<C[K]>
    ): Promise<ReturnType<C[K]>> => {
        const internal: InternalCustom<C, K> = {
            tag: tag,
            namespace: namespace,
            id: Date.now() + Math.floor(Math.random() * 1000) + "",
            msg: message,
            response: false,
        };
        return new Promise((resolve) => {
            const listener = async (data: AllInternalCustom<C>) => {
                if (data.tag === tag && data.id === internal.id && data.response) {
                    unlisten(listener);
                    resolve(data.msg);
                }
            }
            listen(listener);
            send(internal);
        });
    };

    const createMessage = <G extends keyof S, C extends S[G] = S[G]>() => {
        const proxy = new Proxy(
            {} as C,
            {
                get: <K extends keyof C>(_target: C, tag: K, _receiver: unknown) => {
                    return (...message: Input<C,K>) => {
                        return sendMessage(tag, ...message as Parameters<Flatten<Uniqueify<S>>[K]>);
                    }
                },
            },
        );
        return proxy as { [K in keyof C]: (...message: Parameters<C[K]>) => Promise<ReturnType<C[K]>> };
    }

    return { onMessage, sendMessage, createMessage };
}
