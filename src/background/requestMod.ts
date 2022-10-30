import { getOrigin, removeItem } from "../utils/utils";
import { BackgroundModHandler } from "./modsUtils";
import { FrameType, HeadersMainFrame } from "../commonInterface";
import { ResourceType, ResponseHeader } from "../interfaces";

// Modifying content csp to add unsafe-eval flag to script-src allow mod compiler to compile mods in injected script
// You might think that safe-eval evil but like this extension is literally made to modify webpages!
const types: ResourceType[] = ["main_frame", "sub_frame"];
export function createRequestInterceptor(bmh: BackgroundModHandler) {
    chrome.webRequest.onHeadersReceived.addListener((details) => {
        if (!bmh.enabledOrigins.includes(getOrigin(details.url))) return;
        if (details.method !== "GET") return;

        const copyHeaders = [...details.responseHeaders];
        modifyHeaders(details.url, details.type, details.responseHeaders, copyHeaders, bmh);
        modCSP(copyHeaders);

        return { responseHeaders: copyHeaders};

    }, { urls: ["<all_urls>"], types}, ["responseHeaders", "extraHeaders", "blocking"]);
}


export function createRequestInterceptorFirefox(bmh: BackgroundModHandler) {

    browser.webRequest.onHeadersReceived.addListener((details) => {
        if (!bmh.enabledOrigins.includes(getOrigin(details.url))) return;
        if (details.method !== "GET") return;

        const copyHeaders = [...details.responseHeaders];
        modifyHeaders(details.url, details.type as ResourceType, details.responseHeaders, copyHeaders, bmh);
        modCSP(copyHeaders);

        console.log(copyHeaders);
        return { responseHeaders: copyHeaders};

    }, { urls: ["<all_urls>"], types}, ["responseHeaders", "blocking"]);

}

export function modCSP(copyHeaders: ResponseHeader[]) {
    const headersNames = ["X-Content-Security-Policy", "X-WebKit-CSP", "content-security-policy"].map(a => a.toLowerCase());
    const csps = copyHeaders.filter(h => headersNames.includes(h.name.toLowerCase()));
    if (csps.length) {
        for (const csp of csps) {
            const scriptPolicy = `script-src 'unsafe-inline' 'unsafe-eval' `;
            const replaced = csp.value.replace(/script-src /, scriptPolicy);
            csp.value = replaced.trim();
        }
    }
    // NOTE: there has to be better way?
    const removeTrustedScripts = csps.filter(e => e.value.toLowerCase().includes("require-trusted-types-for"));
    for (const header of removeTrustedScripts) {
        removeItem(copyHeaders, header);
    }

    const cacheHeader: ResponseHeader = {
        name: "Cache-Control",
        value: "no-cache, no-store, must-revalidate"
    };
    const cacheControl = copyHeaders.find(h => h.name.toLowerCase() === cacheHeader.name.toLowerCase());
    if (cacheControl) {
        cacheControl.value = cacheHeader.value;
    } else {
        copyHeaders.push(cacheHeader);
    }
}

export function modifyHeaders(detailsUrl: string, type: ResourceType, responseHeaders: ResponseHeader[],copyHeaders: ResponseHeader[], bmh: BackgroundModHandler, ) {
    const requestOrigin = getOrigin(detailsUrl);
    const scripters = bmh.scriptModifiersMods;
    if (scripters.length) {
        const enabledMods = bmh.scriptModifiersMods.filter(m => m.mod.mod.modifyCodes?.length && bmh.isModEnabledOnOrigin(m.mod.hash, requestOrigin));
        if (enabledMods.length) {
            const requestUrl = detailsUrl;
            const url = new URL(requestUrl);
            const contentType = responseHeaders.find(e => e.name.toLowerCase() === "content-type");
            const typeCase = type as FrameType;
            for (const selected of enabledMods) {
                for(const modder of selected.mod.mod.modifyCodes) {
                    if (modder.type === typeCase || (Array.isArray(modder.type) && (modder.type as FrameType[]).includes(typeCase))) {
                        const mainModder = modder as HeadersMainFrame;
                        mainModder.mainHeadersMod(copyHeaders, contentType && contentType.value, selected.modderContext, url.pathname, requestUrl);
                    }
                }
            }
        }
    }
}
