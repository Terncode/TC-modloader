/// <reference path="../../helpers/global.d.ts" />
import { registerMod } from "../../helpers/utils";

export default class DependencyMod extends IBaseMod /* base mod will initialized durning runtime */ {
    static get modName() {
        return "lodash user 9999";
    }
    static get description() {
        return "This is a test mod that uses other mod";
    }
    static get version() {
        return "0.0.0";
    }
    static get requirements() {
        return [
            `lodash-999.999.999`
        ];
    }
    onLoad() {
        console.log("method should be available!");
    }
    onUnload() {
        console.log("unloading"!);
    }
}

registerMod(DependencyMod);
