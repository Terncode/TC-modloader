import { BaseMod } from "../modUtils/BaseMod";
import { compileModInContext } from "../modUtils/modCompiler";
import { ModMetaCode, ModMetaCompiled } from "../modUtils/modInterfaces";
import { TC_Dialog } from "../utils/Dialogs";
import { Logger } from "../utils/logger";
import { TC_Toaster, Toast } from "../utils/Toaster";
import { askToRefresh, delay, removeItem, timeOutPromise } from "../utils/utils";
import semver from "semver";
import { BackgroundCom, DependencyObject, ToastMethods } from "../commonInterface";
import { ModGui } from "./gui";
import { ButtonActivationPosition, InjectorType, OriginSettings, StealthMode } from "../interfaces";

export interface RunningMod extends ModMetaCompiled {
    running: BaseMod;
}

interface ModMetaCodeEx extends ModMetaCode {
    showCodeModifierPrompt?: boolean;
}

export class ModLoader {
    private settings: OriginSettings = {
        activateButtonPosition: ButtonActivationPosition.None,
        injectorType: InjectorType.Normal,
        origin,
        stealthMode: StealthMode.Strict
    };
    private gui: ModGui;
    private modsMap = new Map<number, RunningMod>();
    private actions: (ModMetaCodeEx | number)[] = [];
    private processing = false;
    private messageProcessor = new Map<number, (obj: any) => Promise<any> | any>();

    async setItem(_hash: number, _key: string, _value: any, _static: boolean): Promise<any> {}
    async getItem(_hash: number, _key: string, _static: boolean): Promise<any> {}
    async deleteItem(_hash: number, _key: string, _static: boolean): Promise<any> {}

    onModError(_hash: number, _error: any): void {}
    onModLoad(_hash: number): void {}
    onModUnload(_hash: number): void {}
    async onModMessage(_hash: number, _message: any): Promise<any> {}

    private loader = TC_Toaster.makeToast("Mod loader", "Loading....");
    private readonly toastShowTime = 1000 * 3;

    constructor() {
        this.gui = new ModGui(this.settings);
    }
    async destroy() {
        const mods = this.mods;
        const noDependency = mods.filter(m => !m.dependency);
        for (const { hash } of noDependency) {
            await this.unloadMod(hash, true);
        }

        const mods2 = this.mods;
        const requirements = mods2.filter(m => !m.requirements);
        for (const { hash } of requirements) {
            await this.unloadMod(hash, true);
        }

        for (const { hash } of this.mods) {
            await this.unloadMod(hash, true);
        }

        this.gui.destroy();
    }

    setSettings(settings: OriginSettings) {
        this.settings = settings;
        this.gui.updateSettings(settings);

    }
    openGui() {
        this.gui.show();
    }

    async pushMod(mod: ModMetaCode, showPrompt = false) {
        const toRemove = this.actions.filter(m => typeof m === "object" && m.hash === mod.hash);
        for (const remove of toRemove) {
            removeItem(this.actions, remove);
        }

        this.actions.push({
            ...mod,
            showCodeModifierPrompt: showPrompt && mod.flags.includes("modify-request")
        });
        this.process();
    }
    popMod(hash: number) {
        const toRemove = this.actions.filter(m =>  typeof m === "number" && m === hash);
        for (const remove of toRemove) {
            removeItem(this.actions, remove);
        }
        const found = this.modsMap.get(hash);
        if (found) {
            this.actions.push(hash);
            this.process();
        }
    }

    private process = async () => {
        if (this.processing || !this.actions.length) return;
        this.processing = true;
        try {
            const pop = this.actions.shift();
            if (typeof pop === "number") {
                await this.unloadMod(pop, true);
            } else {
                if (pop.showCodeModifierPrompt) {
                    const modName = pop.name;
                    const result = await TC_Dialog.confirm([
                        `The mod "${modName}" requires code modification.`,
                        `Would you like to refresh the page?`,
                    ].join("\n"));
                    if (result) {
                        location.reload();
                        !this.isStrictMod && this.loader.setType("info").setDescription("Reloading page!").show(Number.MAX_SAFE_INTEGER);

                        return;
                    }
                    const time = 1000 * 4;
                    !this.isStrictMod && this.loader.setType("error").setDescription("Reloading canceled!").show(time);
                    await delay(time);
                }
                await this.loadMod(pop);
            }
        } catch (error) {
            Logger.error(error);
        }
        this.processing = false;
        this.process();
    };

    async loadMod(mod: ModMetaCode) {
        if(this.modsMap.has(mod.hash)) {
            !this.isStrictMod && TC_Toaster.makeToast("Mod loader", `Mod "${mod.name}" is already active`).show(this.toastShowTime);
            return;
        }
        let toast: Toast;
        if (!this.isStrictMod) {
            Logger.debug(`Loading "${mod.name}"`);
            toast = TC_Toaster.makeToast("Mod loader", `Loading "${mod.name}"`).show(this.toastShowTime);
        }
        let hash = mod.hash;
        const compiled = await compileModInContext(mod.code, mod.flags);
        compiled.hash = mod.hash;

        const prototypeDependency: DependencyObject = {};

        if (compiled.requirements && compiled.requirements.length) {
            for (const { dependencyName, version} of compiled.requirements) {
                const foundMods = this.mods.filter(m => m.dependency === dependencyName);
                if (foundMods.length) {
                    const validMod= foundMods.find(m => semver.gte(m.version, version));
                    if (validMod) {
                        const cmm = compiled.mod;
                        if (!cmm.installedDependencies) {
                            cmm.installedDependencies = {};
                        }
                        cmm.installedDependencies[dependencyName] = {
                            version,
                            name: dependencyName,
                            methods:  validMod.mod.exportMethods && validMod.mod.exportMethods(),
                        };
                        prototypeDependency[dependencyName] ={
                            version,
                            name: dependencyName,
                            methods:  validMod.running.exportMethods && validMod.running.exportMethods(),
                        };
                    } else {
                        compiled.destroy();
                        throw new Error(`Dependency version mismatch`);
                    }
                } else {
                    compiled.destroy();
                    throw new Error(`Missing dependence ${dependencyName}`);
                }
            }
        }

        const runningMod = new compiled.mod();
        compiled.mod.setItem = (key, value) => this.setItem(hash, key, value, true);
        compiled.mod.getItem = key => this.getItem(hash, key, true);
        compiled.mod.deleteItem = key => this.deleteItem(hash, key, true);

        try {
            runningMod.installedDependencies = prototypeDependency;
            runningMod.setItem = (key, value) => this.setItem(hash, key, value, false);
            runningMod.getItem = key => this.getItem(hash, key, false);
            runningMod.deleteItem = key => this.deleteItem(hash, key, false);
            runningMod.gui = {
                appendModLayout: (a) => this.gui.appendModLayout(a),
                createBtn: (a, b, c) => this.gui.createBtn(a, b, c),
                createBtnTitle: (a, b, c, d) => this.gui.createBtnTitle(a, b, c, d),
                hide: () => this.gui.hide(),
                show: () => this.gui.show(),
                removeModLayout: (a) => this.gui.removeModLayout(a),
            };

            runningMod.toaster = {
                show: (text, type, time) => {
                    let toast: Toast;
                    const getToast = () => {
                        if(toast) {
                            return toast;
                        }
                        toast = TC_Toaster.makeToast(mod.name, text, type).show(time || 1000);
                        return toast;
                    };
                    if (!this.isStrictMod) {
                        getToast();
                    }

                    const toastMethods: ToastMethods = {
                        hide: () => {
                            !this.isStrictMod && getToast().hide();
                            return toastMethods;
                        },
                        setText: message => {
                            !this.isStrictMod && getToast().setDescription(message);
                            return toastMethods;
                        },
                        setType: type => {
                            !this.isStrictMod && getToast().setType(type);
                            return toastMethods;
                        },
                        show: (duration) => {
                            !this.isStrictMod && getToast().show(duration);
                            return toastMethods;
                        }
                    };
                    return toastMethods;
                }
            };

            runningMod.dialog = {
                alert: (text) => this.isStrictMod ? new Promise<void>(r => r(alert(text))) : TC_Dialog.alert(text),
                confirm: (text) => this.isStrictMod ? new Promise<boolean>(r => r(confirm(text))) : TC_Dialog.confirm(text),
                prompt: (text, defaultText) => this.isStrictMod ? new Promise<string>(r => r(prompt(text, defaultText))) : TC_Dialog.prompt(text, defaultText),
            };
            const fl = compiled.flags || [];
            if (fl.includes("background-script")/* || fl.includes("background-api")*/) {
                const bgObj = createBackgroundCommunicator(data => this.onModMessage(hash, data));
                runningMod["backgroundCom"] = bgObj.background;
                this.messageProcessor.set(hash, bgObj.fn);
            }

            if (runningMod.onLoad) {
                await timeOutPromise(() => runningMod.onLoad());
            }
            this.modsMap.set(mod.hash, {
                ...compiled,
                running: runningMod
            });
            if (!this.isStrictMod && toast) {
                toast.setDescription(`Loaded "${mod.name}"`).show(this.toastShowTime);
            }
            this.onModLoad(compiled.hash);
        } catch (error) {
            if (!this.isStrictMod && toast) {
                toast.setDescription(`An error has occurred on mod enable "${mod.name}"`).setType("error").show(this.toastShowTime);
            }
            Logger.error(error);
            this.onModError(compiled.hash, error);
            throw new Error(error);
        }

    }

    async unloadMod(hash: number, showMessage = false) {
        const mod = this.modsMap.get(hash);
        if (mod) {
            let toast: Toast;
            if (!this.isStrictMod) {
                toast = TC_Toaster.makeToast("Mod loader", `Unloading "${mod.name}"`).show(this.toastShowTime);
            }
            try {
                if(showMessage && mod.flags && mod.flags.includes("disable-unload")) {
                    await askToRefresh([
                        `Mod ${mod.name} has disabled unloading feature!`,
                        `Page refresh is required!`,
                        `Would you like to refresh now?`,
                    ].join("\n"));
                    return;
                }
                if (showMessage && mod.flags && mod.flags.includes("modify-request")) {
                    const modName = mod.name;
                    const result = await TC_Dialog.confirm([
                        `The mod "${modName}" is code modifier.`,
                        `Would you like to refresh the page to clean the mess?`
                    ].join("\n"));
                    if (result) {
                        location.reload();
                        if(!this.isStrictMod) {
                            toast.setType("info").setDescription("Reloading page!").show(Number.MAX_SAFE_INTEGER);
                        }
                        return;
                    }
                }
                if(mod.running.onUnload) {
                    await timeOutPromise(() => mod.running.onUnload());
                }
                this.messageProcessor.delete(hash);
                this.onModUnload(hash);
                if(!this.isStrictMod) {
                    toast.setType("info").setDescription(`Mod unloaded "${mod.name}"`).show(this.toastShowTime);
                }

            } catch (error) {
                Logger.error(error);
                askToRefresh(`Unable to unload mod "${mod.name}".\nDo you want to refresh page?`);
                this.onModError(hash, error);
            } finally {
                mod.destroy();
                this.modsMap.delete(hash);
            }
        } else {
            Logger.debug("Trying to unload not existing mod");
        }
    }
    async receiveMessage(hash: number, data: any) {
        const fn = this.messageProcessor.get(hash);
        if (fn) {
            return await fn(data);
        } else {
            throw new Error("Mod not loaded");
        }
    };

    get isStrictMod() {
        return this.settings.stealthMode === StealthMode.Strict;
    }
    get mods() {
        const runningMods: RunningMod[] = [];
        for (const [, runningMod] of this.modsMap) {
            runningMods.push(runningMod);
        }
        return runningMods;
    };
    get activeMods() {
        return this.modsMap.size;
    }
}

function createBackgroundCommunicator(onModMessage: (data) => Promise<any>) {
    let callback: (((obj: any) => Promise<any> | any) | undefined);

    const background: BackgroundCom ={
        receive: (cb) => {
            if(cb === undefined || typeof cb === "function")  {
                callback = cb;
            } else {
                throw new Error("Callback function is wrong type!");
            }
        },
        send: (data: any) => {
            return onModMessage(data);
        }
    };
    return {
        background,
        fn: (data: any) => {
            if (callback) {
                return callback(data);
            } else {
                throw new Error("Handler not attached!");
            }
        }
    };
}
