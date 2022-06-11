/// <reference path="../fix.d.ts" />

import { cacheCleaner } from "../background/cacheCleaner";
import { createBackgroundScriptMessageHandler } from "../background/backgroundMessageHandler";
import { createRequestInterceptor } from "../background/requestMod";
import { createScriptModifier } from "../background/scriptModifier";
import { ModBackgroundLoad, ModBackgroundUnload } from "../commonInterface";
import {  BackgroundModHandler } from "../background/modsUtils";
import { tryCatch } from "../utils/utils";
import { OriginSetter } from "../pageSettings";
import { createTabUpdate } from "../background/updateBadge";
import { chromeGetItem, chromeSetItem } from "../utils/chrome";

// We first load all installed mods
const bmh = new BackgroundModHandler();
bmh.init().then(async () => {
    const originSetter  = new OriginSetter();
    await originSetter.init();
    const tabBadge = createTabUpdate(bmh);
    cacheCleaner(bmh);
    createScriptModifier(bmh, originSetter);
    createBackgroundScriptMessageHandler(bmh, originSetter, tabBadge);
    createRequestInterceptor(bmh);

    for (const modDef of bmh.backgroundMods) {
        const event: ModBackgroundLoad<any> = {
            type: "mod-load",
            context: {
                global: modDef.context.global
            },
            tabs: modDef.tabs
        };
        tryCatch(() => modDef.mod.mod.background(event), modDef.errorCather.caught);
    }
    handleTabs(bmh);
});

function handleTabs(bmh: BackgroundModHandler) {
    let tabsCount = 0;
    let suspended = false;

    chrome.tabs.query({}, function( tabs ){
        tabsCount = tabs.length;
    });
    chrome.tabs.onCreated.addListener(() => {
        tabsCount++;
        if(suspended) {
            for (const modDef of bmh.backgroundMods) {
                const event: ModBackgroundLoad<any> = {
                    type: "mod-load",
                    context: {
                        global: modDef.context.global
                    },
                    tabs: modDef.tabs
                };
                tryCatch(() => modDef.mod.mod.background(event), modDef.errorCather.caught);
            }
            suspended = false;
        }
    });
    chrome.tabs.onRemoved.addListener(tabId => {
        bmh.removeTab(tabId);
        tabsCount--;
        if (tabsCount === 0) {
            suspended = true;
            for (const modDef of bmh.backgroundMods) {
                const event: ModBackgroundUnload<any> = {
                    type: "mod-unload",
                    context: {
                        global: modDef.context.global
                    },
                    tabs: modDef.tabs
                };
                tryCatch(() => modDef.mod.mod.background(event), modDef.errorCather.caught);
            }
            bmh.saveModStorage();
        }
    });
}


chrome.runtime.onInstalled.addListener(async () => {
    const key = "__FIRST_INSTALL";
    const installed = await chromeGetItem(key);
    if(!installed) {
        chrome.tabs.create({ url: chrome.runtime.getURL("../assets/html/first_time.html") });
        await chromeSetItem(key, true);
    }
});

