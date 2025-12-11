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
export type Contract = Record<any, (...args: any[]) => any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StrictContract = Record<any, Contract>;

type HasOnlyOneProperty<T> = keyof T extends infer K
    ? K extends PropertyKey
        ? [K] extends [keyof T]
            ? keyof T extends K
                ? true
                : false
            : false
        : false
    : false;

type StrictContractValidator<T extends StrictContract> = keyof T[keyof T] extends never
    ? []
    : HasOnlyOneProperty<T> extends true
      ? []
      : [
            never,
            "Error: Names of methods (sub-keys) in a StrictContract must be unique across the entire contract",
        ];

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

export type NormalAdapter = {
    listen: (listener: (data: any) => void) => () => void;
    send: (data: any) => void;
    namespace?: string;
};

export type OptionAdapter<O> = {
    listen: (listener: (data: any) => void) => () => void;
    send: (data: any, option?: O) => void;
    namespace?: string;
};

/* eslint-enable @typescript-eslint/no-explicit-any */

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
 *
 */
export function makeMessages<C extends Contract | StrictContract, O = undefined>(
    adapter: Adapter<O>,
): C extends Contract
    ? Messages<C, O>
    : C extends StrictContract
      ? Uniqueify<C> extends never
          ? never
          : StrictMessages<C, O>
      : never;
export function makeMessages<C extends Contract, O = undefined>(): (
    adapter: Adapter<O>,
) => Messages<C, O>;
export function makeMessages<C extends StrictContract, O = undefined>(
    ..._validStrictContract: StrictContractValidator<C>
): Uniqueify<C> extends never ? never : (adapter: Adapter<O>) => StrictMessages<C, O>;
export function makeMessages<C extends Contract | StrictContract, O = undefined>(
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
 * The included adapter for Browser Extensions.
 */
//export function makeChromeMessages<C extends Contract>(): Messages<C, ChromeOptions>;
//export function makeChromeMessages<C extends StrictContract>(
//    ...args: StrictContractValidator<C>
//): Uniqueify<C> extends never ? never : StrictMessages<C, ChromeOptions>;
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
 * The included adapter for Web Workers.
 */
//export function makeWorkerMessages<C extends Contract>(): {
//    main: (worker: Worker) => Messages<C>;
//    worker: Messages<C>;
//};
//export function makeWorkerMessages<C extends StrictContract>(
//    ...args: StrictContractValidator<C>
//): {
//    main: (worker: Worker) => StrictMessages<C>;
//    worker: StrictMessages<C>;
//};
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
