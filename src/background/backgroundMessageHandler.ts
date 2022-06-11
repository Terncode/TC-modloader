import { getTabs } from "../utils/chrome";
import { BackgroundModHandler } from "./modsUtils";
import { Logger } from "../utils/logger";
import { getOrigin, handleError, objectifyError, setGetter, tryCatch } from "../utils/utils";
import { BackgroundMessage, BackgroundMessageEnabled, BackgroundMessageOpenIngGameMenu, ContentMessageModDisable, ContentMessageModEnable, ContentMessageSettingsEnabled } from "./backgroundEventInterface";
import { sendMessageToContent } from "./sendMessage";
import { ModBackgroundEvent, ModBackgroundInjectorLoad, ModBackgroundInjectorMessage, ModBackgroundInjectorUnload } from "../commonInterface";
import { OriginSetter } from "../pageSettings";
import { ModBackgroundDisable, ModBackgroundEnable } from "../commonInterface";
import { ModMetaCompiled, ModStatus } from "../modUtils/modInterfaces";
import semver from "semver";
import { ExBadge } from "./updateBadge";
import { clearOriginCache } from "./cacheCleaner";
import { ModDeveloper } from "./ModDeveloper";

const respondWithError = (err: any, fallback: string) => objectifyError(err instanceof Error ? err : new Error(fallback));
export function createBackgroundScriptMessageHandler(bmh: BackgroundModHandler, originSetter: OriginSetter, popupBadge: ExBadge) {

    chrome.runtime.onMessage.addListener((request: BackgroundMessage, sender, sendResponse) => {
        // This should not be possible but we only accept message from our extension
        if (chrome.runtime.id !== sender.id) return;

        // Popup and background are sharing this code this should tell is the extension is from popup
        // TODO: Find better method
        const isPopup = sender.url.startsWith(`chrome-extension://${chrome.runtime.id}`);

        // We only accept object that aren't arrays
        if (typeof request !== "object" || Array.isArray(request)) {
            sendResponse(objectifyError(new Error("Unexpected message")));
            return false;
        }

        // Message rejection if is not from popup
        const onlyPopup = () => {
            sendResponse(objectifyError(new Error("This message can only be sent from popup")));
            return false;
        };
        const notPopup = () => {
            sendResponse(objectifyError(new Error("This message cannot be sent from popup")));
            return false;
        };

        // Log data in dev version of the extension
        if (DEV) {
            Logger.debug(`[incoming]`, request, sender);
            const org = sendResponse;
            sendResponse = value => {
                Logger.debug(`[outgoing]`, value);
                org(value);
            };
        }

        try {
            const type = request.type;
            switch (type) {
                case "developer-change": {
                    if (request.data) {
                        ModDeveloper.enable();
                    } else {
                        ModDeveloper.disable();
                    }
                    return;
                }
                case "developer-state": {
                    sendResponse(ModDeveloper.enabled);
                    return;
                }

                case "origin-add":
                case "origin-remove": {
                    if (!isPopup) onlyPopup();
                    const added = type === "origin-add";

                    if (added) {
                        bmh.addOrigin(request.data);
                    } else {
                        bmh.removeOrigin(request.data);
                    }

                    getTabs().then(tabs => {
                        const filteredTabs = tabs.filter(tab => getOrigin(tab.url) === request.data);
                        for (const tab of filteredTabs) {
                            const dataToSend: BackgroundMessageEnabled = {
                                type: "content-enabled",
                                data: added && originSetter.getAllSettings(tab, true)
                            };
                            popupBadge.onModEnableStateChange(tab.id, bmh.getOriginMods(request.data).length);
                            sendMessageToContent(tab.id, dataToSend);
                        }
                    });
                    sendResponse(true);
                    return true;
                }
                case "origin-check": {

                    const enabled = bmh.enabledOrigins.includes(request.data,);
                    if(isPopup) {
                        sendResponse(enabled);
                        return true;
                    }
                    if(enabled) {
                        const data = originSetter.getAllSettings(sender.tab);
                        sendResponse(data);
                    } else {
                        sendResponse();
                    }
                    return false;
                }
                case "get-installed": {
                    if (!isPopup) onlyPopup();
                    sendResponse(bmh.getInstalledModsMeta(request.data));
                    return false;
                }
                case "mod-install": {
                    if (!isPopup) onlyPopup();
                    Logger.debug("mod-install", request.data);
                    bmh.installMod(request.data).then(() => {
                        sendResponse();
                    }).catch(error => {
                        sendResponse(objectifyError(error));
                    });
                    return true;
                }
                case "mod-uninstall": {
                    if (!isPopup) onlyPopup();
                    const hash = request.data;
                    Logger.debug("mod-uninstall", hash);
                    const mod = bmh.getModByHash(hash);
                    const origins = [...mod.enabledOnOrigins];
                    bmh.uninstallMod(request.data).then(() => {
                        sendResponse();
                        getTabs().then(tabs => {
                            for (const tab of tabs) {
                                const origin = getOrigin(tab.url);
                                if (origins.includes(origin)) {
                                    sendMessageToContent(tab.id ,{
                                        type: "extract-mod",
                                        data: hash,
                                    } as ContentMessageModDisable);
                                }
                            }
                        });
                    }).catch(error => {
                        sendResponse(objectifyError(error));
                    });
                    return true;
                }
                case "get-mod-state": {
                    if (!isPopup) onlyPopup();

                    const tabOrigin = request.data.origin;
                    const hash = request.data.hash;
                    const mod = bmh.getModByHash(hash);
                    const enabled = bmh.isModEnabledOnOrigin(hash, tabOrigin);
                    let result: ModStatus = {
                        enabled,
                    };
                    if(result.enabled) {
                        if(mod.mod.dependency) {
                            const dep = mod.mod.dependency;
                            const enabledMods = bmh.installedMods.filter(m => bmh.isModEnabledOnOrigin(m.mod.hash, tabOrigin));
                            const runningDep = enabledMods.find(e => e.mod.requirements.find(r => r.dependencyName === dep && semver.gte(r.version, mod.mod.version)));
                            if (runningDep) {
                                result.dependencyError = `Mod "${runningDep.mod.name}" is currently using this mod!`;
                            }
                        }

                        sendResponse(result);
                    } else {
                        getModRequirements(mod.mod, (dep, ver) => {
                            const e =bmh.getModByDependencyName(dep)
                                .find(m => semver.gte(m.mod.version, ver) && bmh.isModEnabledOnOrigin(m.mod.hash, tabOrigin));

                            if (!e) {
                                result.dependencyError = `Dependency mod is not running! "${dep}-${ver}+" is required for this mod`;
                                return true;
                            }
                        });

                        sendResponse(result);
                    }
                    return true;
                }
                case "set-mod-state": {
                    if (!isPopup) onlyPopup();
                    const enabled = request.data.value;
                    const hash = request.data.hash;
                    const modOrigin = request.data.origin;
                    sendResponse(bmh.enableDisableModOnOrigin(hash, enabled, modOrigin));
                    const modDef = bmh.getModByHash(hash);
                    if (modDef.mod.flags.includes("background-script")) {
                        if(enabled) {
                            tryCatch(() => modDef.mod.mod.background({
                                type: "mod-enabled",
                                origin: modOrigin,
                                context: {
                                    global: modDef.context.global,
                                }

                            } as ModBackgroundEnable<any>), modDef.errorCather.caught);
                        } else {
                            tryCatch(() => modDef.mod.mod.background({
                                type: "mod-disable",
                                origin: modOrigin,
                                context: {
                                    global: modDef.context.global,
                                }
                            } as ModBackgroundDisable<any>), modDef.errorCather.caught);
                        }
                    }
                    if (enabled && modDef.mod.flags.includes("modify-request")) {
                        clearOriginCache(modOrigin);
                    }

                    const data = bmh.mapToModMetaCode(modDef);
                    getTabs().then(async tabs => {
                        for (const tab of tabs) {
                            const origin = getOrigin(tab.url);
                            if (origin === modOrigin) {
                                if(enabled) {
                                    sendMessageToContent(tab.id ,{
                                        type: "inject-mod",
                                        data,
                                    } as ContentMessageModEnable);
                                } else {
                                    await bmh.disableAllModThatRequires(modDef.mod);
                                    sendMessageToContent(tab.id ,{
                                        type: "extract-mod",
                                        data: hash,
                                    } as ContentMessageModDisable);
                                }
                                popupBadge.onModEnableStateChange(tab.id, bmh.getOriginMods(modOrigin).length);
                            }
                        }
                    });
                    return true;
                }
                case "can-uninstall": {
                    const modDef = bmh.getModByHash(request.data);

                    if (modDef.mod.dependency) {
                        const mod = bmh.installedMods.find(m => {
                            if (m.mod.requirements && m.mod.requirements) {
                                for (const { dependencyName } of m.mod.requirements) {
                                    if (dependencyName === modDef.mod.dependency) {
                                        return true;
                                    }
                                }
                            }
                        });
                        if(mod){
                            sendResponse(true);
                        }
                    }

                    sendResponse(false);
                    return true;
                }

                case "fetch-mod-name": {
                    const name = request.data;
                    const mods = bmh.getModByName(name);

                    sendResponse(mods.map(bmh.mapToModMeta));

                    return true;
                }
                case "fetch-mod-dependency-name": {
                    const name = request.data;
                    const mods = bmh.getModByDependencyName(name);
                    sendResponse(mods.map(bmh.mapToModMeta));

                    return true;
                }
                case "get-origin-enabled-mods": {
                    const enabledMods = bmh.installedMods.filter(m => bmh.isModEnabledOnOrigin(m.mod.hash, request.data));
                    const mappedMods = enabledMods.map(bmh.mapToModMetaCode);
                    sendResponse(mappedMods);
                    return true;
                }
                case "injector-mod-load":
                case "injector-mod-unload": {
                    const mod = bmh.getModByHash(request.data.hash);
                    const hash = request.data.hash;
                    const loaded = request.type === "injector-mod-load";
                    let event: ModBackgroundEvent<any, any, any>;
                    const tabOrigin = getOrigin(sender.url);
                    const tabId = sender.tab.id;
                    const context = mod.context.tabs.get(tabId) || {};
                    mod.context.tabs.set(tabId, context);
                    popupBadge.onModStateChange(sender.tab.id, request.data.runningModsCount);
                    if (loaded) {
                        mod.tabs[tabId] = {
                            origin,
                            send: async (data) => sendMessageToContent<any>(tabId, {
                                type:"mod-message",
                                data: {
                                    hash,
                                    data
                                }
                            }),
                        };
                        setGetter(mod.tabs[tabId], "origin", () => tabOrigin);
                        event = {
                            type:"mod-injector-load",
                            origin: tabOrigin,
                            context: {
                                global: mod.context.global,
                                tab: {
                                    id: tabId,
                                    data: context
                                },
                            },
                            tabs: mod.tabs,
                        } as ModBackgroundInjectorLoad<any, any>;
                    } else {
                        delete mod.tabs[tabId];
                        event = {
                            type:"mod-injector-unload",
                            origin: tabOrigin,
                            context: {
                                global: mod.context.global,
                                tab: {
                                    id: tabId,
                                    data: context
                                }
                            }
                        } as ModBackgroundInjectorUnload<any, any>;
                    }
                    tryCatch(() => mod.mod.mod.background(event), mod.errorCather.caught).finally(() => {
                        sendResponse();
                    });
                    return true;
                };
                case "injector-mod-message": {
                    const hash = request.data.hash;
                    const mod = bmh.getModByHash(hash);
                    const tabOrigin = getOrigin(sender.url);
                    const tabId = sender.tab.id;
                    const context = mod.context.tabs.get(tabId) || {};
                    mod.context.tabs.set(tabId, context);
                    const event = {
                        type:"mod-injector-message",
                        origin: tabOrigin,
                        context: {
                            global: mod.context.global,
                            tab: {
                                id: tabId,
                                data: context
                            }
                        },
                        data: request.data.data,
                        tabs: mod.tabs
                    } as ModBackgroundInjectorMessage<any, any, any>;
                    tryCatch(() => mod.mod.mod.background(event), mod.errorCather.caught).then(res => {
                        sendResponse(res);
                    }).catch(err => {
                        sendResponse(objectifyError(err));
                    });
                    return true;
                };
                case "injector-mod-error": {
                    const mod = bmh.getModByHash(request.data.hash);
                    mod.errorCather.caught(handleError(request.data.error, false));
                    return true;
                };
                case "mod-storage-update": {
                    if (isPopup) return notPopup();
                    const mod = bmh.getModByHash(request.data.hash);
                    const key = request.data.key;
                    const type =request.data.type;
                    const isStatic =request.data.isStatic;
                    switch (type) {
                        case "storage-delete":
                            if (isStatic) {
                                delete mod.storage.staticMethod[key];
                            } else {
                                delete mod.storage.local[key];
                            }
                            bmh.saveModStorage();
                            sendResponse();
                            return true;
                        case "storage-save":
                            if (isStatic) {
                                mod.storage.staticMethod[key] = request.data.value;
                            } else {
                                mod.storage.local[key] = request.data.value;
                            }
                            bmh.saveModStorage();
                            sendResponse();
                            return true;
                        case "storage-get":
                            if (isStatic) {
                                sendResponse(mod.storage.staticMethod[key]);
                            } else {
                                sendResponse(mod.storage.local[key]);
                            }
                            bmh.saveModStorage();
                            return true;
                        default:
                            sendResponse(objectifyError(new Error(`Unhandled storage event ${type}`)));
                            return;
                    }
                }
                case "get-origin-settings": {
                    if (!isPopup) return onlyPopup();
                    sendResponse(originSetter.get(request.data));

                    return true;
                }
                case "set-origin-settings": {
                    if (!isPopup) return onlyPopup();
                    const origin = request.data.origin;
                    sendResponse(originSetter.set(origin, request.data));
                    getTabs().then(tabs => {
                        const filteredTabs = tabs.filter(tab => getOrigin(tab.url) === request.data.origin);
                        for (const tab of filteredTabs) {
                            sendMessageToContent(tab.id, {
                                type: "origin-settings-update",
                                data: request.data,
                            }as ContentMessageSettingsEnabled);
                        }
                    });
                    return true;
                }
                case "get-mod-internal-data": {
                    if (!isPopup) return onlyPopup();
                    const mod = bmh.getModByHash(request.data);
                    sendResponse({
                        errors: mod.errorCather.getErrors(),
                        code: mod.raw,
                    });
                    return true;
                }
                case "open-mod-menu": {
                    if (!isPopup) return onlyPopup();
                    getTabs({
                        active:true,
                        currentWindow: true,
                    }).then(tabs => {
                        const tab =tabs[0];
                        if(tab){
                            sendMessageToContent(tab.id, {
                                type: "open-mod-menu",
                            } as BackgroundMessageOpenIngGameMenu);
                        }
                    });
                    return true;
                }
                default:
                    break;
            }

        } catch(err) {
            Logger.error(err, request);
            sendResponse(respondWithError(err, "Unable to process the request!"));
            return;
        }

        sendResponse(objectifyError(new Error("Unhandled request"), request));
        return false;
    });

}

function getModRequirements(mod: ModMetaCompiled, cb: (name: string, version: string) => boolean) {
    if(mod.requirements && mod.requirements.length) {
        for (const {dependencyName,version} of mod.requirements) {
            const result = cb(dependencyName, version);
            if (result) {
                return;
            }
        }
    }
}
