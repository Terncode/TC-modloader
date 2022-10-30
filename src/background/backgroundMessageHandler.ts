import { getTabs } from "../utils/chrome";
import { BackgroundModHandler } from "./modsUtils";
import { Logger } from "../utils/logger";
import { getOrigin, handleError, objectifyError, setGetter, tryCatch } from "../utils/utils";
import {
    BackgroundMessage, BackgroundMessageCanUninstall, BackgroundMessageCheck, BackgroundMessageEnabled, BackgroundMessageFetchErrors, BackgroundMessageFetchMod,
    BackgroundMessageFetchModDependency, BackgroundMessageGetOriginEnabled, BackgroundMessageGetOriginSettings, BackgroundMessageGetReportModStateGet,
    BackgroundMessageGetReportModStateSet, BackgroundMessageModInstall, BackgroundMessageModUninstall, BackgroundMessageOpenInModMenu, BackgroundMessageOriginAdd,
    BackgroundMessageOriginRemove, BackgroundMessageSetOriginSettings, ContentMessageInjectorModError, ContentMessageInjectorModLoad, ContentMessageInjectorModMessage,
    ContentMessageInjectorModUnload, ContentMessageModDisable, ContentMessageModEnable, ContentMessageModStorageUpdate,
    ContentMessageSettingsEnabled
} from "./backgroundEventInterface";
import { sendMessageToContent } from "./sendMessage";
import { ModBackgroundEvent, ModBackgroundInjectorLoad, ModBackgroundInjectorMessage, ModBackgroundInjectorUnload } from "../commonInterface";
import { OriginSetter } from "../pageSettings";
import { ModBackgroundDisable, ModBackgroundEnable } from "../commonInterface";
import { ModMetaCompiled, ModStatus } from "../modUtils/modInterfaces";
import semver from "semver";
import { ExBadge } from "./updateBadge";
import { clearOriginCache } from "./cacheCleaner";
import { ModDeveloper } from "./ModDeveloper";
import runtime from "../browserCompatibility/browserRuntime";
import { BrowserMessageSender, BrowserSenderResponse } from "../browserCompatibility/browserInterfaces";
import { isPopup } from "../browserCompatibility/browserUtils";

interface MessageRequest<M = BackgroundMessage> {
    message: M;
    sender: BrowserMessageSender;
    sendResponse: BrowserSenderResponse;
    bmh: BackgroundModHandler;
    originSetter: OriginSetter;
    popupBadge: ExBadge;
}

type MessageTypes = BackgroundMessage["type"];
type MessageHandle = (request: MessageRequest<any>) => boolean | Promise<void>;

const respondWithError = (err: any, fallback: string) => objectifyError(err instanceof Error ? err : new Error(fallback));
export function createBackgroundScriptMessageHandler(bmh: BackgroundModHandler, originSetter: OriginSetter, popupBadge: ExBadge) {
    const fnMap = new Map<MessageTypes, MessageHandle>();
    fnMap.set("developer-change", developerChange);
    fnMap.set("developer-state", developerState);
    fnMap.set("origin-add", originAddRemove);
    fnMap.set("origin-remove", originAddRemove);
    fnMap.set("origin-check", originCheck);
    fnMap.set("get-installed", getInstalled);
    fnMap.set("mod-install", modInstall);
    fnMap.set("mod-uninstall", modUninstall);
    fnMap.set("get-mod-state", getModState);
    fnMap.set("set-mod-state", setModState);
    fnMap.set("can-uninstall", canUninstall);
    fnMap.set("fetch-mod-name", fetchModName);
    fnMap.set("fetch-mod-dependency-name", fetchModeDependency);
    fnMap.set("get-origin-enabled-mods", getOriginEnabledMods);
    fnMap.set("injector-mod-load", modInjectorLoadUnload);
    fnMap.set("injector-mod-unload", modInjectorLoadUnload);
    fnMap.set("injector-mod-message", injectorModMessage);
    fnMap.set("injector-mod-error", injectorModError);
    fnMap.set("mod-storage-update", modStorageUpdate);
    fnMap.set("get-origin-settings", getOriginSettings);
    fnMap.set("set-origin-settings", setOriginSettings);
    fnMap.set("get-mod-internal-data", getModInternalData);
    fnMap.set("open-mod-menu", openModMenu);

    runtime.onMessage<BackgroundMessage>((message, sender, sendResponse) => {
        // This should not be possible but we only accept message from our extension
        if (runtime.getId() !== sender.id) return;

        // We only accept object that aren't arrays
        if (typeof message !== "object" || Array.isArray(message)) {
            sendResponse(objectifyError(new Error("Unexpected message")));
            return false;
        }
        // Log data in dev version of the extension
        if (DEV) {
            Logger.debug(`[incoming] [${message.type}]`, message, sender);
            const org = sendResponse;
            sendResponse = value => {
                Logger.debug(`[outgoing] `, value);
                org(value);
            };
        }
        const messageRequest: MessageRequest<any> = {
            message,
            sender,
            sendResponse,
            bmh,
            originSetter,
            popupBadge,
        };

        const fn = fnMap.get(message.type);
        if (fn) {
            try {
                const response = fn(messageRequest);
                Logger.debug(response, fn, messageRequest);
                if (typeof response === "boolean") {
                    return response;
                }
                return true;
            } catch (err) {
                Logger.error(err, message);
                sendResponse(respondWithError(err, "Unable to process the request!"));
            }
        } else {
            sendResponse(objectifyError(new Error("Unhandled request"), message));
            return false;
        }
    });
}
function onlyPopup(sendResponse: BrowserSenderResponse) {
    sendResponse(objectifyError(new Error("This message can only be sent from popup")));
    return false;
};

function notPopup(sendResponse: BrowserSenderResponse) {
    sendResponse(objectifyError(new Error("This message cannot be sent from popup")));
    return false;
};

function developerChange(request: MessageRequest<BackgroundMessageCheck>) {
    request.message.data ? ModDeveloper.enable() : ModDeveloper.disable();
    return false;
}

function developerState(request: MessageRequest) {
    request.sendResponse(ModDeveloper.enabled);
    return false;
}

async function originAddRemove(request: MessageRequest<BackgroundMessageOriginRemove | BackgroundMessageOriginAdd>): Promise<void> {
    if (!isPopup(request.sender)) {
        onlyPopup(request.sendResponse);
        return;
    }
    const added = request.message.type === "origin-add";

    if (added) {
        request.bmh.addOrigin(request.message.data);
    } else {
        request.bmh.removeOrigin(request.message.data);
    }
    const tabs = await getTabs();

    const filteredTabs = tabs.filter(tab => getOrigin(tab.url) === request.message.data);
    for (const tab of filteredTabs) {
        const dataToSend: BackgroundMessageEnabled = {
            type: "content-enabled",
            data: added && request.originSetter.getAllSettings(tab, true)
        };
        request.popupBadge.onModEnableStateChange(tab.id, request.bmh.getOriginMods(request.message.data).length);
        sendMessageToContent(tab.id, dataToSend);
    }
    request.sendResponse(true);
}

function originCheck(request: MessageRequest<BackgroundMessageCheck>) {
    const enabled = request.bmh.enabledOrigins.includes(request.message.data,);
    if (isPopup(request.sender)) {
        request.sendResponse(enabled);
        return true;
    }
    if (enabled) {
        const data = request.originSetter.getAllSettings(request.sender.tab);
        request.sendResponse(data);
    } else {
        request.sendResponse();
    }
    return true;
}

async function modInstall(request: MessageRequest<BackgroundMessageModInstall>) {
    if (!isPopup(request.sender)) {
        onlyPopup(request.sendResponse);
        return;
    }
    Logger.debug("mod-install", request.message.data);
    try {
        await request.bmh.installMod(request.message.data);
        request.sendResponse();
    } catch (error) {
        request.sendResponse(objectifyError(error));
    }
}

async function modUninstall(request: MessageRequest<BackgroundMessageModUninstall>) {
    if (!isPopup(request.sender)) {
        onlyPopup(request.sendResponse);
        return;
    }
    const hash = request.message.data;
    Logger.debug("mod-uninstall", hash);
    const mod = request.bmh.getModByHash(hash);
    const origins = [...mod.enabledOnOrigins];
    try {
        await request.bmh.uninstallMod(request.message.data);
        const tabs = await getTabs();
        for (const tab of tabs) {
            const origin = getOrigin(tab.url);
            if (origins.includes(origin)) {
                sendMessageToContent(tab.id ,{
                    type: "extract-mod",
                    data: hash,
                } as ContentMessageModDisable);
            }
        }
    } catch (error) {
        request.sendResponse(objectifyError(error));
    }
}

function getModState(request: MessageRequest<BackgroundMessageGetReportModStateGet>) {
    if (!isPopup(request.sender)) {
        onlyPopup(request.sendResponse);
        return false;
    }

    const tabOrigin = request.message.data.origin;
    const hash = request.message.data.hash;
    const mod = request.bmh.getModByHash(hash);
    const enabled = request.bmh.isModEnabledOnOrigin(hash, tabOrigin);
    const result: ModStatus = { enabled };
    if (result.enabled) {
        if(mod.mod.dependency) {
            const dep = mod.mod.dependency;
            const enabledMods = request.bmh.installedMods.filter(m => request.bmh.isModEnabledOnOrigin(m.mod.hash, tabOrigin));
            const runningDep = enabledMods.find(e => e.mod.requirements.find(r => r.dependencyName === dep && semver.gte(r.version, mod.mod.version)));
            if (runningDep) {
                result.dependencyError = `Mod "${runningDep.mod.name}" is currently using this mod!`;
            }
        }

        request.sendResponse(result);
    } else {
        getModRequirements(mod.mod, (dep, ver) => {
            const e = request.bmh.getModByDependencyName(dep)
                .find(m => semver.gte(m.mod.version, ver) && request.bmh.isModEnabledOnOrigin(m.mod.hash, tabOrigin));

            if (!e) {
                result.dependencyError = `Dependency mod is not running! "${dep}-${ver}+" is required for this mod`;
                return true;
            }
        });
        request.sendResponse(result);
    }
    return true;
}

async function setModState(request: MessageRequest<BackgroundMessageGetReportModStateSet>): Promise<void> {
    if (!isPopup(request.sender)) {
        onlyPopup(request.sendResponse);
    }
    const enabled = request.message.data.value;
    const hash = request.message.data.hash;
    const modOrigin = request.message.data.origin;
    request.sendResponse(request.bmh.enableDisableModOnOrigin(hash, enabled, modOrigin));
    const modDef = request.bmh.getModByHash(hash);
    if (modDef.mod.flags.includes("background-script")) {
        if (enabled) {
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

    const data = request.bmh.mapToModMetaCode(modDef);
    const tabs = await getTabs();

    for (const tab of tabs) {
        const origin = getOrigin(tab.url);
        if (origin === modOrigin) {
            if (enabled) {
                sendMessageToContent(tab.id ,{
                    type: "inject-mod",
                    data,
                } as ContentMessageModEnable);
            } else {
                await request.bmh.disableAllModThatRequires(modDef.mod);
                sendMessageToContent(tab.id ,{
                    type: "extract-mod",
                    data: hash,
                } as ContentMessageModDisable);
            }
            request.popupBadge.onModEnableStateChange(tab.id, request.bmh.getOriginMods(modOrigin).length);
        }
    }
}

function canUninstall(request: MessageRequest<BackgroundMessageCanUninstall>) {
    const modDef = request.bmh.getModByHash(request.message.data);

    if (modDef.mod.dependency) {
        const mod = request.bmh.installedMods.find(m => {
            if (m.mod.requirements && m.mod.requirements) {
                for (const { dependencyName } of m.mod.requirements) {
                    if (dependencyName === modDef.mod.dependency) {
                        return true;
                    }
                }
            }
        });
        if (mod) {
            request.sendResponse(true);
        }
    }
    request.sendResponse(false);
    return false;
}

function fetchModName(request: MessageRequest<BackgroundMessageFetchMod>) {
    const name = request.message.data;
    const mods = request.bmh.getModByName(name);
    request.sendResponse(mods.map(request.bmh.mapToModMeta));
    return false;
}

function fetchModeDependency(request: MessageRequest<BackgroundMessageFetchModDependency>) {
    const name = request.message.data;
    const mods = request.bmh.getModByDependencyName(name);
    request.sendResponse(mods.map(request.bmh.mapToModMeta));
    return false;
}

function getOriginEnabledMods(request: MessageRequest<BackgroundMessageGetOriginEnabled>) {
    const enabledMods = request.bmh.installedMods.filter(m => request.bmh.isModEnabledOnOrigin(m.mod.hash, request.message.data));
    const mappedMods = enabledMods.map(request.bmh.mapToModMetaCode);
    request.sendResponse(mappedMods);
    return false;
}

function modInjectorLoadUnload(request: MessageRequest<ContentMessageInjectorModLoad | ContentMessageInjectorModUnload>) {
    const mod = request.bmh.getModByHash(request.message.data.hash);
    const hash = request.message.data.hash;
    const loaded = request.message.type === "injector-mod-load";
    let event: ModBackgroundEvent<any, any, any>;
    const tabOrigin = getOrigin(request.sender.url);
    const tabId = request.sender.tab.id;
    const context = mod.context.tabs.get(tabId) || {};
    mod.context.tabs.set(tabId, context);
    request.popupBadge.onModStateChange(request.sender.tab.id, request.message.data.runningModsCount);
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
        request.sendResponse();
    });
    return true;
}

function injectorModMessage(request: MessageRequest<ContentMessageInjectorModMessage>) {
    const hash = request.message.data.hash;
    const mod = request.bmh.getModByHash(hash);
    const tabOrigin = getOrigin(request.sender.url);
    const tabId = request.sender.tab.id;
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
        enabled: [...mod.enabledOnOrigins],
        data: request.message.data.data,
        tabs: mod.tabs
    } as ModBackgroundInjectorMessage<any, any, any>;
    tryCatch(() => mod.mod.mod.background(event), mod.errorCather.caught).then(res => {
        request.sendResponse(res);
    }).catch(err => {
        request.sendResponse(objectifyError(err));
    });
    return true;
}

function injectorModError(request: MessageRequest<ContentMessageInjectorModError>) {
    const mod = request.bmh.getModByHash(request.message.data.hash);
    mod.errorCather.caught(handleError(request.message.data.error, false));
    return false;
}

function modStorageUpdate(request: MessageRequest<ContentMessageModStorageUpdate>) {
    if (isPopup(request.sender)) {
        notPopup(request.sendResponse);
        return false;
    }
    const mod = request.bmh.getModByHash(request.message.data.hash);
    const key = request.message.data.key;
    const type = request.message.data.type;
    const isStatic = request.message.data.isStatic;
    switch (type) {
        case "storage-delete":
            if (isStatic) {
                delete mod.storage.staticMethod[key];
            } else {
                delete mod.storage.local[key];
            }
            request.bmh.saveModStorage();
            request.sendResponse();
            return true;
        case "storage-save":
            if (isStatic) {
                mod.storage.staticMethod[key] = request.message.data.value;
            } else {
                mod.storage.local[key] = request.message.data.value;
            }
            request.bmh.saveModStorage();
            request.sendResponse();
            return true;
        case "storage-get":
            if (isStatic) {
                request.sendResponse(mod.storage.staticMethod[key]);
            } else {
                request.sendResponse(mod.storage.local[key]);
            }
            request.bmh.saveModStorage();
            return true;
        default:
            request.sendResponse(objectifyError(new Error(`Unhandled storage event ${type}`)));
            return false;
    }
}

function getOriginSettings(request: MessageRequest<BackgroundMessageGetOriginSettings>) {
    if (!isPopup(request.sender)) {
        notPopup(request.sendResponse);
        return false;
    }
    request.sendResponse(request.originSetter.get(request.message.data));
    return false;
}

async function setOriginSettings(request: MessageRequest<BackgroundMessageSetOriginSettings>) {
    if (!isPopup(request.sender)) {
        notPopup(request.sendResponse);
        return;
    }
    const origin = request.message.data.origin;
    request.sendResponse(request.originSetter.set(origin, request.message.data));
    const tabs = await getTabs();
    const filteredTabs = tabs.filter(tab => getOrigin(tab.url) === request.message.data.origin);
    for (const tab of filteredTabs) {
        sendMessageToContent(tab.id, {
            type: "origin-settings-update",
            data: request.message.data,
        } as ContentMessageSettingsEnabled);
    }
}

function getModInternalData(request: MessageRequest<BackgroundMessageFetchErrors>) {
    if (!isPopup(request.sender)) {
        notPopup(request.sendResponse);
        return;
    }
    const mod = request.bmh.getModByHash(request.message.data);
    request.sendResponse({
        errors: mod.errorCather.getErrors(),
        code: mod.raw,
    });
    return true;
}

function getInstalled(request: MessageRequest) {
    if (!isPopup(request.sender)) {
        onlyPopup(request.sendResponse);
    } else {
        request.sendResponse(request.bmh.getInstalledModsMeta(request.message.data));
    }
    return false;
}

async function openModMenu(request: MessageRequest<BackgroundMessageOpenInModMenu>) {
    if (!isPopup(request.sender)) {
        onlyPopup(request.sendResponse);
        return;
    }
    const tabs = await getTabs({ active:true, currentWindow: true });
    const tab = tabs[0];
    if(tab){
        sendMessageToContent(tab.id, {
            type: "open-mod-menu",
        } as BackgroundMessageOpenInModMenu);
    }
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
