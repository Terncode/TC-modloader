import { BackgroundModHandler } from "./modsUtils";
import { getOrigin, removeLastChar } from "../utils/utils";
import browsingData from "../browserCompatibility/browsingData";

function handleOnComplete(detailsUrl: string, initiatorUrl: string, bmh: BackgroundModHandler) {
    if (!bmh.enabledOrigins.includes(getOrigin(detailsUrl))) return;
    const requestOrigin = getOrigin(detailsUrl);
    const enabledMods = bmh.scriptModifiersMods.filter(m => m.mod.mod.modifyCodes?.length && bmh.isModEnabledOnOrigin(m.mod.hash, requestOrigin));
    if (!enabledMods.length) return;
    const scriptModder = enabledMods.find(m => m.mod.flags.includes("modify-request"));
    if(!scriptModder)  return;

    const initiator = removeLastChar(initiatorUrl || "", "/");
    const url = removeLastChar(detailsUrl, "/");
    if (initiator === url) {
        const requestOrigin = getOrigin(detailsUrl);
        for (const mod of bmh.scriptModifiersMods) {
            if(bmh.isModEnabledOnOrigin(mod.mod.hash, requestOrigin)) {
                clearOriginCache(getOrigin(detailsUrl));
                return;
            }
        }
    }
}

export function cacheCleaner(bmh: BackgroundModHandler) {
    // There is a possibility that service worker will cache load the page.
    // This ditches the services worker out of existence and reloads the page
    chrome.webRequest.onCompleted.addListener(details => {
        handleOnComplete(details.url, details.initiator, bmh);
    }, { urls: ["<all_urls>"] , types: ["xmlhttprequest", "script", "stylesheet", "main_frame", "sub_frame"]});
}

export function cacheCleanerFireFox(bmh: BackgroundModHandler) {
    browser.webRequest.onCompleted.addListener(details => {
        handleOnComplete(details.url, details.originUrl, bmh);
    }, { urls: ["<all_urls>"] , types: ["xmlhttprequest", "script", "stylesheet", "main_frame", "sub_frame"]});
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


    browsingData.remove({
        origins: [origin],
    }, {
        cache: true,
        //cacheStorage: true,
        //serviceWorkers: true,
    }).then(cb);
}
