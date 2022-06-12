import { TC_MESSAGE_KEY } from "../constants";
import { IDGenerator } from "./IdGen";
import { EventPromise, EventPromisePending } from "../interfaces";
import { TCEventEmitter } from "./eventEmitter";
import { Logger } from "./logger";

import { handleError, objectifyError } from "./utils";
import { EncodeDecoder } from "./coderEncoder";

export interface TCBaseEvent {
    type: string,
    data?: any;
}

export interface TCEvent extends TCBaseEvent {
    promise?: EventPromise;
}
export interface SignedTCEvent extends TCEvent {
    signature: number;
}

export class EventHandler<E = TCBaseEvent, R = TCBaseEvent> extends TCEventEmitter {
    private readonly PROMISE_TIMEOUT = 1000 * 30;
    private idGenerator: IDGenerator;
    private sentPromises = new Map<number, { resolve: (result: any) => void, reject: (reason: any) => void, timeout?: NodeJS.Timeout }>();
    protected eventElement: HTMLElement;
    protected generatedId = TC_MESSAGE_KEY;
    protected encoder: EncodeDecoder;


    constructor(id: {min: number, max: number}, private signature: number, generatedId: string, key: string) {
        super();
        this.eventElement = document.body;
        this.idGenerator = new IDGenerator(id.min, id.max);
        this.generatedId = generatedId;
        this.encoder = new EncodeDecoder(key);
    }

    on(event: "onmessage", listener: (data: Readonly<R>) => void)
    on(event: "onpromise", listener: (data: Readonly<R>, cb: (data?: any, error?: Error) => void) => void);
    on(...args: any[]) {
        //@ts-ignore
        super.on(...args);
    }

    off(event: "onmessage", listener: (data: Readonly<R>) => void)
    off(event: "onpromise", listener: (data: Readonly<R>, cb: (data?: any, error?: Error) => void) => void)
    off(...args: any[]) {
        //@ts-ignore
        super.off(...args);
    }

    emit(event: "onmessage", data: Readonly<R>)
    emit(event: "onpromise", data: Readonly<R>, cb: (data?: any, error?: Error) => void)
    emit(...args: any[]) {
        //@ts-ignore
        super.emit(...args);
    }

    onMessage = (event: CustomEvent<SignedTCEvent>) => {
        if (typeof event === "object") {
            if (typeof event.detail === "object" && Array.isArray(event.detail)) {
                const data = this.encoder.decode(event.detail);
                const payload = JSON.parse(data);
                if (payload.type === "init-event") {
                    return;
                }
                if (!Array.isArray(payload)) {
                    if (!payload.signature) {
                        Logger.debug("Missing event signature");
                        return;
                    }
                    if (payload.signature === this.signature) return;
                    if (payload.promise) {
                        if (payload.promise.status !== "pending") {
                            const id = payload.promise.payload.id;
                            const promiseData = this.sentPromises.get(id);
                            if (promiseData) {
                                if (promiseData.timeout) {
                                    clearTimeout(promiseData.timeout);
                                }
                                this.sentPromises.delete(id);
                                this.idGenerator.unuse(id);
                                if (payload.promise.status === "resolved") {
                                    promiseData.resolve(payload.promise.data);
                                } else if (payload.promise.status === "rejected") {
                                    promiseData.reject(handleError(payload.promise.error, false));
                                }
                            } else {
                                Logger.debug("Unresolved data", payload.promise);
                            }
                            return;
                        }
                        const dispatchEvent: Omit<TCEvent, "signature"> = {
                            type: payload.type,
                            promise: {
                                payload: {
                                    id: payload.promise.payload.id,
                                    data: payload.promise.data,
                                },
                                status: "pending"
                            }
                        };
                        let called = false;
                        this.emit("onpromise", {
                            type: payload.type,
                            data: payload.promise.payload.data
                        } as any, (data, error) => {
                            if (called) {
                                throw new Error("promise callback function can only be called once!");
                            }
                            called = true;
                            if (error) {
                                dispatchEvent.promise.error = objectifyError(error);
                                dispatchEvent.promise.status = "rejected";
                            } else {
                                dispatchEvent.promise.data = data;
                                dispatchEvent.promise.status = "resolved";
                            }
                            this._sendMessage(dispatchEvent);
                        });
                    } else {
                        this.emit("onmessage", {
                            type: payload.type,
                            data: payload.data,
                        } as any);
                    }
                }
            }
        }
    };
    sendMessage(event: E) {
        this._sendMessage({
            type: (event as any).type,
            data: (event as any).data,
        });
    }
    sendPromise<R = any>(event: E, timeout = this.PROMISE_TIMEOUT): Promise<R> {
        return new Promise<R>((resolve, reject) => {
            const id = this.idGenerator.next();
            const promise: EventPromisePending<E> ={
                payload: {
                    id,
                    data: (event as any).data,
                },
                status: "pending",
            };
            let promiseTimeout: NodeJS.Timeout;
            if (typeof timeout === "number") {
                promiseTimeout = setTimeout(() => {
                    reject(new Error("Promise timedout"));
                }, this.PROMISE_TIMEOUT);
            }

            this.sentPromises.set(id, {
                reject,resolve, timeout: promiseTimeout
            });

            this._sendMessage({
                type: (event as any).type,
                promise,
            });
        });
    }
    private _sendMessage(detail: TCEvent) {
        const payload = JSON.stringify({
            ...detail,
            signature: this.signature,
        });
        const buffer = this.encoder.encode(payload);
        const event = new CustomEvent<number[]>(this.generatedId ,{cancelable:false, bubbles: false, detail: buffer});
        this.eventElement.dispatchEvent(event);
    }
}
