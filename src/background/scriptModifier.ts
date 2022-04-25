import { CodeModer, RquestBlocker } from "../commonInterface";
import { InjectorType } from "../interfaces";
import { OriginSetter } from "../pageSettings";
import { Logger } from "../utils/logger";

import { checkRegOrString, getOrigin, hashString } from "../utils/utils";
import { BackgroundModHandler } from "./modsUtils";
import { sendMessageToContent } from "./sendMessage";

const CHROME_URL_DATA_CAP = 2097152;


const craftUrl = (type: chrome.webRequest.ResourceType, code: string) => `data:;charset=utf-8,${encodeURIComponent(code)}`;

function createRedirect(details: chrome.webRequest.WebResponseHeadersDetails, payload: string) {
    const contentType = details.responseHeaders.find(e => e.name.toLowerCase() === "content-type");
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


// where all the magic happens
export function createScriptModifier(bmh: BackgroundModHandler, originSetter: OriginSetter) {
    chrome.webRequest.onHeadersReceived.addListener(details => {
        Logger.debug("[chrome.webRequest.onBeforeRequest]", details);
        if (!bmh.enabledOrigins.includes(getOrigin(details.url))) return;

        if (details.initiator && details.initiator.includes("chrome-extension")) return; // Ignoring chrome extensions

        const requestOrigin = getOrigin(details.url);

        const scripters = bmh.scriptModifiersMods;
        if (!scripters.length) return;
        const enabledMods = bmh.scriptModifiersMods.filter(m => m.mod.mod.modifyCodes?.length && bmh.isModEnabledOnOrigin(m.mod.hash, requestOrigin));
        if (!enabledMods.length) return;
        const requestUrl = details.url;
        const url = new URL(requestUrl);
        let hash = 0;
        for (const selected of enabledMods) {
            hash += selected.mod.hash;
            for (const code of selected.mod.mod.modifyCodes) {
                if (checkRegOrString(code.searcher, url.pathname)) {
                    if((code as RquestBlocker).block) {
                        return { cancel: true };
                    }
                }
                hash += hashString(code.searcher.toString());
            }
        }
        if (details.type === "xmlhttprequest") {
            return; // Cannot modify xmlhttprequest
        }
        const settings = originSetter.get(requestOrigin);
        if (settings.injectorType === InjectorType.Turbo) {
            const code = originSetter.getCachedScript(details.url, hash);
            if(code) {
                return createRedirect(details, code);
            }
        }
        const request = new XMLHttpRequest();
        request.open("GET", requestUrl, false);
        //fetch(requestUrl, { cache: "no-cache" }).catch(noop);
        request.send();
        if (request.status < 200 || request.status > 300) {
            sendMessageToContent(details.tabId, {
                type: "show-alert",
                data: "Failed to mod the code!",
            });
            Logger.debug("Failed to fetch request");
            return;
        };

        const data = request.responseText;
        let modded = data;
        let failedMods: string[] = [];
        const contentType = details.responseHeaders.find(e => e.name.toLowerCase() === "content-type");
        const requestType = details.type;
        let hasError = false;
        let moded = false;
        for (const modifierMod of enabledMods) {
            for (const moder of modifierMod.mod.mod.modifyCodes) {
                const actualModder = moder as CodeModer;
                if(!actualModder.mod) continue;
                if (Array.isArray(actualModder.type) ? actualModder.type.includes(requestType as any) : actualModder.type === requestType) {
                    if(checkRegOrString(moder.searcher, url.pathname)) {
                        try {
                            const newScript = (moder as CodeModer).mod(modded, contentType && contentType.value, modifierMod.modderContext, url.pathname, requestUrl);
                            Logger.debug(`Modding "${requestUrl}" by ${modifierMod.mod.name}`);
                            new Function(newScript);
                            modded = newScript;
                            moded = true;
                        } catch (error) {
                            hasError = true;
                            // calculate hash again?
                            Logger.error(error);
                            failedMods.push(`Broken mod "${modifierMod.mod.name}"`);
                            bmh.enableDisableModOnOrigin(modifierMod.mod.hash, false, requestOrigin);
                            break;
                        }

                    }
                }
            }
        }
        if (!moded) return;
        if (!hasError) {
            originSetter.setCachedScript(details.url, hash, modded);
        }
        Logger.error("sendning modded code");
        if (failedMods.length) {
            sendMessageToContent(details.tabId, {
                type: "show-alert",
                data: failedMods.join("\n"),
            });
        }
        return createRedirect(details, modded);
    }, { urls: ["<all_urls>"], types: ["script", "stylesheet", "xmlhttprequest"], }, ["responseHeaders", "extraHeaders", "blocking"]);
}
