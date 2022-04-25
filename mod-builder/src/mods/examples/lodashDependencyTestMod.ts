/// <reference path="../../helpers/global.d.ts" />
import { registerMod } from "../../helpers/utils";
import * as lodash from "lodash";


export default class LodashDependencyMod extends IBaseMod /* base mod will initialized durning runtime */ {
    static get modName() {
        return "Example Lodash";
    }
    static get description() {
        return "A modern JavaScript utility library delivering modularity, performance & extras.";
    }
    static get dependencyName() {
        return "lodash";
    }
    static get version() {
        return lodash.VERSION;
    }
    static get priority() {
        return 100;
    }
    onLoad() { }
    onUnload() { }
    static exportMethods() {
        return lodash;
    }
    exportMethods(){
        return lodash;
    }
}

registerMod(LodashDependencyMod);
