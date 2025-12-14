/**
 * This type defines what types the passed messaging contract can be: Any
 * record where the values are all functions of any type. The keys are used
 * to keep track of what listeners should respond to which messages, the
 * parameter types of the functions are the input schema of the messages, and
 * the return types are the response schema of the messages. If there is no
 * response, the function can be typed as a void return type. Return types of
 * async functions do not need to be explicitly typed as Promise<T>.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Contract = Record<any, (...args: any[]) => any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StrictContract = Record<any, Contract>;

/**
 * Edge case for below two utility types.
 */
type HasOnlyOneProperty<T> = keyof T extends infer K
    ? K extends PropertyKey
        ? [K] extends [keyof T]
            ? keyof T extends K
                ? true
                : false
            : false
        : false
    : false;

/**
 * Used to give nice error messages & create transpile errors to prevent
 * duplicate messages in **StrictContracts**.
 */
type StrictContractValidator<T extends StrictContract> = keyof T[keyof T] extends never
    ? []
    : HasOnlyOneProperty<T> extends true
      ? []
      : [
            never,
            "Error: Names of methods (sub-keys) in a StrictContract must be unique across the entire contract",
        ];
/**
 * Used to ensure `never` types when duplicate messages in **StrictContracts**.
 */
type Uniqueify<T extends StrictContract> = keyof T[keyof T] extends never
    ? T
    : HasOnlyOneProperty<T> extends true
      ? T
      : never;

type ExtractIndividualYProps<S extends StrictContract> = S[keyof S];

type UnionToIntersection<U> = (U extends unknown ? (arg: U) => 0 : never) extends (
    arg: infer I,
) => 0
    ? I
    : never;

type FlattenIntersection<T> = {
    [K in keyof T]: T[K];
};

/**
 * Utilty type to flatten a **StrictContract** into a **Contract** by removing
 * the category keys.
 */
type Flatten<T extends StrictContract> =
    FlattenIntersection<UnionToIntersection<ExtractIndividualYProps<T>>> extends Contract
        ? FlattenIntersection<UnionToIntersection<ExtractIndividualYProps<T>>>
        : never;

/**
 * The type in which the data is wrapped so that it can be reasoned about
 * inside the internal library functions.
 * * tag: the name of the method
 * * namespace: is to prevent multiple instances from colliding
 * * id: is to ensure that messages of the same tag do not collide
 * * msg: the data itself
 * * response: true for the response, false for the sending
 */
type Internal<C extends Contract, K extends keyof C> = {
    tag: K;
    namespace: string;
    id: string;
} & (
    | {
          msg: Parameters<C[K]>;
          response: false;
      }
    | {
          msg: ReturnType<C[K]>;
          response: true;
      }
);

/**
 * The type of all possible messages that a listener may receive, which is the
 * internal input types for every possible method in the contract.
 */
type AllInternal<C extends Contract> = {
    [K in keyof C]: Internal<C, K>;
}[keyof C];

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * This type is for simple adapters.
 * * The "listen" key takes in an unknown listener function and attaches it to
 *   the underlying message API. A cleanup function is returned that will be
 *   called by `better-messages` to remove the listener.
 * * The "send" key takes in an arbitrary data parameter and dispatches it to
 *   the underlying message API.
 * * The "namespace" key is an optional tag that will be attached to every
 *   piece of data sent, preventing multiple instances of `makeMessages` from
 *   colliding while using the same underlying message API.
 */
export type NormalAdapter = {
    listen: (listener: (data: any) => void) => () => void;
    send: (data: any) => void;
    namespace?: string;
};

/**
 * Same as the `NormalAdapter` type except an additional optional parameter for
 * the "send" key that will pass runtime option parameters to be used to alter
 * underlying messaging behavior.
 * For example, this is used in the included browser extension adapter,
 * `makeChromeMessages`, to send messages via the `chrome.runtime` object in
 * some cases and to send to specific tabs via the `chrome.tabs` object in
 * other cases.
 */
export type OptionAdapter<O> = {
    listen: (listener: (data: any) => void) => () => void;
    send: (data: any, option?: O) => void;
    namespace?: string;
};

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Defines the user-defined adapter type that allows `makeMessages` to work
 * with any underlying messaging API. The generic O is for an Options type that
 * allows options passed in at runtime to be interpreted by the adapter to
 * alter the underlying messaging API behavior.
 * If the generic O has been passed, the `OptionsAdapter<O>` is returned, which
 * has an extra optional parameter on the `send` key to take the type O.
 * Otherwise, if there is no passed generic, the default `NormalAdapter` is
 * returned, which does not have the extra option parameter.
 */
export type Adapter<O = undefined> = O extends undefined ? NormalAdapter : OptionAdapter<O>;

/**
 * This is the returned interface when using a Normal Contract and no custom
 * options.
 */
export interface NormalMessages<C extends Contract> {
    onMessage<K extends keyof C>(
        this: void,
        tag: K,
        handler: (...args: Parameters<C[K]>) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>,
    ): void;
    onMessage(
        this: void,
        handlers: {
            [K in keyof C]?: (
                ...args: Parameters<C[K]>
            ) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>;
        },
    ): void;

    sendMessage<K extends keyof C>(
        this: void,
        tag: K,
        ...message: Parameters<C[K]>
    ): Promise<ReturnType<C[K]>>;
}

/**
 * This is the returned interface when using a Normal Contract and custom
 * options, which adds an overload to `sendMessage` for the option.
 */
export interface OptionMessages<C extends Contract, O> {
    onMessage<K extends keyof C>(
        this: void,
        tag: K,
        handler: (...args: Parameters<C[K]>) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>,
    ): void;
    onMessage(
        this: void,
        handlers: {
            [K in keyof C]?: (
                ...args: Parameters<C[K]>
            ) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>;
        },
    ): void;

    sendMessage<K extends keyof C>(
        this: void,
        tag: K,
        ...message: Parameters<C[K]>
    ): Promise<ReturnType<C[K]>>;
    sendMessage<K extends keyof C>(
        this: void,
        options: O,
        tag: K,
        ...message: Parameters<C[K]>
    ): Promise<ReturnType<C[K]>>;
}

/**
 * Generalizes over interfaces with and without the option overload for Normal
 * Contracts.
 */
export type Messages<C extends Contract, O = undefined> = O extends undefined
    ? NormalMessages<C>
    : OptionMessages<C, O>;

/**
 * This is the returned interface when using a Strict Contract and no custom
 * options.
 */
export interface StrictNormalMessages<S extends StrictContract> {
    onMessage<G extends keyof S>(
        this: void,
        handlers: {
            [K in keyof S[G]]: (
                ...args: Parameters<S[G][K]>
            ) => ReturnType<S[G][K]> | Promise<ReturnType<S[G][K]>>;
        },
    ): void;

    sendMessage<K extends keyof Flatten<Uniqueify<S>>>(
        this: void,
        tag: K,
        ...message: Parameters<Flatten<Uniqueify<S>>[K]>
    ): Promise<ReturnType<Flatten<Uniqueify<S>>[K]>>;

    createMessage<G extends keyof S>(
        this: void,
    ): {
        [K in keyof S[G]]: (...message: Parameters<S[G][K]>) => Promise<ReturnType<S[G][K]>>;
    };
}

/**
 * This is the returned interface when using a Strict Contract and custom
 * options, which adds an overload to `sendMessage` and `createMessage` for the
 * option.
 */
export interface StrictOptionMessages<S extends StrictContract, O> {
    onMessage<G extends keyof S>(
        this: void,
        handlers: {
            [K in keyof S[G]]: (
                ...args: Parameters<S[G][K]>
            ) => ReturnType<S[G][K]> | Promise<ReturnType<S[G][K]>>;
        },
    ): void;

    sendMessage<K extends keyof Flatten<Uniqueify<S>>>(
        this: void,
        tag: K,
        ...message: Parameters<Flatten<Uniqueify<S>>[K]>
    ): Promise<ReturnType<Flatten<Uniqueify<S>>[K]>>;
    sendMessage<K extends keyof Flatten<Uniqueify<S>>>(
        this: void,
        options: O,
        tag: K,
        ...message: Parameters<Flatten<Uniqueify<S>>[K]>
    ): Promise<ReturnType<Flatten<Uniqueify<S>>[K]>>;

    createMessage<G extends keyof S>(
        this: void,
    ): {
        [K in keyof S[G]]: (...message: Parameters<S[G][K]>) => Promise<ReturnType<S[G][K]>>;
    };
    createMessage<G extends keyof S>(
        this: void,
        options: O,
    ): {
        [K in keyof S[G]]: (...message: Parameters<S[G][K]>) => Promise<ReturnType<S[G][K]>>;
    };
}

/**
 * Generalizes over interfaces with and without the option overload for Strict
 * Contracts.
 */
export type StrictMessages<S extends StrictContract, O = undefined> = O extends undefined
    ? StrictNormalMessages<S>
    : StrictOptionMessages<S, O>;

/**
 * Generic helper type that takes in a Contract or StrictContract and always
 * returns a flattened object. Used for typing variables that are agnostic
 * over either type of Contract.
 */
type NormalOrStrict<C extends Contract | StrictContract> = C extends Contract
    ? C
    : C extends StrictContract
      ? C[keyof C]
      : never;

/**
 * Defines the type of a user-defined handler for a given message in a Contract
 */
type Handler<C extends Contract, K extends keyof C> = (
    ...args: Parameters<C[K]>
) => ReturnType<C[K]> | Promise<ReturnType<C[K]>>;

const makeMessagesInternal = <C extends Contract | StrictContract, O>({
    listen,
    send,
    namespace: maybeNamespace,
}: Adapter<O>): C extends Contract
    ? Messages<C, O>
    : C extends StrictContract
      ? StrictMessages<C, O>
      : never => {
    type A = NormalOrStrict<C>;
    const namespace = maybeNamespace ?? "default";
    const onMessage = <K extends keyof C>(
        ...args: C extends Contract
            ? [handlers: { [K in keyof C]?: Handler<C, K> }] | [tag: K, handler: Handler<C, K>]
            : C extends StrictContract
              ? [
                    handlers: {
                        [K in keyof C[keyof C]]: Handler<C[keyof C], K>;
                    },
                ]
              : never
    ): void => {
        listen((message: AllInternal<A>) => {
            if (message.response || message.namespace !== namespace) return;
            let handler: Handler<A, K> | undefined;
            if (typeof args[0] === "string" && args[0] === message.tag) {
                handler = args[1];
            } else {
                const handlers: {
                    [K in keyof C]?: Handler<A, K>;
                } = args[0] as {
                    [K in keyof C]?: Handler<A, K>;
                };
                handler = handlers[message.tag];
            }
            if (!handler) return;
            const result = handler(...message.msg);
            if (result instanceof Promise) {
                void result.then((data) => {
                    send({
                        tag: message.tag,
                        msg: data,
                        id: message.id,
                        response: true,
                    });
                });
            } else {
                send({
                    tag: message.tag,
                    msg: result,
                    id: message.id,
                    response: true,
                });
            }
        });
    };

    const sendMessage = async <K extends keyof C>(
        ...args:
            | [option: O, tag: K, ...message: Parameters<A[K]>]
            | [tag: K, ...message: Parameters<A[K]>]
    ): Promise<ReturnType<A[K]>> => {
        let option: O | undefined = undefined;
        let internal: Internal<A, K>;
        let tag: K;
        if (typeof args[0] === "object") {
            option = args[0];
            tag = args[1];
            internal = {
                tag: tag,
                namespace: namespace,
                id: Date.now() + Math.floor(Math.random() * 1000) + "",
                msg: args.slice(2) as Parameters<A[K]>,
                response: false,
            };
        } else {
            tag = args[0] as K;
            internal = {
                tag: tag,
                namespace: namespace,
                id: Date.now() + Math.floor(Math.random() * 1000) + "",
                msg: args.slice(1) as Parameters<A[K]>,
                response: false,
            };
        }
        return new Promise((resolve) => {
            const listener = (data: AllInternal<A>) => {
                if (data.tag === tag && data.id === internal.id && data.response) {
                    unlisten();
                    resolve(data.msg);
                }
            };
            const unlisten = listen(listener);
            send(internal, option);
        });
    };

    const createMessage = <G extends keyof C, S extends C[G] extends Contract ? C[G] : never>(
        option?: O,
    ) => {
        return new Proxy({} as S, {
            get: <K extends keyof S>(_target: S, tag: K, _receiver: unknown) => {
                return (...message: Parameters<A[K]>) => {
                    if (option) return sendMessage(option, tag, ...message);
                    else return sendMessage(tag, ...message);
                };
            },
        });
    };

    return { onMessage, sendMessage, createMessage } as C extends Contract
        ? Messages<C, O>
        : C extends StrictContract
          ? StrictMessages<C, O>
          : never;
};

/**
 * The main, customizable entrypoint for `better-messages`.
 *
 * * The first type parameter is required and takes in either a **Contract** or
 *   a **StrictContract**. The returned messaging object will be of type
 *   `Messages<YourContract, Option>` for a **Contract** or of type
 *   `StrictMessages<YourContract, Option>` for a **StrictContract**. The
 *   `Option` is for advanced usecases, and is the second type parameter below:
 * * The second type parameter is optional and takes in an object type to be
 *   used in the returned Option overloads for `onMessage` and `sendMessage`.
 *
 * Can be called with or without the runtime argument of type `Adapter<O>`
 * (where O is the option type). When called with the adapter, will immediately
 * return the messaging object of `onMessage`, `sendMessage`, and optionally
 * `createMessage` when using a **StrictContract**. When called without the
 * adapter, will return a function that will then take in the adapter and
 * only then return the messaging object. This is used for assymetric protocols
 * where a common contract must first be captured before separate adapters are
 * instantiated for different contexts.
 *
 * For more info: {@link https://github.com/YanisHerne/better-messages}
 */
export function makeMessages<
    C extends Contract | StrictContract,
    O extends object | undefined = undefined,
>(
    adapter: Adapter<O>,
): C extends Contract
    ? Messages<C, O>
    : C extends StrictContract
      ? Uniqueify<C> extends never
          ? never
          : StrictMessages<C, O>
      : never;
export function makeMessages<C extends Contract, O extends object | undefined = undefined>(): (
    adapter: Adapter<O>,
) => Messages<C, O>;
export function makeMessages<C extends StrictContract, O extends object | undefined = undefined>(
    ..._validStrictContract: StrictContractValidator<C>
): Uniqueify<C> extends never ? never : (adapter: Adapter<O>) => StrictMessages<C, O>;
export function makeMessages<
    C extends Contract | StrictContract,
    O extends object | undefined = undefined,
>(
    ...args: C extends Contract
        ? [adapter: Adapter<O>] | []
        : C extends StrictContract
          ?
                | [adapter: Adapter<O>, ..._validStrictContract: StrictContractValidator<C>]
                | [..._validStrictContract: StrictContractValidator<C>]
          : never
):
    | (C extends Contract
          ? Messages<C, O>
          : C extends StrictContract
            ? StrictMessages<C, O>
            : never)
    | ((
          adapter: Adapter<O>,
      ) => C extends Contract
          ? Messages<C, O>
          : C extends StrictContract
            ? StrictMessages<C, O>
            : never) {
    if (args.length === 1) {
        return makeMessagesInternal<C, O>(args[0]);
    } else {
        // This is the function returned by the second overload
        return (adapter: Adapter<O>) => {
            return makeMessagesInternal<C, O>(adapter);
        };
    }
}

export type ChromeOptions = {
    tabId: number;
    frameId?: number;
};

/**
 * The included adapter for Browser Extensions. Uses the `chrome` object under
 * the hood as the messaging API, which should be available in all extension
 * contexts. `sendMessage` and `createMessage` have overloads with a new first
 * parameter that is an object of type
 * ```typescript
 *     export type ChromeOptions = {
 *          tabId: number;
 *          frameId?: number;
 *     };
 * ```
 *  that will allow for sending messages to tabs or frames with
 *  `chrome.tabs.sendMessage`. Otherwise, `chrome.runtime.sendMessage` will be
 *  used.
 *
 */
export function makeChromeMessages<C extends Contract | StrictContract>(
    ..._args: C extends Contract
        ? []
        : C extends StrictContract
          ? StrictContractValidator<C>
          : never
) {
    return makeMessages<C, ChromeOptions>({
        listen: (listener) => {
            chrome.runtime.onMessage.addListener(listener);
            return () => chrome.runtime.onMessage.removeListener(listener);
        },
        send: (data, option) => {
            if (!option) {
                void chrome.runtime.sendMessage(data);
            } else if (option.tabId && !option.frameId) {
                void chrome.tabs.sendMessage(option.tabId, data);
            } else {
                void chrome.tabs.sendMessage(option.tabId, data, { frameId: option.frameId });
            }
        },
    });
}

/**
 * The included adapter for Web Workers. Returns an object with keys "main" and
 * "worker" to be used in their respective contexts.
 * * "worker" is an object with `onMessage`, `sendMessage`, and optionally
 *   `createMessage`that can be immediately used in the Web Worker context.
 * * "main" is a function that takes in a reference to the Web Worker and then
 *   returns an object with `onMessage`, `sendMessage`, and optionally
 *   `createMessage`
 */
export function makeWorkerMessages<C extends Contract | StrictContract>(
    ..._args: C extends StrictContract ? StrictContractValidator<C> : []
) {
    return {
        main: (worker: Worker) =>
            makeMessages<C>({
                listen: (listener) => {
                    const callback = (event: MessageEvent) => {
                        listener(event.data);
                    };
                    worker.addEventListener("message", callback);
                    return () => worker.removeEventListener("message", callback);
                },
                send: (data) => {
                    worker.postMessage(data);
                },
            }),
        worker: makeMessages<C>({
            listen: (listener) => {
                const callback = (event: MessageEvent) => {
                    listener(event.data);
                };
                self.addEventListener("message", callback);
                return () => self.removeEventListener("message", callback);
            },
            send: (data) => {
                self.postMessage(data);
            },
        }),
    };
}
