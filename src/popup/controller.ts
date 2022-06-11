import { BackgroundMessageFetchModDependency, BackgroundMessageModInstall } from "../background/backgroundEventInterface";
import { ModFlags } from "../commonInterface";
import { compileModSafe } from "../modUtils/modCompiler";
import { ModMetaCompiledVM, ModMeta, ModMetaCode, ModRaw } from "../modUtils/modInterfaces";
import { TC_Dialog } from "../utils/Dialogs";
import { Logger } from "../utils/logger";
import { TC_Toaster } from "../utils/Toaster";
import { handleError, removeItem, sortMods, vmModToModCode } from "../utils/utils";
import semver from "semver";
import { EventEmitter } from "events";
import { ALL_MOD_FLAGS } from "../constants";


export class PopupController {
    private static emitter = new EventEmitter();

    static onUpdate(fn:() => void) {
        PopupController.emitter.on("update", fn);
    }
    static offUpdate(fn:() => void) {
        PopupController.emitter.off("update", fn);
    }
    static async processModInstall(rawMods: ModRaw[]) {
        const compiledMods: ModMetaCompiledVM[] = [];
        const promisees: Promise<void>[] = [];
        const errored: string[] = [];
        Logger.debug(`Compiling ${rawMods.length}`);

        const message = rawMods.length > 1 ? `Compiling ${rawMods.length} mods` : "Compiling mod";
        const toast = TC_Toaster.makeToast("Compiler", message).show(Number.MAX_SAFE_INTEGER);
        for (const rawMod of rawMods) {
            Logger.debug(`Compiling ${rawMod.fileName}`);
            const promise = compileModSafe(rawMod.data).then(vmMod => {
                Logger.debug(`Compiled ${rawMod.fileName}`);
                compiledMods.push(vmMod,);
            }).catch(err => {
                Logger.debug(`Errored ${rawMod.fileName}`);
                console.error(rawMod.fileName, err);
                errored.push(rawMod.fileName);
            });
            promisees.push(promise);
        }        await Promise.all(promisees);

        if (errored.length) {
            Logger.debug(`Showing error to the user`);
            toast.setType("error").setDescription("Showing alert");
            await TC_Dialog.alert(`Failed to compile\n${errored.map(e => `  - ${e}`).join("\n")}`);
        }
        const getData = (permissions: ModFlags[]) => {
            const lines: string[] = [];
            if (permissions.includes("background-script")) {
                lines.push("- Running background script");
            }
            if (permissions.includes("modify-request")) {
                lines.push("- Request modifier");
            }
            if (permissions.includes("requests")) {
                lines.push("- Send requests");
            }
            if (permissions.includes("extend-loading")) {
                lines.push("- Extended mod loading times");
            }
            // if (permissions.includes("background-api")) {
            //     lines.push("- Running advanced background script");
            // }
            return lines.join("\n");
        };

        const toRemove: ModMetaCompiledVM[] = [];
        for (const mod of compiledMods) {
            if (mod.flags.length) {
                Logger.debug(`Found permissions for mod "${mod.name}" showing prompt to user`);
                toast.setType("info").setDescription(`Action needed for mod ${mod.name}`);
                const flags = getData(mod.flags);
                let unknownFlags = mod.flags.filter(f => !ALL_MOD_FLAGS.includes(f));
                if (unknownFlags.length > 0) {
                    await TC_Dialog.alert(`Mod "${mod.name}" has unknown flags\n${unknownFlags.join("\n")}\nThese features won't work!`);
                }
                const ok = flags ? await TC_Dialog.confirm(`Mod "${mod.name}" is using permissions\n${flags}\n\nInstall only trustworthy mods`): true;
                if (ok) {
                    Logger.debug(`User allowed mod install`);
                } else {
                    Logger.debug(`User rejected mod install`);
                    mod.destroy();
                    toRemove.push(mod);
                }
            }
        }
        toRemove.forEach(mod => removeItem(compiledMods, mod));
        const sorted = sortMods(compiledMods);

        if (sorted.length) {
            const errors: string[] = [];
            for (let i = 0; i < sorted.length; i++) {
                try {
                    const compiledMod = sorted[i];
                    let breakout = false;
                    if (compiledMod.requirements && compiledMod.requirements.length) {
                        for (const {dependencyName, version} of compiledMod.requirements) {
                            const mods = await this.fetchByName(dependencyName);
                            const theRightMod = mods.find(e => {
                                return e.dependency === dependencyName && semver.gte(e.version, version);
                            });
                            if (!theRightMod) {
                                await TC_Dialog.alert(`Missing dependency mod ${dependencyName}\n version ${version} or higher required.`);
                                errors.push(compiledMod.name);
                                breakout = true;
                                continue;
                            }
                        }
                        if (breakout) continue;
                    }
                    const existing = await this.fetchByName(compiledMod.name);
                    const sameMod = existing.find(m => m.version === compiledMod.version);
                    if (sameMod) {
                        const yes = await TC_Dialog.confirm([
                            `Mod "${compiledMod.name}" version\n${compiledMod.version}`,
                            `is already installed but this version has different code!`,,
                            `Do you want to install second instance?`,
                        ].join("\n"));
                        if (!yes) {
                            continue;
                        }
                    }

                    await PopupController.sendModInstallBackground(vmModToModCode(compiledMod));
                } catch (error) {
                    Logger.error(compiledMods[i].name, error);
                    errors.push(compiledMods[i].name);
                }
            }
            if (errors.length) {
                await TC_Dialog.alert(`Unable to install\n - ${errors.join("\n - ")}`);
            }
            const totalInstalled = compiledMods.length - errors.length;
            if (totalInstalled) {
                TC_Dialog.alert(`Installed ${totalInstalled} mod${totalInstalled > 1 ? "s" : ""}`);
            }
        } else {
            Logger.debug(`No new installed`);
            TC_Dialog.alert("No new mods installed");
        }
    }

    private static fetchByName(name: string) {
        return new Promise<ModMeta[]>((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: "fetch-mod-dependency-name",
                data: name
            } as BackgroundMessageFetchModDependency, response => {
                const error = handleError(response, false);
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    private static sendModInstallBackground(mod: ModMetaCode) {
        return new Promise<void>((resolve, reject) => {
            chrome.runtime.sendMessage({
                type:"mod-install",
                data: mod
            } as BackgroundMessageModInstall, response => {
                const error = handleError(response, false);
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

}
