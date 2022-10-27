import tabs from "../browserCompatibility/browserTabs";
import { DEV_URLS } from "../constants";
import { compileModSafe } from "../modUtils/modCompiler";
import { ModMetaCompiledVM } from "../modUtils/modInterfaces";
import { getTabs } from "../utils/chrome";
import { Logger } from "../utils/logger";
import { getOrigin, sortMods, vmModToModCode } from "../utils/utils";
import { BackgroundModHandler } from "./modsUtils";
import { showToastFromBackground } from "./sendMessage";

interface ModDevInstalledMods {
    type: "install-mods", data: string[]
}

export class ModDeveloper {
    private static _bmh: BackgroundModHandler;
    private static instance: ModDeveloper;
    private static readonly TOAST_NAME = "Dev protocol";

    private websocket: WebSocket;

    static enable() {
        if (!ModDeveloper.instance) {
            ModDeveloper.instance = new ModDeveloper();
        }
    }

    static disable() {
        if (ModDeveloper.instance) {
            ModDeveloper.instance.destroy();
            ModDeveloper.instance = undefined;
        }
    }
    static get enabled() {
        return ModDeveloper.instance ? true : false;
    }

    constructor() {
        setTimeout(() => {
            this.tryConnect();
        });
    }

    async tryConnect() {
        for (const url of DEV_URLS) {
            if (!ModDeveloper.instance) return;
            const websocket = new WebSocket(url);
            await new Promise<void>(r => {
                websocket.onclose = () => {
                    this.websocket = undefined;
                    ModDeveloper._bmh.uninstallModAllDevMods();
                    //showToastFromBackground(ModDeveloper.TOAST_NAME, `Development socket disconnected on ${url}`);
                    Logger.debug(`Development socket disconnected on ${url}`);
                    r();
                };
                websocket.onerror = error => {
                    this.websocket = undefined;
                    ModDeveloper._bmh.uninstallModAllDevMods();
                    Logger.error(error);
                    r();
                };
                websocket.onmessage = this.onMessage;
                websocket.onopen = () => {
                    showToastFromBackground(ModDeveloper.TOAST_NAME, `Development socket connected on ${url}`);
                    Logger.debug(`Development socket connected on ${url}`);
                    this.websocket = websocket;
                    websocket.send(`TC_MODLOADER:${VERSION}`);
                };
            });
        }
        setTimeout(() => {
            if (ModDeveloper.instance) {
                this.tryConnect();
            };
        }, 1000);
    }
    onMessage = async (ev: MessageEvent<string>) => {
        try {
            const json = JSON.parse(ev.data) as ModDevInstalledMods;
            switch (json.type) {
                case "install-mods": {
                    const compiled: ModMetaCompiledVM[] = [];
                    for (const modCode of json.data) {
                        try {
                            const compiledMod = await compileModSafe(window.btoa(encodeURIComponent(modCode)));
                            compiledMod.dev = true;
                            compiledMod.hash++;
                            compiledMod.destroy();
                            showToastFromBackground(ModDeveloper.TOAST_NAME, `Mod received ${compiledMod.name}`);
                            compiled.push(compiledMod);
                        } catch (error) {
                            showToastFromBackground(ModDeveloper.TOAST_NAME, `An error has occurred while trying to install mod ${error.message}`);
                            Logger.error(error);
                        }
                    }

                    // Uninstall mods specific mods
                    const mods = sortMods(compiled).map(vmModToModCode);
                    for (const mod of mods) {
                        await ModDeveloper._bmh.installMod(mod);
                    }
                    const browserTabs = await getTabs();
                    for (const tab of browserTabs) {
                        const or = getOrigin(tab.url);
                        if (!tab.id) continue;
                        for (const origin of ModDeveloper._bmh.enabledOrigins) {
                            if (or === origin) {
                                tabs.reload(tab.id);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            Logger.error(error);
        }
    };
    destroy() {
        ModDeveloper.instance = undefined;
        this.websocket?.close();
    }
}

