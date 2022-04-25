import { chromeGetUrl } from "../utils/chrome";
import { getOrigin, removeItem } from "../utils/utils";
import { VENOM_LOCATION } from "../constants";
import { BackgroundModHandler } from "./modsUtils";

export function createRequestInterceptor(bmh: BackgroundModHandler) {
    // Modifying content csp to add unsafe-eval flag to script-src allow mod compiler to compile mods in injected script
    // You might think that safe-eval evil but like this extension is literally made to modify webpages!
    chrome.webRequest.onHeadersReceived.addListener((details) => {
        if (!bmh.enabledOrigins.includes(getOrigin(details.url))) return;
        if (details.method === "GET") {
            const copyHeaders = [...details.responseHeaders];
            const headersNames = ["X-Content-Security-Policy", "X-WebKit-CSP", "content-security-policy"].map(a => a.toLowerCase());
            const csps = copyHeaders.filter(h => headersNames.includes(h.name.toLowerCase()));
            if (csps.length) {
                for (const csp of csps) {
                    const scriptPolicy = `script-src ${chromeGetUrl(VENOM_LOCATION)} 'unsafe-inline' 'unsafe-eval' `;
                    const replaced = csp.value.replace(/script-src /, scriptPolicy);
                    csp.value = replaced.trim();
                }
            }
            // NOTE: there has to be better way?
            const removeTrustedScripts = csps.filter(e => e.value.toLowerCase().includes("require-trusted-types-for"));
            for (const header of removeTrustedScripts) {
                removeItem(copyHeaders, header);
            }

            const cacheHeader: chrome.webRequest.HttpHeader = {
                name: "Cache-Control",
                value: "no-cache, no-store, must-revalidate"
            };
            const cacheControl = copyHeaders.find(h => h.name.toLowerCase() === cacheHeader.name.toLowerCase());
            if (cacheControl) {
                cacheControl.value = cacheHeader.value;
            } else {
                copyHeaders.push(cacheHeader);
            }

            return { responseHeaders: copyHeaders};
        }
    }, { urls: ["<all_urls>"], types :["main_frame"]}, ["responseHeaders", "extraHeaders", "blocking"]);
}
