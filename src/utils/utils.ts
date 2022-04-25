import { clamp, random } from "lodash";
import { ObjectedError, OriginSettings, StealthMode } from "../interfaces";
import { Logger } from "./logger";
import { TC_Dialog } from "./Dialogs";
import { ModMeta, ModMetaCode, ModMetaCompiledVM } from "../modUtils/modInterfaces";

export function removeLastChar(string: string, lastCar: string) {
    return string.endsWith(lastCar) ? string.substring(0, string.length - 1) : string;
}

export function dataClone<O = any>(obj: O): O {
    return JSON.parse(JSON.stringify(obj));
}

export function pushUniq<T>(array: T[], item: T) {
    const index = array.indexOf(item);

    if (index === -1) {
        array.push(item);
        return array.length;
    } else {
        return index + 1;
    }
}

export function removeItem<T>(items: T[], item: T): boolean {
    const index = items.indexOf(item);

    if (index !== -1) {
        items.splice(index, 1);
        return true;
    } else {
        return false;
    }
}

export function getOrigin(link: string) {
    try {
        const url = new URL(link);
        return url.origin;
    } catch (error) {
        Logger.error(error, link);
    }
    return null;
}

export function objectifyError(error: Error, additionalData?: any): ObjectedError {
    return {
        message: error.message,
        stack: error.stack,
        data: additionalData
    };
}

class ExtendedError extends Error {
    public data: string;
    constructor(message: string, stack?: string, data?: any){
        super(message);
        this.stack = stack;
        this.data = data;
    }
}

export function handleError(obj: any, shouldThrow = true): Error | undefined {
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        if(obj.message && obj.stack) {
            const error = new ExtendedError(obj.message, obj.stack, obj.data);
            error.stack = obj.stack;
            if (shouldThrow) {
                if (obj.data){
                    console.log(obj.data);
                }
                throw error;
            }
            return error;
        }
    }
}

const decoratorStart = "_tc";
export const createDecorator = (text = "content", randomify = true) =>  `${decoratorStart}${text}${randomify ? random(10, 99) : ""}`;
export function decorateElement(element: HTMLElement, customDecorator?: string) {
    if (customDecorator) {
        if (!element.hasAttribute(customDecorator)) {
            element.setAttribute(customDecorator, "");
        }
    } else {
        customDecorator = createDecorator();
    }
    const attribute = [...element.attributes].find(a => a.name.startsWith(decoratorStart));
    if (!attribute) {
        element.setAttribute(customDecorator, "");
    }
}

export function d() {
    return document;
}


export function appendIfDoesNotExist(element: HTMLElement, appendTo: HTMLElement) {
    if (!d().contains(element)) {
        appendTo.appendChild(element);
    }
}
export function removeFromDom(element: HTMLElement) {
    const parent = element.parentElement;
    if (parent) {
        parent.removeChild(element);
    }
}

export function removeAllChildren(element: HTMLElement) {
    while (element.children.length) {
        const child = element.children[0];
        const parent = child.parentElement;
        parent.removeChild(child);
    }
}

export function writeClipboard(text: string) {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    el.style.bottom = "-9999px";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    const result = document.execCommand("copy");
    document.body.removeChild(el);
    return result;
}


export function delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}


export function attachDebugMethod(name: string, data: any) {
    if (DEV) {
        Logger.debug("attachDebugMethod", `${name} has been bound to window`);
        (window as any)[name] = data;
    }
}

export function hashString(payload: string) {
    let hash = 0;
    if (payload.length === 0) {
        return hash;
    }
    for (let i = 0; i < payload.length; i++) {
        const char = payload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

export async function askToRefresh(message: string) {
    const yes = await TC_Dialog.confirm(message);
    if (yes) {
        location.reload();
    }
}

export function checkRegOrString(searcher: RegExp | string, origin: string) {
    if (typeof searcher === "string") {
        if (searcher === "*") {
            return true;
        } else {
            return origin.includes(searcher);
        }
    } else {
        return searcher.test(origin);
    }
}

export function timeOutPromise<T = any>(fn: () => T | Promise<T>, timeout = 1000 * 5) {
    return new Promise<T>((resolve, reject) => {
        let t = setTimeout(() => {
            reject(new Error(`${fn.name} Timedout`));
        }, timeout);

        const killTimer = () => {
            clearTimeout(t);
            t = undefined;
        };

        try {
            const promise = fn();
            if(promise instanceof Promise) {
                promise.then(result => {
                    killTimer();
                    resolve(result);
                }).catch(err => {
                    killTimer();
                    reject(err);
                });
            } else {
                killTimer();
                resolve(promise);
            }
        } catch (error) {
            reject(error);
        } finally {
            killTimer();
        }
    });
}


export async function tryCatch(fn: () => void, caught?: (data: any) => void) {
    try {
        const result = await timeOutPromise(fn);
        return result;
    } catch (error) {
        if (caught) {
            caught(error);
        }
    }
}

function lastIndex(array: any[]) {
    return clamp(array.length - 1, 0, Number.MAX_SAFE_INTEGER);
}

export function randomString(length = 8) {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let str = "";
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;
};

export function sortMods<M extends ModMeta>(mods: M[]) {
    if (!mods.length) {
        return [...mods];
    }
    const sorted = [...mods].sort((a, b) => a.priority < b.priority ? 1 : -1);
    const groups: M[][] = [];
    for (let i = 0; i < sorted.length; i++) {
        const target = sorted[i];
        let lastGroup = groups[lastIndex(groups)];
        if (!lastGroup) {
            lastGroup = [];
            groups.push(lastGroup);
        }

        let lastItem = lastGroup[lastIndex(lastGroup)];
        if (lastItem) {
            if (lastItem.priority ===  target.priority) {
                lastGroup.push(target);
            } else {
                groups.push([target]);
            }
        } else {
            lastGroup.push(target);
        }
    }

    const modBuilder: M[] = [];
    for (const group of groups) {
        group.sort((a, b) => {
            const aa = a.requirements?.length;
            const ab = b.requirements?.length;
            const aaIsUn = typeof aa === "undefined";
            const abIsUn = typeof ab === "undefined";
            if (!aaIsUn && !abIsUn) {
                return aa < ab ? 1 : -1;
            } else if (!aaIsUn && abIsUn) {
                return 1;
            } else {
                return -1;
            }
        });
        for (const item of group) {
            modBuilder.push(item);
        }
    }
    return modBuilder;
}


export function isStealthMode(settings?: OriginSettings) {
    if (settings?.stealthMode !== StealthMode.Strict) {
        return false;
    }
    return true;
}

export function vmModToModCode(vmMod: ModMetaCompiledVM): ModMetaCode {
    return {
        code: vmMod.context.rawCode,
        description: vmMod.description,
        hash: vmMod.hash,
        name: vmMod.name,
        flags: vmMod.flags,
        version: vmMod.version,
        origins: vmMod.origins,
        priority: vmMod.priority || 0,
        dev: vmMod.dev,
    };
}
