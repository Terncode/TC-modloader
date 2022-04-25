import { BaseMod } from "./BaseMod";
import zlib from "zlib";
import { ModActualStorage, ModMeta, ModMetaCompiled, ModMetaCompiledVM, ModRequirement } from "./modInterfaces";
import { hashString, pushUniq, removeItem } from "../utils/utils";
import { CancelablePromise } from "../utils/CancelablePromise";
import { ModFlags } from "../commonInterface";
import { valid } from "semver";
import { noop } from "lodash";

interface ModContext {
    TC_MOD: typeof BaseMod | undefined;
    [key: string]: any
}

export async  function compileModInContext(code: ArrayBufferLike | string, flags: ModFlags[], storage?: ModActualStorage): Promise<ModMetaCompiled> {

    const decompressedCode = typeof code === "string" ? decodeURIComponent(window.atob(code)) : await decompress(code);
    const context: ModContext = {
        TC_MOD: undefined,
    };

    const raiseMissingPermissions = () => {
        throw new Error("Missing permissions");
    };
    const raiseNotAllowed = () => {
        throw new Error("Not allowed");
    };
    const ErrorClass = class {
        constructor() {
            raiseMissingPermissions();
        }
    };
    let wnd = window;

    if (SCRIPT_TYPE === "background") {
        wnd = {...window};
        if (!flags.includes("requests")) {
            wnd.fetch = raiseMissingPermissions;
            //@ts-ignore
            wnd.XMLHttpRequest = ErrorClass;
        }
        const keys = Object.keys(chrome);
        const fake_chrome_object: any = {};
        for (const key of keys) {
            Object.defineProperty(fake_chrome_object, key, {get() { return raiseNotAllowed(); }});
        }
    
        wnd.chrome = fake_chrome_object;
    }

    const fn = new Function("TC_EXPORT", "window", "globalThis", decompressedCode);

    fn(context, wnd, wnd);
    if (typeof context.TC_MOD !== "function") {
        throw Error("Invalid mod!");
    }
    const details = validateModAndGetModDetails(context.TC_MOD);
    (context.TC_MOD as any).__proto__  = BaseMod;

    return {
        ...details,
        flags,
        storage: bindModStorage(context.TC_MOD, storage),
        mod: context.TC_MOD,
        destroy: noop,
        hash: hashString(decompressedCode),
    };
};

export async function compileModSafe(code: ArrayBufferLike | string, storage?: ModActualStorage): Promise<ModMetaCompiledVM> {
    const decompressedCode = typeof code === "string" ? decodeURIComponent(window.atob(code)) : await decompress(code);
    const context = {
        TC_EXPORT: {
            TC_MOD: undefined,
        }
    };
    // Mods should not access those methods on start up if they do something shady might be going on;
    const forbiddenMethods = ["setTimeout", "setInterval", "requestAnimationFrame"];
    let destroyFn: () => void;
    let cw: ModWindowContext;
    //@ts-ignore
    const data = virtualize(decompressedCode, wnd => {
        const { destroy, customWindow} = createModContext(wnd as any);
        destroyFn = destroy;
        cw = customWindow;
        return customWindow;
    }, context, forbiddenMethods);


    for (const method of forbiddenMethods) { // restore methods
        data.evalContext[method] = window[method];
    }

    if (typeof data.context.TC_EXPORT.TC_MOD !== "function") {
        throw Error("Invalid mod!");
    }
    // Overwriting BaseMod
    data.context.TC_EXPORT.TC_MOD.__proto__ = BaseMod;
    const mod = data.context.TC_EXPORT.TC_MOD as typeof BaseMod;
    const details = validateModAndGetModDetails(mod);

    if (details.flags.includes("requests")) {
        cw.fetch = fetch;
        cw.XMLHttpRequest = XMLHttpRequest;
    } else {
        const getError = () => {
            throw new Error("Missing permissions. Permission \"request\" is required!");
        };
        cw.fetch = getError;
        (cw as any).XMLHttpRequest = getError;
    }

    return {
        ...details,
        mod,
        storage: bindModStorage(context.TC_EXPORT. TC_MOD, storage),
        destroy: destroyFn,
        hash: hashString(decompressedCode),
        context: {
            TC_EXPORT: context.TC_EXPORT as any,
            modContext: data.evalContext,
            rawCode: window.btoa(encodeURIComponent(decompressedCode)),
        }
    };
}
export function decompress(code: ArrayBufferLike | string) {
    return new Promise<string>((resolve, reject) => {
        const buffer = payloadToBuffer(code);
        zlib.gunzip(buffer, (error, buffer) => {
            if (error) {
                reject(error);
            } else {
                const modCode = buffer.toString("utf8");
                try {
                    resolve(modCode);
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
}

function payloadToBuffer(data: ArrayBufferLike | string) {
    if (typeof data === "string") {
        return base64ToArrayBuffer(data);
    } else if (data instanceof Uint8Array) {
        return data;
    }
    return new Uint8Array(data);
}


export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
    const binary_string =  window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array( len );
    for (let i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer as any;
}

function validateModAndGetModDetails(susMod: typeof BaseMod): Omit<ModMeta, "hash"> {
    const name = susMod.modName;
    const description = susMod.description;
    const dependency = susMod.dependencyName;
    const version = susMod.version;
    const flags = susMod.flags;
    const origins = susMod.origins;
    const requirements: ModRequirement[] = [];
    let priority = susMod.priority;

    if (typeof version !== "string" || !valid(version)) {
        throw new Error("Invalid mod! invalid version");
    }
    if (typeof name !== "string" || name.length < 1) {
        throw new Error("Invalid mod! Missing name");
    }
    if (typeof description !== "string") {
        throw new Error("Invalid mod! Missing description");
    }
    if (dependency && typeof dependency !== "string") {
        throw new Error("Invalid mod! Dependency not specified properly");
    }
    if (typeof priority !== "number") {
        priority = 0;
    }
    if (susMod.requirements) {
        if(Array.isArray(susMod.requirements)) {
            for (const requirement of susMod.requirements) {
                if (typeof requirement === "string") {
                    const mr = extractRequirement(requirement);
                    if (mr.dependencyName.length && mr.version.length && valid(mr.version)) {
                        requirements.push(mr);
                    } else {
                        throw new Error("Invalid mod requirements!");
                    }
                }
            }
        }
    }

    return {
        name, description, version, flags, origins, priority, dependency, requirements
    };
}

function extractRequirement(requirement: string) {
    const index = requirement.indexOf("-");
    if (index === -1) {
        return {
            dependencyName: requirement,
            version: "",
        };
    }
    const dependencyName = requirement.slice(0, index);
    const version = requirement.slice(index + 1);
    return {
        dependencyName,
        version,
    };
}

interface VMWIndow extends Window{
    eval: (code: string) => any;
}
interface VMResult<E, T> {
    result: E;
    context: T;
    evalContext: Window,
}

function virtualize<E = any, T= any>(code: string, windowContext: (window: Window) => Window, context: T = {} as any, blockAccess?: string[]): VMResult<E, T> {
    const vm = document.createElement("iframe"); // vm ha-ha-ha
    //vm.style.display = "none";
    document.body.appendChild(vm);
    let wnd = vm.contentWindow as VMWIndow;

    const vmEval = wnd.eval;

    if (!vmEval) throw new Error("Virtualization failed!");
    wnd = windowContext(wnd as Window) as VMWIndow;

    let blockAccessMethodCalled = [];
    if (blockAccess) {
        for (const key of blockAccess) {
            wnd[key] = () => {
                pushUniq(blockAccessMethodCalled, key);
                throw new Error(`Access to ${key} is not allowed!`);
            };
        }
    }
    for (const key of Object.keys(context)) {
        try {
            wnd[key] = context[key];
        } catch (error) { /* ignored */   }
    }

    // if (DEV) {
    //     const loggers = ["log", "info", "error", "debug", "warn"];
    //     for (const log of loggers) {
    //         wnd["console"][log] = function (...args: any) {
    //             console[log](...args);
    //         };
    //     }
    // }

    try {
        const result = vmEval.call(wnd, code);
        const objectBuilder: any = {};
        const wndKeys= Object.keys(wnd);
        for (const key of wndKeys) {
            if (key in context || wndKeys.indexOf(key) === -1) {
                objectBuilder[key] = wnd[key];
            }
        }
        return {
            result,
            context,
            evalContext: objectBuilder,
        };
    }  finally {
        document.body.removeChild(vm);
    }
}

interface ModWindowContext {
    addEventListener: Window["addEventListener"];
    removeEventListener: Window["removeEventListener"];
    Promise: PromiseConstructor;
    fetch: Window["fetch"];
    XMLHttpRequest: typeof XMLHttpRequest;

    setTimeout: Window["setTimeout"];
    clearTimeout: Window["clearTimeout"];

    setInterval: Window["setInterval"];
    clearInterval: Window["clearInterval"];

    requestAnimationFrame: Window["requestAnimationFrame"];
    cancelAnimationFrame: Window["cancelAnimationFrame"];
    document: Document;
}

function createModContext(wnd?: ModWindowContext) {
    if(!wnd) {
        const promiseConstructor = window.Promise as any;
        const XMLHttpRequest = window.XMLHttpRequest as any;
        wnd = {
            ...window,
            addEventListener: window.addEventListener,
            removeEventListener: window.removeEventListener,
            fetch: window.fetch,
            //@ts-ignore
            Promise: promiseConstructor,
            //@ts-ignore
            XMLHttpRequest: XMLHttpRequest,

            setTimeout: window.setTimeout,
            clearTimeout: window.clearTimeout,

            setInterval: window.setInterval,
            clearInterval: window.clearInterval,

            requestAnimationFrame: requestAnimationFrame,
            cancelAnimationFrame: cancelAnimationFrame,
            document: window.document,
        };
    }


    const map = new Map<string, any[]>();
    const get = (key: string) => {
        const data = map.get(key) || [];
        return {
            data,
            update: () => {
                map.set(key, data);
            }
        };
    };

    const promises: TC_Promise[] = [];
    class TC_Promise<T = any> extends CancelablePromise<T> {
        constructor(executor: (resolve: (value: unknown) => void, reject: (reason?: any) => void) => void) {
            super((resolve, reject) => {
                return executor(resolve, reject);
            });
            promises.push(this);
        }
        then<TResult1 = T, TResult2 = never>(onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2> {
            removeItem(promises, this);
            return super.then(onfulfilled, onrejected);
        }
        catch<TResult = never>(onrejected?: (reason: any) => TResult | PromiseLike<TResult>): Promise<T | TResult> {
            removeItem(promises, this);
            return super.catch(onrejected);
        }
    }

    const requests: TC_XMLHttpRequest[] = [];
    class TC_XMLHttpRequest extends XMLHttpRequest {

        constructor() {
            super();
            super.addEventListener("readystatechange", () => {
                if (super.readyState !== 4) {
                    removeItem(requests, this);
                }
            });
            pushUniq(requests, this);
        }
    }


    wnd.addEventListener = (...args: any) => {
        const o = get("addEventListener");
        pushUniq(o.data, args);
        o.update();
        //@ts-ignore
        return window.addEventListener(...args);
    },
    wnd.setTimeout = (...args: any) => {
        const o = get("setTimeout");
        //@ts-ignore
        const result = window.setTimeout(...args);
        pushUniq(o.data, result);
        o.update();
        return result;
    },
    wnd.setInterval = (...args: any) => {
        const o = get("setInterval");
        //@ts-ignore
        const result = window.setInterval(...args);
        pushUniq(o.data, result);
        o.update();
        return result;
    };
    wnd.requestAnimationFrame = (...args: any) => {
        const o = get("requestAnimationFrame");
        //@ts-ignore
        const result = window.requestAnimationFrame(...args);
        pushUniq(o.data, result);
        o.update();
        return result;
    };
    wnd.fetch = (...args: any) => {
        return new Promise((resolve, reject) => {
            const arr = get("fetch");
            pushUniq(arr.data, reject);
            arr.update();
            //@ts-ignore
            window.fetch(...args).then(resolve).catch(reject).finally(() => {
                const arr = get("fetch");
                removeItem(arr.data, reject);
                arr.update();
            });
        });
    };

    // wnd.document.addEventListener = (...args: any) => {
    //     const o = get("dom.addEventListener");
    //     pushUniq(o.data, args);
    //     o.update();
    //     //@ts-ignore
    //     return window.document.addEventListener(...args);
    // };

    //wnd.window = customWindow;
    //wnd.globalThis = customWindow;
    (wnd as any).XMLHttpRequest = TC_XMLHttpRequest;
    (wnd as any).Promise = TC_Promise;

    const originalMethods = {
        clearTimeout: window.clearTimeout,
        clearInterval: window.clearInterval,
        cancelAnimationFrame: window.cancelAnimationFrame,
        removeEventListener: window.removeEventListener,
        domRemoveEventListener: window.document.removeEventListener
    };

    return {
        customWindow: wnd,
        destroy: () => {
            get("setTimeout").data.forEach(d => originalMethods.clearTimeout(d));
            get("setInterval").data.forEach(d => originalMethods.clearInterval(d));
            get("requestAnimationFrame").data.forEach(d => originalMethods.cancelAnimationFrame(d));
            get("fetch").data.forEach(d => d(new Error("Window destroyed")));
            // @ts-ignore
            get("addEventListener").data.forEach(d => originalMethods.removeEventListener(...d));
            // @ts-ignore
            get("dom.addEventListener").data.forEach(d => originalMethods.domRemoveEventListener(...d));
            promises.forEach(e => e._destroy("Window destroyed"));
            requests.forEach(r => r.abort());

            wnd.setTimeout = null;
            wnd.setInterval = null;
            wnd.requestAnimationFrame = null;
        },
    };
}

function bindModStorage(mod: typeof BaseMod, storage?: ModActualStorage) {
    storage = storage || {
        staticMethod: {},
        local: {}
    };
    mod["setItem"] = async (key, value) => {
        storage.staticMethod[key] = value;
    };
    mod["getItem"] = async  (key) => {
        return  storage.staticMethod[key];
    };
    mod["deleteItem"] = async (key) => {
        delete storage.staticMethod[key];
    };
    return storage;
}
