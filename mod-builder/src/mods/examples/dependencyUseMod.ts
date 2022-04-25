/// <reference path="../../helpers/global.d.ts" />
import { registerMod } from "../../helpers/utils";
declare interface DependencyModDps extends DependencyObject {
    lodash: ModDependency</*LoDashStatic*/ any>
}


export default class DependencyMod extends IBaseMod /* base mod will initialized durning runtime */ {
    static get modName() {
        return "Example lodash user";
    }
    static get description() {
        return "This is a test mod that uses other mod";
    }
    static get version() {
        return "0.0.0";
    }

    static get requirements() {
        return [
            `lodash-5.5.5`
        ];
    }
    onLoad() {
        const dps = this.installedDependencies as DependencyModDps;
        this.LogDeps(dps, false);
        this.LogDeps(DependencyMod.installedDependencies as DependencyModDps, true);
        const result = dps.lodash.methods.random(0, 10);
        console.log("random value from 0 to 10", result);
    }
    LogDeps (deps: DependencyModDps, s: boolean) {
        if (deps.lodash) {
            const msg = s ? "static" : "prototype";
            console.log(deps.lodash.name, deps.lodash.version);
            const methods = Object.keys(deps.lodash.methods);
            for (const method of methods) {
                const type = typeof deps.lodash.methods[method];
                if (type === "function") {
                    console.log(`[${msg}][${type}] fn ${method}`);
                }  else {
                    console.log(`[${msg}][${type}] ${method}`);
                }
            }
        }
    }

    onUnload() {
    }
}

registerMod(DependencyMod);
