import { chromeGetItem, chromeSetItem, getTabs } from "../utils/chrome";
import { attachDebugMethod, checkRegOrString, getOrigin, pushUniq, removeItem, sortMods, tryCatch } from "../utils/utils";
import { ModContext } from "../interfaces";
import { ModActualStorage, ModMeta, ModMetaCode, ModMetaCodeWithStorage, ModMetaCompiled } from "../modUtils/modInterfaces";
import { MOD_KEY, ORIGIN_KEY } from "../constants";
import { compileModSafe, compileModInContext } from "../modUtils/modCompiler";
import { Logger } from "../utils/logger";
import { ModBackgroundInstall, ModBackgroundLoad, ModBackgroundUninstall, ModBackgroundUnload } from "../commonInterface";
import { sendMessageToContent } from "./sendMessage";
import { noop } from "lodash";
import semver from "semver";
import { ModDeveloper } from "./ModDeveloper";

if (SCRIPT_TYPE !== "background") {
    throw new Error("modsUtils.ts can only be imported on background script");
}

interface ModData {
    dev?: boolean;
    storage: ModActualStorage;
    enabledOnOrigins: string[];
}
export interface Mod extends ModData {
    mod: ModMetaCompiled;
    raw: string;

    errorCather: {
        getErrors: () => any[];
        caught:(data: any) => void;
    }

    modderContext: any,

    context: ModContext <any, any>;
}

interface ModMetaCodeWithStorageAndOrigins extends ModMetaCodeWithStorage {
    enabledOnOrigins: string[];
};

export class BackgroundModHandler {
    private static instance: BackgroundModHandler;
    private _enabledOrigins: string[] = [];

    private readonly mods: Mod[] = [];
    private readonly _scriptModifiers: Mod[] = [];
    private readonly _backgroundMods: Mod[] = [];
    constructor() {
        ModDeveloper["_bmh"] = this;
        attachDebugMethod("BackgroundModHandler", this);
    }

    async getInstance() {
        if(BackgroundModHandler.instance) {
            return BackgroundModHandler.instance;
        }
    }


    async init() {
        const modsRaw = await ModSaver.getInstance().load();
        const readySort = modsRaw.map(e => {
            return {
                ...e.modMetaCode,
                ref: e,
            };
        });
        const sorted = sortMods(readySort);
        for (const sortItem of sorted) {
            const modRaw = sortItem.ref;
            try {
                const mod = await this.createRunningMod(modRaw.modMetaCode.code, modRaw.storage);
                if (mod.mod.flags.includes("background-script")) {
                    const event: ModBackgroundLoad<any> = {
                        type: "mod-load",
                        context: {
                            global: mod.context.global
                        }
                    };
                    mod.mod.mod.background(event);
                }
                mod.enabledOnOrigins = modRaw.enabledOnOrigins;
                this.pushMods(mod);

            } catch (error) {
                Logger.error("Unable to create mod", error);
            }
        }

        const origins = await chromeGetItem(ORIGIN_KEY);
        this._enabledOrigins = origins || this._enabledOrigins;
    }

    addOrigin(origin: string) {
        //Logger.debug("BackgroundModHandler.addOrigin", origin);
        pushUniq(this._enabledOrigins, origin);
        this.saveOrigins();
    }
    removeOrigin(origin: string) {
        //Logger.debug("BackgroundModHandler.removeOrigin", origin);
        removeItem(this._enabledOrigins, origin);
        for (const modDef of this.mods) {
            removeItem(modDef.enabledOnOrigins, origin);
        }

        this.saveOrigins();
    }
    getModByName(name: string) {
        return this.mods.filter(m => m.mod.name === name);
    }
    getModByDependencyName(name: string) {
        return this.mods.filter(m => m.mod.dependency === name);
    }
    async installMod(modRaw: ModMetaCode): Promise<Mod> {
        const storedMods = await ModSaver.getInstance().load();
        let mod = this.installedMods.find(e => e.mod.hash === modRaw.hash);
        if (!mod && modRaw.dev) {
            mod = this.installedMods.find(e => e.mod.name === modRaw.name && e.mod.description === modRaw.description);
        }
        const storage = mod?.storage;
        const enabledOnOrigins = mod?.enabledOnOrigins;
        if (mod) {
            if (mod.dev) {
                await this.uninstallMod(mod.mod.hash);
            } else {
                throw new Error("Mod already installed");
            }
        }

        const compiledMod = await this.createRunningMod(modRaw.code);
        if (modRaw.dev) {
            compiledMod.dev = true;
            compiledMod.mod.dev = true;
            compiledMod.mod.hash = modRaw.hash;
            if(storage) {
                compiledMod.storage = storage;
            }
            if (enabledOnOrigins) {
                compiledMod.enabledOnOrigins = enabledOnOrigins;
            }
        }

        if (!compiledMod.mod.flags.includes("background-script")) {
            compiledMod.mod.mod.background = noop;
        }

        const installEvent: ModBackgroundInstall<any> = {
            type: "mod-install",
            context: {
                global: compiledMod.context.global
            }
        };
        await tryCatch(() => compiledMod.mod.mod.background(installEvent), compiledMod.errorCather.caught);
        const loadEvent: ModBackgroundLoad<any> = {
            type: "mod-load",
            context: {
                global: compiledMod.context.global
            }
        };
        await tryCatch(() => compiledMod.mod.mod.background(loadEvent), compiledMod.errorCather.caught);

        this.pushMods(compiledMod);
        storedMods.push({
            modMetaCode: modRaw,
            storage: compiledMod.storage,
            enabledOnOrigins: compiledMod.enabledOnOrigins,
        });
        ModSaver.getInstance().save(storedMods);
        Logger.debug(`Mod installed ${compiledMod.mod.name}`);
        return compiledMod;
    }
    async uninstallModAllDevMods() {
        const mods = this.mods.filter(m => m.dev);
        mods.sort((a, b) => a > b ? 1 : 0);
        for (const mod of mods) {
            await this.uninstallMod(mod.mod.hash);
        }
    }

    async uninstallMod(hash: number): Promise < boolean > {
        const storageMods = await ModSaver.getInstance().load();
        const mod = storageMods.find(e => e.modMetaCode.hash === hash);
        if (mod) {
            const runningMod = this.mods.find(m => m.mod.hash === hash);

            // uninstall required mods
            for (const runningModDep of this.mods) {
                if (runningModDep.mod.requirements && runningModDep.mod.requirements.length) {
                    for (const requirement of runningModDep.mod.requirements) {
                        if (requirement.dependencyName === runningMod.mod.dependency && semver.gte(runningMod.mod.version, requirement.version)) {
                            try {
                                await this.uninstallMod(runningModDep.mod.hash);
                            } catch (error) {
                                Logger.error("Uninstalling required mod failed", error);
                            }
                            runningModDep.enabledOnOrigins.length = 0;
                        }
                    }
                }
            }

            const origins = runningMod.enabledOnOrigins;
            const tabs = await getTabs();
            for (const tab of tabs) {
                const tabOrigin = getOrigin(tab.url);
                if (origins.includes(tabOrigin)) {
                    await sendMessageToContent(tab.id, {
                        type: "extract-mod",
                        data: hash
                    });
                }
            }

            const unloadEvent: ModBackgroundUnload<any> = {
                type: "mod-unload",
                context: {
                    global: runningMod.context.global
                }
            };

            await tryCatch(() => runningMod.mod.mod.background(unloadEvent), runningMod.errorCather.caught);
            const loadEvent: ModBackgroundUninstall<any> = {
                type: "mod-uninstall",
                context: {
                    global: runningMod.context.global
                }
            };
            await tryCatch(() => runningMod.mod.mod.background(loadEvent), runningMod.errorCather.caught);
            if (runningMod) {
                this.removeMods(runningMod);
            }
            removeItem(storageMods, mod);

            runningMod.mod.destroy();
            ModSaver.getInstance().save(storageMods);
            return true;
        }
        return false;
    }

    async disableAllModThatRequires(modDef: ModMetaCompiled){
        // Disabling all the mods that requires this mod!
        for (const runningModDep of this.mods) {
            if (runningModDep.mod.requirements && runningModDep.mod.requirements.length) {
                for (const requirement of runningModDep.mod.requirements) {
                    if (requirement.dependencyName === modDef.dependency && semver.gte(modDef.version, requirement.version)) {
                        const tabs = await getTabs();
                        for (const tab of tabs) {
                            await sendMessageToContent(tab.id, {
                                type: "extract-mod",
                                data: runningModDep.mod.hash
                            });
                        }
                        runningModDep.enabledOnOrigins.length = 0;
                    }
                }
            }
        }
    }

    getInstalledModsMeta(origin ? : string): ModMeta[] {
        if (origin) {
            return this.mods.filter(mod =>{
                if (mod.mod.mod.origins?.length) {
                    for (const originSearcher of mod.mod.mod.origins) {
                        if (checkRegOrString(originSearcher, origin)) {
                            return true;
                        }
                    }
                } else {
                    return true;
                }
                return false;
            }).map(this.mapToModMeta);
        }
        return this.mods.map(this.mapToModMeta);
    };

    static mapToModMeta({ mod }: Mod): ModMeta {;
        return {
            description: mod.description,
            name: mod.name,
            hash: mod.hash,
            flags: mod.flags,
            priority: mod.priority || 0,
            version: mod.version,
            dependency: mod.dependency,
            requirements: mod.requirements,
            dev: mod.dev,
            origins: mod.origins && mod.origins.length ? mod.origins : undefined,
        };
    }
    mapToModMeta(mod: Mod) {
        return BackgroundModHandler.mapToModMeta(mod);
    }

    static mapToModMetaCode(mod: Mod): ModMetaCode {
        const modMeta = BackgroundModHandler.mapToModMeta(mod);
        return {
            ...modMeta,
            code: mod.raw,
        };
    }
    mapToModMetaCode(mod: Mod) {
        return BackgroundModHandler.mapToModMetaCode(mod);
    }

    private async createRunningMod(code: string, storage?: ModActualStorage): Promise<Mod> {
        const compiledModSafe = await compileModSafe(code, storage);
        compiledModSafe.destroy();
        const compiledMod = await compileModInContext(code, compiledModSafe.flags, storage);

        const errors = [];

        if (compiledMod.requirements && compiledMod.requirements.length) {
            for (const { dependencyName, version} of compiledMod.requirements) {
                const foundMod = this.mods.find(m => m.mod.dependency === dependencyName);
                if (foundMod) {
                    if (!semver.gte(version, compiledMod.mod.version)) {
                        compiledMod.destroy();
                        throw new Error(`Dependency version mismatch. Required ${version}`);
                    }
                    const cmm = compiledMod.mod;
                    if (!cmm.installedDependencies) {
                        cmm.installedDependencies = {};
                    }
                    cmm.installedDependencies[dependencyName] = {
                        version,
                        name: dependencyName,
                        methods: foundMod.mod.mod.exportMethods && foundMod.mod.mod.exportMethods(),
                    };
                } else {
                    compiledMod.destroy();
                    throw new Error(`Missing dependence ${dependencyName}-${version}+`);
                }
            }
        }

        return {
            mod: compiledMod,
            raw: code,
            storage: {
                staticMethod: compiledMod.storage.staticMethod,
                local: compiledMod.storage.local
            },
            errorCather: {
                caught: (error) => {
                    if (errors.length > 10) {
                        errors.shift();
                    }
                    errors.push(error);
                },
                getErrors: () => [...errors]
            },
            modderContext: {},
            enabledOnOrigins: [],
            context: {
                global: {},
                tabs: new Map()
            }
        };
    }

    private saveOrigins() {
        chromeSetItem(ORIGIN_KEY,   this._enabledOrigins);
    }
    private pushMods(mod: Mod) {
        this.mods.push(mod);
        if (mod.mod.flags.find(e => e === "modify-request") && mod.mod.mod.modifyCodes && mod.mod.mod.modifyCodes.length) {
            this._scriptModifiers.push(mod);
        }
    }

    private removeMods(mod: Mod) {
        removeItem(this.mods, mod);
        removeItem(this._scriptModifiers, mod);
        //removeItem(backgroundMods, mod);
    }
    getModByHash(hash: number) {
        const found = this.mods.find(m => m.mod.hash === hash);
        if (found) {
            return found;
        }
        throw new Error("Mod does not exist!");
    }
    getOriginMods(origin: string) {
        const enabledModsOnOrigin: Mod[] = [];
        for (const mod of this.mods) {
            if (this.isModEnabledOnOrigin(mod.mod.hash, origin)) {
                enabledModsOnOrigin.push(mod);
            }
        }
        return enabledModsOnOrigin;
    }
    isModEnabledOnOrigin(hash: number, origin: string) {
        const mod = this.getModByHash(hash);
        if (mod.mod.origins?.length) {
            for (let i = 0; i < mod.mod.origins.length; i++) {
                if (checkRegOrString(mod.mod.origins[i], origin)) {
                    return mod.enabledOnOrigins.includes(origin);
                }
            }
        } else {
            return mod.enabledOnOrigins.includes(origin);
        }
        return false;
    }
    enableDisableModOnOrigin(hash: number, value: boolean, origin: string) {
        Logger.debug(hash, value, origin);
        const mod = this.getModByHash(hash);
        if(value) {
            if(mod.mod.origins && mod.mod.origins.length) {
                for (let i = 0; i < mod.mod.origins.length; i++) {
                    if (checkRegOrString(mod.mod.origins[i], origin)) {
                        pushUniq(mod.enabledOnOrigins, origin);
                        this.saveModStorage();
                        return;
                    }
                }
            } else {
                pushUniq(mod.enabledOnOrigins, origin);
                this.saveModStorage();
            }
        } else {
            removeItem(mod.enabledOnOrigins, origin);
            this.saveModStorage();
        }
    }
    saveModStorage = async ()  =>{
        const storage = ModSaver.getInstance();
        const storageMods = await storage.load();
        for (let i = 0; i < storageMods.length; i++) {
            for (let j = 0; j < this.mods.length; j++) {
                if (storageMods[i].modMetaCode.hash === this.mods[j].mod.hash) {
                    storageMods[i].storage = this.mods[j].storage;
                    storageMods[i].enabledOnOrigins = this.mods[j].enabledOnOrigins;
                }
            }
        }
        storage.save(storageMods);
    };
    get installedMods(){
        return this.mods;
    }
    get backgroundMods() {
        return this._backgroundMods;
    }
    get scriptModifiersMods() {
        return this._scriptModifiers;
    }
    get enabledOrigins() {
        return this._enabledOrigins;
    }
}


export class ModSaver {
    private static instance: ModSaver;
    private cachedLoaded: ModMetaCodeWithStorageAndOrigins[];
    private isSaving = false;
    private shouldResave: boolean;
    static getInstance() {
        if (!ModSaver.instance) {
            ModSaver.instance = new ModSaver();
        }
        return ModSaver.instance;
    }
    async save(storageMods: ModMetaCodeWithStorageAndOrigins[]) {
        Logger.debug(`Save request!`);
        if (this.isSaving) {
            this.shouldResave = true;
            this.cachedLoaded = storageMods;
            Logger.debug(`Save request rejected`);
            return;
        }
        Logger.debug(`Save request working on it`);
        this.isSaving = true;
        const filteredMods = storageMods.filter(m => !m.modMetaCode.dev);
        await chromeSetItem(MOD_KEY, filteredMods);
        Logger.debug(`Saved ${storageMods.length} mods`);
        this.isSaving = false;
        if (this.shouldResave) {
            this.shouldResave = false;
            this.save(this.cachedLoaded);
        }
    }
    async load() {
        if (this.cachedLoaded) {
            return this.cachedLoaded;
        }
        const data = await chromeGetItem <ModMetaCodeWithStorageAndOrigins[]> (MOD_KEY);
        this.cachedLoaded = data || [];
        return this.cachedLoaded;
    }
}
