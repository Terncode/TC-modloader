import { BrowserWebRequestHeaderDetails } from "../browserCompatibility/browserInterfaces";
import { CodeModer, RequestBlocker } from "../commonInterface";
import { InjectorType, ResponseHeader } from "../interfaces";
import { ModMetaCompiled } from "../modUtils/modInterfaces";
import { OriginSetter } from "../pageSettings";
import { Logger } from "../utils/logger";

import { checkRegOrString, getOrigin, hashString } from "../utils/utils";
import { BackgroundModHandler, Mod } from "./modsUtils";
import { sendMessageToContent } from "./sendMessage";

const CHROME_URL_DATA_CAP = 2097152;


const craftUrl = (_type: string, code: string) => `data:;charset=utf-8,${encodeURIComponent(code)}`;

function createRedirect(details: BrowserWebRequestHeaderDetails, payload: string) {
    /*
        Due to chrome lacking the feature of modifying the request we are create
        are converting script to base64 in case that is long then we are just going to inject the script manually
    */

    const contentType = (details.responseHeaders as chrome.webRequest.HttpHeader[]).find(e => e.name.toLowerCase() === "content-type");
    let redirectUrl = "";
    if (contentType && contentType.value) {
        redirectUrl = `data:;charset=utf-8,${encodeURIComponent(payload)}`;
    } else {
        redirectUrl = craftUrl(details.type, payload);
    }

    // There is limit how long a url can be.
    // If the url exceeds the limit we can request and send it to content for to handle the script for us
    if (redirectUrl.length > CHROME_URL_DATA_CAP) {
        sendMessageToContent(details.tabId, {
            type: "inject-content",
            data: {
                type: details.type as any,
                url: details.url,
                src: redirectUrl
            },
        });
        return { cancel: true };
    } else {
        return { redirectUrl };
    }
}

function isModEnabled(bmh: BackgroundModHandler, url: string) {
    return bmh.enabledOrigins.includes(getOrigin(url));
}

function getEnabledMods(bmh: BackgroundModHandler, requestOrigin: string) {
    const scripters = bmh.scriptModifiersMods;
    if (!scripters.length) return null;
    const enabledMods = bmh.scriptModifiersMods.filter(m => m.mod.mod.modifyCodes?.length && bmh.isModEnabledOnOrigin(m.mod.hash, requestOrigin));
    if (!enabledMods.length) return null;
    return enabledMods;
}

function getHash(mods: Mod[], requestUrl: string) {
    const url = new URL(requestUrl);
    let hash = 0;
    for (const selected of mods) {
        hash += selected.mod.hash;
        for (const code of selected.mod.mod.modifyCodes) {
            if(code.searcher) {
                if (checkRegOrString(code.searcher, url.pathname)) {
                    if((code as RequestBlocker).block) {
                        return null;
                    }
                }
                hash += hashString(code.searcher.toString());
            }
        }
    }
    return hash;
}

function getCachedCode(originSetter: OriginSetter, requestOrigin: string, hash: number) {
    const settings = originSetter.get(requestOrigin);
    if (settings.injectorType === InjectorType.Turbo) {
        const code = originSetter.getCachedScript(requestOrigin, hash);
        if (code) {
            return code;
        }
    }
    return null;
}

interface RequestDetails {
    tabId: number;
    type: string;
    responseHeaders?: {
        name: string;
        value?: string;
    }[]
}
interface DetailedError {
    message: string;
    mod?: ModMetaCompiled;
    error: Error;
}
interface ModReturn {
    modded?: string;
    errors: DetailedError[];
};

const ignoreHeaders = [
    "content-type",
    "content-length",
    "date",
    "keep-alive",
    "connection",
];

function getOriginalCode(requestUrl: string, headers: ResponseHeader[]) {
    const request = new XMLHttpRequest();
    request.open("GET", requestUrl, false);
    if (headers) {
        for (const header of headers) {
            if (!ignoreHeaders.includes(header.name.toLowerCase())) {
                request.setRequestHeader(header.name, header.value);
            }
        }
    }
    request.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
    request.send();
    if (request.status < 200 || request.status > 300) {
        throw new Error(`Responded with ${request.status}`);
    };
    return request.responseText;
}

function modifyCode(requestUrl: string,requestOrigin: string, originalCode: string, type: string, headers: ResponseHeader[], mods: Mod[], bmh: BackgroundModHandler) {
    const errors: DetailedError[] = [];
    const url = new URL(requestUrl);
    let modded = originalCode;
    const contentType = headers.find(e => e.name.toLowerCase() === "content-type");
    const requestType = type;
    let hasBeenModed = false;
    for (const modifierMod of mods) {
        for (const moder of modifierMod.mod.mod.modifyCodes) {
            const actualModder = moder as CodeModer;
            if(!actualModder.mod) continue;
            if (Array.isArray(actualModder.type) ? actualModder.type.includes(requestType as any) : actualModder.type === requestType) {
                if(checkRegOrString(moder.searcher, url.pathname)) {
                    try {
                        const newScript = (moder as CodeModer).mod(modded, headers, contentType && contentType.value, modifierMod.modderContext, url.pathname, requestUrl);
                        Logger.debug(`Modding "${requestUrl}" by ${modifierMod.mod.name}`);
                        new Function(newScript);
                        modded = newScript;
                        hasBeenModed = true;
                    } catch (error) {
                        // calculate hash again?
                        Logger.debug(error);

                        errors.push({
                            error,
                            message:`Broken mod "${modifierMod.mod.name}"`,
                            mod: modifierMod.mod,
                        });
                        bmh.enableDisableModOnOrigin(modifierMod.mod.hash, false, requestOrigin);
                        break;
                    }
                }
            }
        }
    }
    if (errors.length && !hasBeenModed) {
        return { errors };
    }
    if (!hasBeenModed) return null;
    return { modded, errors };
}

function getModifiedCode(requestUrl: string, requestOrigin: string, mods: Mod[], details: RequestDetails, bmh: BackgroundModHandler): ModReturn {
    let code = "";
    try {
        code = getOriginalCode(requestUrl, details.responseHeaders);
    } catch (error) {
        return {
            errors: [
                {
                    error,
                    message: "unable to fetch",
                }
            ]
        };
    }
    return modifyCode(requestUrl, requestOrigin, code, details.type, details.responseHeaders, mods, bmh);
}

// where all the magic happens
export function createScriptModifier(bmh: BackgroundModHandler, originSetter: OriginSetter) {
    chrome.webRequest.onHeadersReceived.addListener(details => {
        if (details.initiator && details.initiator.startsWith("chrome-extension")) return;
        const requestUrl = details.url;
        if (!isModEnabled(bmh, details.url)) return;
        const requestOrigin = getOrigin(details.url);
        const enabledMods = getEnabledMods(bmh, requestOrigin);
        if (!enabledMods) return;

        const hash = getHash(enabledMods, details.url);
        if (hash === null){
            Logger.debug("CANCELED [chrome.webRequest.onBeforeRequest]", details);
            return { cancel: true };
        }
        Logger.debug("[chrome.webRequest.onBeforeRequest]", details);

        if (details.type === "xmlhttprequest") {
            return; // Cannot modify xmlhttprequest
        }
        const cachedCode = getCachedCode(originSetter, requestOrigin, hash);
        if (cachedCode) {
            return createRedirect(details, cachedCode);
        }
        const res = getModifiedCode(requestUrl, requestOrigin, enabledMods, details, bmh);
        if (!res) return;
        if (res.errors) {
            for (const err of res.errors) {
                (async () => {
                    await sendMessageToContent(details.tabId, {
                        type: "show-alert",
                        data: err.message,
                    });
                })();
                Logger.error("[chrome.webRequest.onBeforeRequest]", err);
            }
        }

        if (res.modded) {
            Logger.debug("Sending modded code", res);
            originSetter.setCachedScript(details.url, hash, res.modded);
            return createRedirect(details, res.modded);
        }
    }, { urls: ["<all_urls>"], types: ["script", "stylesheet", "xmlhttprequest"], }, ["responseHeaders", "extraHeaders", "blocking"]);
}

function createInterceptor(requestId: string, details:  browser.webRequest._OnHeadersReceivedDetails,mods: Mod[], bmh: BackgroundModHandler, originSetter: OriginSetter, hash: number, code?: string) {
    Logger.debug("[filterResponseData] start");
    const filter = browser.webRequest.filterResponseData(requestId);
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();
    let originalCode = "";

    filter.onerror = error => {
        Logger.debug("[filterResponseData] onerror", error);
    };

    filter.ondata = (event) => {
        const str = decoder.decode(event.data, {stream: true});
        originalCode += str;
    };
    filter.onstop = () => {
        if (code) {
            filter.write(encoder.encode(code));
        } else {
            const requestUrl = details.url;
            const requestOrigin = getOrigin(details.url);
            const result = modifyCode(requestUrl, requestOrigin, originalCode, details.type, details.responseHeaders, mods, bmh);
            if (result) {
                for (const err of result.errors) {
                    (async () => {
                        await sendMessageToContent(details.tabId, {
                            type: "show-alert",
                            data: err.message,
                        });
                    })();
                    Logger.error("[chrome.webRequest.onBeforeRequest]", err);
                }
                if (result.modded) {
                    originSetter.setCachedScript(details.url, hash, result.modded);
                    filter.write(encoder.encode(result.modded));
                } else {
                    filter.write(encoder.encode(originalCode));
                }
            } else {
                filter.write(encoder.encode(originalCode));
            }
        }

        filter.close();
    };

    filter.onstart = start => {
        Logger.debug("[filterResponseData] start", start);
    };
}

// where all the magic happens
export function createScriptModifierFirefox(bmh: BackgroundModHandler, originSetter: OriginSetter) {
    const noCacheHeader = {
        name: "Cache-Control",
        value: "no-cache, no-store, max-age=0",
    };
    browser.webRequest.onHeadersReceived.addListener(details => {
        if (details.originUrl && details.originUrl.startsWith("moz-extension")) return;
        if (!isModEnabled(bmh, details.url)) return;
        const requestOrigin = getOrigin(details.url);
        const enabledMods = getEnabledMods(bmh, requestOrigin);
        if (!enabledMods) return;


        const headers = [...details.responseHeaders];
        const cacheControl = headers.find(e => e.name.toLowerCase().includes(noCacheHeader.name.toLowerCase()));
        if (cacheControl) {
            cacheControl.value = noCacheHeader.value;
        } else {
            headers.push(noCacheHeader);
        }

        const hash = getHash(enabledMods, details.url);
        if (hash === null) {
            Logger.debug("CANCELED [browser.webRequest.onBeforeRequest]", details);
            return { cancel: true };
        }
        Logger.debug("[browser.webRequest.onBeforeRequest]", details);

        const cachedCode = getCachedCode(originSetter, requestOrigin, hash);
        if (cachedCode) {
            createInterceptor(details.requestId, details, enabledMods, bmh, originSetter,hash, cachedCode);
            return { responseHeaders: headers };
        }


        /*
                const requestUrl = details.url;
        const requestOrigin = getOrigin(details.url);
        */

        // const res = getModifiedCode(requestUrl, requestOrigin,enabledMods, details, bmh);
        // if (!res) return;
        // if (res.errors) {
        //     for (const err of res.errors) {
        //         (async () => {
        //             await sendMessageToContent(details.tabId, {
        //                 type: "show-alert",
        //                 data: err.message,
        //             });
        //         })();
        //         Logger.error("[chrome.webRequest.onBeforeRequest]", err);
        //     }
        // }

        // if (res.modded) {
        //     Logger.debug("[browser.webRequest.onBeforeRequest] 3");
        //     Logger.debug("creating request interceptor code", res);
        //     originSetter.setCachedScript(details.url, hash, res.modded);
        // }
        createInterceptor(details.requestId, details, enabledMods, bmh, originSetter, hash);
        return { responseHeaders: headers };
    }, { urls: ["<all_urls>"], types: ["script", "stylesheet", "xmlhttprequest"], }, ["responseHeaders", "blocking"]);
}

