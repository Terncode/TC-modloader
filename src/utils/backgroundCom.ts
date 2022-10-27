import { BackgroundMessage, ContentBackgroundMessage } from "../background/backgroundEventInterface";
import { TC_Dialog } from "./Dialogs";
import { Logger } from "./logger";
import { attachDebugMethod, handleError, objectifyError } from "./utils";
import { TCEventEmitter } from "./eventEmitter";
import { Injector } from "../contents/injector";
import { TC_Toaster } from "./Toaster";
import runtime from "../browserCompatibility/browserRuntime";
import { BrowserMessageSender } from "../browserCompatibility/browserInterfaces";

type EventType = Exclude<ContentBackgroundMessage["type"], "ping" | "show-alert" | "show-prompt" | "show-confirm">
export declare interface BackgroundMessageHandler {
    on(event: EventType, listener: (data: Readonly<ContentBackgroundMessage["data"]>, cb: (data: any, error?: Error) => void) => void): this;
    off(event: EventType, listener: (data: Readonly<ContentBackgroundMessage["data"]>) => void): this;
    emit(event: EventType, data: ContentBackgroundMessage["data"]): void;
    emitReturn(event: EventType, data: ContentBackgroundMessage["data"], sendResponse: (data?: any, error?: Error) => void): boolean[];
}
type Fn = (...args: any[]) => void;
export class BackgroundMessageHandler extends TCEventEmitter {

    private queue: Fn[] = [];

    constructor() {
        super();
        runtime.onMessage(this.processMessage);
        if(document.readyState !== "complete") {
            window.addEventListener("load", this.onLoad);
        }
        attachDebugMethod("bmhh", this);
    }
    // destroy() {
    //     runtime.offMessage(this.processMessage);
    // }
    private onLoad = () => {
        while(this.queue.length) {
            const fn = this.queue.shift();
            fn();
        }
        window.removeEventListener("load", this.onLoad);
    };

    private executeOnDocReady(fn: Fn) {
        if(document.readyState === "complete") {
            fn();
        } else {
            this.queue.push(fn);
        }
    }

    private processMessage =  (request: ContentBackgroundMessage, sender: BrowserMessageSender, sendResponse: (response?: any) => void) => {
        Logger.debug(request, sender);
        if (runtime.getId() === sender.id) {
            switch (request.type) {
                case "ping":
                    sendResponse(true);
                    return;
                case "show-alert":
                    this.executeOnDocReady(() => TC_Dialog.alert(request.data));
                    return false;
                case "show-prompt":
                    this.executeOnDocReady(() => TC_Dialog.prompt(request.data).then(sendResponse));
                    return true;
                case "show-confirm":
                    this.executeOnDocReady(() => TC_Dialog.confirm(request.data).then(sendResponse));
                    return true;
                case "show-toast": {
                    this.executeOnDocReady(() => TC_Toaster.makeToast(request.data.title, request.data.description, request.data.type)
                        .show(request.data.duration));
                    return false;
                }
                case "inject-content": {
                    this.executeOnDocReady(() => {
                        switch (request.data.type) {
                            case "script":
                                const script = [...document.getElementsByTagName("script")].find(s => s.src === request.data.url);
                                Injector.injectJavascript(request.data.src, script);
                                break;
                            case "stylesheet":
                                const link = [...document.getElementsByTagName("link")].find(l => l.rel === "stylesheet" && l.href === request.data.url);
                                const style = document.createElement("link");
                                style.rel = "stylesheet";
                                style.href = request.data.src;
                                if (link) {
                                    Injector.insetAfter(style, link);
                                } else {
                                    document.head.appendChild(script);
                                }
                                break;
                            default:
                                break;
                        }
                    });
                    break;
                }
                default:
                    const res = this.emitReturn(request.type, request.data, (data, error) => {
                        if(error) {
                            sendResponse(objectifyError(error));
                        } else {
                            sendResponse(data);
                        }
                    });

                    return res.find(e => e === true) || false;
            }
        }
    };

    sendMessage<R = any>(event: BackgroundMessage): Promise<R> {
        return new Promise((resolve,reject) => {
            runtime.sendMessage(event).then((response: R) => {
                const error = handleError(response, false);
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }
}
