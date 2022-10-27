import { Logger } from "../utils/logger";
import { TC_Toaster } from "../utils/Toaster";
import { BackgroundMessageHandler } from "../utils/backgroundCom";
import { Injector } from "./injector";
import { askToRefresh, handleError, isStealthMode } from "../utils/utils";
import { BackgroundMessageGetOriginEnabled, BackgroundMessageModMessage, ContentMessageInjectorModError, ContentMessageInjectorModLoad, ContentMessageInjectorModMessage, ContentMessageInjectorModUnload, ContentMessageModStorageUpdate, InjectorData } from "../background/backgroundEventInterface";
import { ModMetaCode } from "../modUtils/modInterfaces";
import { OriginSettings } from "../interfaces";
import runtime from "../browserCompatibility/browserRuntime";

export async function createContentController(bgHandler: BackgroundMessageHandler, inject?: InjectorData) {
    const injector = new Injector(inject);
    const shownTime = 1000 * 1;
    bgHandler.on("content-enabled", async (data: InjectorData) => {
        const toast = !isStealthMode(injector.injectorData?.settings || data?.settings) && TC_Toaster.makeToast("TC injector", data ? "Injecting..." : "Disinfecting...").show(Number.MAX_SAFE_INTEGER);
        try {
            if (data) {
                injector.injectorData = data;
                await injector.inject();
                try {
                    onInjection(injector, bgHandler);
                } catch (error) {
                    Logger.error(error);
                    try {
                        await injector.disinfect();
                    } catch (error) {
                        Logger.error(error);
                        throw new Error("Injection failed!");
                    }
                }
            } else {
                await injector.disinfect();
            }
        } catch (error) {
            toast && toast.setType("error").setDescription("Failed!");
            if (!data) {
                askToRefresh("Failed to disinfect page! Would you like to refresh the page?");
                return;
            }
        }
        toast && toast.setType("info").setDescription(data ? "Injected" : "Sterilized").show(shownTime);
    });
    if (inject) {
        const toast =  !isStealthMode(injector.injectorData?.settings) &&  TC_Toaster.makeToast("TC injector", "Injecting...").show(Number.MAX_SAFE_INTEGER);
        try {
            await injector.inject();
            try {
                await onInjection(injector, bgHandler);
            } catch (error) {
                await injector.disinfect();
                throw new Error("Injection failed!");
            }
            toast && toast.setDescription("Injected").show(shownTime);
        } catch (error) {
            Logger.error(error);
            askToRefresh("Failed to inject script! Would you like to try again?");
        };
    }

}


async function onInjection(injector: Injector, bgHandler: BackgroundMessageHandler) {
    const eventHandler = injector.eventHandler;
    // When connection has been establish we first query status to venom to check if it has full control over webpage
    const status = await eventHandler.sendPromise<{working: boolean}>({type: "status"});
    if (status.working !== true) { // We throw error as we don't want to continue if the script doesn't have full access!
        throw new Error("Script does not have full access over webpage!");
    }
    runtime.sendMessage({ type: "get-origin-enabled-mods", data: origin } as BackgroundMessageGetOriginEnabled).then((mods: ModMetaCode[]) => {
        eventHandler.sendMessage({ type: "init-mods", data: mods});
    });

    eventHandler.on("onpromise", (event, cb) => {
        const handleStorageCallBack = (response: any) => {
            const error = handleError(response, false);
            if (error) {
                cb(undefined, response);
            } else {
                cb(response);
            }
        };


        switch (event.type) {
            case "storage-get":
                runtime.sendMessage({
                    type:"mod-storage-update",
                    data: {
                        type: "storage-get",
                        hash: event.data.hash,
                        key: event.data.key,
                    }
                } as ContentMessageModStorageUpdate).then(handleStorageCallBack);
                break;
            case "storage-set":
                runtime.sendMessage({
                    type:"mod-storage-update",
                    data: {
                        type: "storage-save",
                        hash: event.data.hash,
                        key: event.data.key,
                        value: event.data.value,
                    }
                } as ContentMessageModStorageUpdate).then(handleStorageCallBack);
                break;
            case "storage-delete":
                runtime.sendMessage({
                    type:"mod-storage-update",
                    data: {
                        type: "storage-delete",
                        hash: event.data.hash,
                        key: event.data.key,
                    }
                } as ContentMessageModStorageUpdate).then(handleStorageCallBack);
                break;
            case "mod-message":
                runtime.sendMessage({
                    type: "injector-mod-message",
                    data: {
                        hash: event.data.hash,
                        data: event.data.data
                    },
                } as ContentMessageInjectorModMessage).then(handleStorageCallBack);
                break;

            default:
                cb(undefined, new Error("Unhandled"));
                break;
        }
    });

    eventHandler.on("onmessage", (event) => {
        const handleStorageCallBack = (response: any) => {
            handleError(response);
        };
        switch (event.type) {
            case "mod-load":
                runtime.sendMessage({
                    type: "injector-mod-load",
                    data: event.data,
                } as ContentMessageInjectorModLoad).then(handleStorageCallBack);
                break;
            case "mod-unload":
                runtime.sendMessage({
                    type: "injector-mod-unload",
                    data: event.data,
                } as ContentMessageInjectorModUnload).then(handleStorageCallBack);
                break;
            case "mod-error":
                runtime.sendMessage({
                    type: "injector-mod-error",
                    data: event.data,
                } as ContentMessageInjectorModError).then(handleStorageCallBack);
                break;

            default:
                break;
        }

    });

    bgHandler.on("inject-mod", (modData: ModMetaCode) => {
        eventHandler.sendMessage({
            type: "mod-enable",
            data: modData
        });
    });
    bgHandler.on("extract-mod", (hash: any) => {
        eventHandler.sendMessage({
            type: "mod-disable",
            data: hash
        });
    });
    bgHandler.on( "open-mod-menu", () => {
        eventHandler.sendMessage({
            type: "open-mod-menu",
        });
    });
    bgHandler.on("origin-settings-update", (settings: OriginSettings) => {
        eventHandler.sendMessage({
            type: "settings-update",
            data: settings
        });
    });
    bgHandler.on("mod-message", (rq: BackgroundMessageModMessage["data"], cb) => {
        eventHandler.sendPromise({
            type: "mod-message",
            data:{
                hash: rq.hash,
                data: rq.data
            }
        }, Number.MAX_SAFE_INTEGER) // No limitation on user generated request
            .then(result => {
                cb(result);
            }).catch(err => {
                cb(undefined, err);
            });

        return true;
    });
}

