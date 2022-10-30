/// <reference path="../fix.d.ts" />

import { cacheCleaner, cacheCleanerFireFox } from "../background/cacheCleaner";
import { createBackgroundScriptMessageHandler } from "../background/backgroundMessageHandler";
import { createRequestInterceptor, createRequestInterceptorFirefox } from "../background/requestMod";
import { createScriptModifier, createScriptModifierFirefox } from "../background/scriptModifier";
import { ModBackgroundLoad, ModBackgroundUnload } from "../commonInterface";
import {  BackgroundModHandler } from "../background/modsUtils";
import { tryCatch } from "../utils/utils";
import { OriginSetter } from "../pageSettings";
import { createTabUpdate } from "../background/updateBadge";
import { chromeGetItem, chromeSetItem } from "../utils/chrome";
import tabs from "../browserCompatibility/browserTabs";
import runtime from "../browserCompatibility/browserRuntime";

// We first load all installed mods
const bmh = new BackgroundModHandler();
bmh.init().then(async () => {
    const originSetter  = new OriginSetter();
    await originSetter.init();
    const tabBadge = createTabUpdate(bmh);
    if (BROWSER_ENV === "chrome-mv2" || BROWSER_ENV === "chrome-mv3") {
        cacheCleaner(bmh);
        createRequestInterceptor(bmh);
        createScriptModifier(bmh, originSetter);
    } else {
        cacheCleanerFireFox(bmh);
        createRequestInterceptorFirefox(bmh);
        createScriptModifierFirefox(bmh, originSetter);
    }
    createBackgroundScriptMessageHandler(bmh, originSetter, tabBadge);

    for (const modDef of bmh.backgroundMods) {
        const event: ModBackgroundLoad<any> = {
            type: "mod-load",
            context: {
                global: modDef.context.global
            },
            enabled: [...modDef.enabledOnOrigins],
            tabs: modDef.tabs
        };
        tryCatch(() => modDef.mod.mod.background(event), modDef.errorCather.caught);
    }
    handleTabs(bmh);
});

function handleTabs(bmh: BackgroundModHandler) {
    let tabsCount = 0;
    let suspended = false;

    tabs.query({}).then(tabs => {
        tabsCount = tabs.length;
    });
    tabs.onCreated(() => {
        tabsCount++;
        if(suspended) {
            for (const modDef of bmh.backgroundMods) {
                const event: ModBackgroundLoad<any> = {
                    type: "mod-load",
                    context: {
                        global: modDef.context.global
                    },
                    enabled: [...modDef.enabledOnOrigins],
                    tabs: modDef.tabs
                };
                tryCatch(() => modDef.mod.mod.background(event), modDef.errorCather.caught);
            }
            suspended = false;
        }
    });
    tabs.onRemoved(tabId => {
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
                    enabled: [...modDef.enabledOnOrigins],
                    tabs: modDef.tabs
                };
                tryCatch(() => modDef.mod.mod.background(event), modDef.errorCather.caught);
            }
            bmh.saveModStorage();
        }
    });
}


runtime.onInstalled(async () => {
    const key = "__FIRST_INSTALL";
    const installed = await chromeGetItem(key);
    if(!installed) {
        tabs.create({ url: runtime.getURL("../assets/html/first_time.html") });
        await chromeSetItem(key, true);
    }
});

