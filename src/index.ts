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
export type Contract = Record<any, (...args: any[]) => any>;

type StrictContract = {
    [category: string]: Contract;
};

type HasOnlyOneProperty<T> = keyof T extends infer K
    ? K extends PropertyKey
        ? [K] extends [keyof T]
            ? keyof T extends K
                ? true
                : false
            : false
        : false
    : false;

type UniqueKeys<T extends StrictContract> = keyof T[keyof T] extends never
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

type ExtractIndividualYProps<T extends StrictContract> = {
    [X in keyof T]: {
        [Y in keyof T[X]]: {
            [K in Y]: T[X][Y];
        };
    }[keyof T[X]];
}[keyof T];
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
type InternalCustom<C extends Contract, K extends keyof C> = {
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
type AllInternalCustom<C extends Contract> = {
    [K in keyof C]: InternalCustom<C, K>;
}[keyof C];

/* eslint-disable @typescript-eslint/no-explicit-any */

type CustomConfigNormal = {
    listen: (listener: (data: any) => void) => () => void;
    send: (data: any) => void;
    namespace?: string;
};

type CustomConfigOption<O> = {
    listen: (listener: (data: any) => void) => () => void;
    send: (data: any, option?: O) => void;
    namespace?: string;
};

/* eslint-enable @typescript-eslint/no-explicit-any */

export type CustomConfig<O = undefined> = O extends undefined
    ? CustomConfigNormal
    : CustomConfigOption<O>;

export interface CustomMessagesNormal<C extends Contract> {
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

export interface CustomMessagesOption<C extends Contract, O> {
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

export type CustomMessages<C extends Contract, O = undefined> = O extends undefined
    ? CustomMessagesNormal<C>
    : CustomMessagesOption<C, O>;

export interface CustomStrictMessagesNormal<S extends StrictContract> {
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
export interface CustomStrictMessagesOption<S extends StrictContract, O> {
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

export type CustomStrictMessages<S extends StrictContract, O = undefined> = O extends undefined
    ? CustomStrictMessagesNormal<S>
    : CustomStrictMessagesOption<S, O>;

type NormalOrStrict<C extends Contract | StrictContract> = C extends Contract
    ? C
    : C extends StrictContract
      ? C[keyof C]
      : never;

type CustomHandler<
    C extends Contract | StrictContract,
    K extends keyof C,
    S extends NormalOrStrict<C> = NormalOrStrict<C>,
> = (...args: Parameters<S[K]>) => ReturnType<S[K]> | Promise<ReturnType<S[K]>>;

const makeCustomInternal = <C extends Contract | StrictContract, O>({
    listen,
    send,
    namespace: maybeNamespace,
}: CustomConfig<O>): C extends Contract
    ? CustomMessages<C, O>
    : C extends StrictContract
      ? CustomStrictMessages<C, O>
      : never => {
    const namespace = maybeNamespace ?? "default";
    const onMessage = <K extends keyof C>(
        ...args: C extends Contract
            ?
                  | [handlers: { [K in keyof C]?: CustomHandler<C, K> }]
                  | [tag: K, handler: CustomHandler<C, K>]
            : C extends StrictContract
              ? [
                    handlers: {
                        [K in keyof C[keyof C]]: CustomHandler<C[keyof C], K>;
                    },
                ]
              : never
    ): void => {
        listen((message: AllInternalCustom<NormalOrStrict<C>>) => {
            if (message.response || message.namespace !== namespace) return;
            let handler: CustomHandler<C, K> | undefined;
            if (typeof args[0] === "string" && args[0] === message.tag) {
                handler = args[1];
            } else {
                const handlers: {
                    [K in keyof C]?: CustomHandler<C, K>;
                } = args[0] as {
                    [K in keyof C]?: CustomHandler<C, K>;
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
            | [option: O, tag: K, ...message: Parameters<NormalOrStrict<C>[K]>]
            | [tag: K, ...message: Parameters<NormalOrStrict<C>[K]>]
    ): Promise<ReturnType<NormalOrStrict<C>[K]>> => {
        let option: O | undefined = undefined;
        let internal: InternalCustom<NormalOrStrict<C>, K>;
        let tag: K;
        if (typeof args[0] === "object") {
            option = args[0];
            tag = args[1];
            internal = {
                tag: tag,
                namespace: namespace,
                id: Date.now() + Math.floor(Math.random() * 1000) + "",
                msg: args.slice(2) as Parameters<NormalOrStrict<C>[K]>,
                response: false,
            };
        } else {
            tag = args[0] as K;
            internal = {
                tag: tag,
                namespace: namespace,
                id: Date.now() + Math.floor(Math.random() * 1000) + "",
                msg: args.slice(1) as Parameters<NormalOrStrict<C>[K]>,
                response: false,
            };
        }
        return new Promise((resolve) => {
            const listener = (data: AllInternalCustom<NormalOrStrict<C>>) => {
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
                return (...message: Parameters<NormalOrStrict<C>[K]>) => {
                    if (option) return sendMessage(option, tag, ...message);
                    else return sendMessage(tag, ...message);
                };
            },
        });
    };

    return { onMessage, sendMessage, createMessage } as C extends Contract
        ? CustomMessages<C, O>
        : C extends StrictContract
          ? CustomStrictMessages<C, O>
          : never;
};

export function makeCustom<C extends Contract, O = undefined>(
    config: CustomConfig<O>,
): CustomMessages<C, O>;
export function makeCustom<C extends Contract, O = undefined>(): (
    config: CustomConfig<O>,
) => CustomMessages<C, O>;
export function makeCustom<S extends StrictContract, O = undefined>(
    config: CustomConfig<O>,
    ..._validStrictContract: ["override"] | UniqueKeys<S>
): CustomStrictMessages<S, O>;
export function makeCustom<S extends StrictContract, O = undefined>(
    ..._validStrictContract: ["override"] | UniqueKeys<S>
): (config: CustomConfig<O>) => CustomStrictMessages<S, O>;
export function makeCustom<C extends Contract | StrictContract, O = undefined>(
    ...args: C extends Contract
        ? [config: CustomConfig<O>] | []
        : C extends StrictContract
          ?
                | [config: CustomConfig<O>, ..._validStrictContract: ["override"] | UniqueKeys<C>]
                | [..._validStrictContract: ["override"] | UniqueKeys<C>]
          : never
):
    | (C extends Contract
          ? CustomMessages<C, O>
          : C extends StrictContract
            ? CustomStrictMessages<C, O>
            : never)
    | ((
          config: CustomConfig<O>,
      ) => C extends Contract
          ? CustomMessages<C, O>
          : C extends StrictContract
            ? CustomStrictMessages<C, O>
            : never) {
    if (args.length === 1) {
        return makeCustomInternal<C, O>(args[0] as CustomConfig<O>);
    } else {
        // This is the function returned by the second overload
        return (config: CustomConfig<O>) => {
            return makeCustomInternal<C, O>(config);
        };
    }
}

type ChromeOptions = {
    tabId: number;
    frameId?: number;
};

export function makeChromeMessages<C extends Contract>(): CustomMessages<C, ChromeOptions>;
export function makeChromeMessages<C extends StrictContract>(
    ...args: UniqueKeys<C>
): CustomStrictMessages<C, ChromeOptions>
export function makeChromeMessages<C extends Contract | StrictContract>(
    ..._args: C extends Contract ? [] : C extends StrictContract ? UniqueKeys<C> : never
) {
    return makeCustomInternal<C, ChromeOptions>({
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

export function makeWorkerMessages<C extends Contract>(): {
    main: (worker: Worker) => CustomMessages<C, ChromeOptions>;
    worker: CustomMessages<C, ChromeOptions>;
};
export function makeWorkerMessages<C extends StrictContract>(
    ...args: UniqueKeys<C>
): {
    main: (worker: Worker) => CustomStrictMessages<C, ChromeOptions>;
    worker: CustomStrictMessages<C, ChromeOptions>;
};
export function makeWorkerMessages<C extends Contract | StrictContract>(
    ..._args: C extends StrictContract ? UniqueKeys<C> : []
) {
    return {
        main: (worker: Worker) =>
            makeCustomInternal<C, ChromeOptions>({
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
        worker: makeCustomInternal<C, ChromeOptions>({
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
