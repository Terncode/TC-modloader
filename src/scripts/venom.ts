/// <reference path="../fix.d.ts" />


import { VenomEventHandler } from "../venom/venomEventHandler";
import { Logger } from "../utils/logger";
import { askToRefresh, attachDebugMethod, objectifyError } from "../utils/utils";
import { ModLoader } from "../venom/modLoader";

async function start() {
    const eventHandler = new VenomEventHandler();
    attachDebugMethod("eventHandler", eventHandler);

    const loader = new ModLoader();
    attachDebugMethod("modLoader", loader);

    loader.setItem =  (hash, key, value, isStatic) => {
        return eventHandler.sendPromise({
            type:"storage-set",
            data: {
                hash,
                key,
                value,
                isStatic
            }
        });
    };
    loader.getItem = (hash, key, isStatic) => {
        return eventHandler.sendPromise({
            type:"storage-get",
            data: {
                hash,
                key,
                isStatic
            }
        });
    };
    loader.deleteItem = (hash, key, isStatic) => {
        return eventHandler.sendPromise({
            type: "storage-delete",
            data: {
                hash,
                key,
                isStatic
            }
        });
    };

    loader.onModError = (hash, err) => {
        eventHandler.sendMessage({
            type: "mod-error",
            data: {
                hash,
                error: objectifyError(err),
            }
        });
    };
    loader.onModLoad = (hash) => {
        eventHandler.sendMessage({
            type: "mod-load",
            data: {
                hash,
                runningModsCount: loader.activeMods
            },
        });
    };
    loader.onModUnload = (hash) => {
        eventHandler.sendMessage({
            type: "mod-unload",
            data: {
                hash,
                runningModsCount: loader.activeMods
            },
        });
    };
    loader.onModMessage = (hash, message) => {
        return eventHandler.sendPromise({
            type: "mod-message",
            data: {
                hash,
                data: message
            },
        });
    };

    eventHandler.on("onmessage", data => {
        switch (data.type) {
            case "init-mods":
                data.data.forEach(mod => loader.pushMod(mod));
                break;
            case "mod-enable":
                loader.pushMod(data.data, true);
                break;
            case "mod-disable":
                loader.popMod(data.data);
                break;
            case "settings-update":
                loader.setSettings(data.data);
                break;
            case "open-mod-menu":
                loader.openGui();
                break;
            default:
                Logger.debug("unhandled", data);
                break;
        }
    });
    eventHandler.on("onpromise", async (data, cb) => {
        switch (data.type) {
            case "destroy":
                try {
                    await loader.destroy();
                    eventHandler.destroy();
                } catch (error) {
                    askToRefresh("Failed to unload script!\n Would you like to refresh?");
                    return cb(undefined, error);
                }
                return cb(undefined);
            case "status":
                try {
                    new Function()();
                    cb({working: true});
                } catch (error) {
                    cb({working: false});
                }
                return;
            case "mod-message": {
                try {
                    const message = await loader.receiveMessage(data.data.hash, data.data.data);
                    cb(message);
                } catch (error) {
                    cb(undefined, error);
                }
                break;
            }
            default:
                Logger.debug("Unhandled promise", data);
                cb(undefined, new Error("unhandled"));
                break;
        };
    });

    const settings = await eventHandler.start();
    loader.setSettings(settings);
    Logger.debug("Injected");
}

Logger.debug("Start");
start();
