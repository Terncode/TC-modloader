import { BackgroundModHandler } from "./modsUtils";
import { getOrigin, removeLastChar } from "../utils/utils";
import { Logger } from "../utils/logger";

export function cacheCleaner(bmh: BackgroundModHandler) {
    // There is a possibility that service worker will cache load the page.
    // This ditches the services worker out of existence and reloads the page
    chrome.webRequest.onCompleted.addListener(details => {
        if (!bmh.enabledOrigins.includes(getOrigin(details.url))) return;
        const requestOrigin = getOrigin(details.url);
        const enabledMods = bmh.scriptModifiersMods.filter(m => m.mod.mod.modifyCodes?.length && bmh.isModEnabledOnOrigin(m.mod.hash, requestOrigin));
        if (!enabledMods.length) return;
        const scriptModder = enabledMods.find(m => m.mod.flags.includes("modify-request"));
        if(!scriptModder)  return;

        const initiator = removeLastChar(details.initiator, "/");
        const url = removeLastChar(details.url, "/");
        if (initiator === url) {
            const requestOrigin = getOrigin(details.url);
            for (const mod of bmh.scriptModifiersMods) {
                if(bmh.isModEnabledOnOrigin(mod.mod.hash, requestOrigin)) {
                    clearOriginCache(getOrigin(details.url));
                    return;
                }
            }
        }
    }, { urls: ["<all_urls>"] , types: ["xmlhttprequest", "script", "stylesheet", "main_frame"]});
}


const originSet = new Set<string>();
const TIMEOUT = 1000 * 10;
export function clearOriginCache(origin: string, cb?: () => void) {
    if(originSet.has(origin)) {
        return;
    }
    originSet.add(origin);
    setTimeout(() => {
        originSet.delete(origin);
    }, TIMEOUT);


    chrome.browsingData.remove({
        origins: [origin],
    }, {
        cache: true,
        //cacheStorage: true,
        //serviceWorkers: true,
    }, cb);
}
