/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

export default class NoRollbarMod extends IBaseMod {
    static get flags(): ModFlags[] {
        return [
            "modify-request",
        ];
    }
    static get modName() {
        return "No rollbar";
    }
    static get description() {
        return "Disable rollbar tracking";
    }
    static get version() {
        return "1.0.0";
    }
    static get dependencyName() {
        return "norbr";
    }
    static get priority() {
        return 100;
    }
    static get modifyCodes(): CodeModerOrBlocker[] {
        return [
            {
                searcher: "api.rollbar.com",
                type: "xmlhttprequest",
                block: true,
            } as RequestBlocker,
        ];
    }

    onLoad() {
        // no logic because the backgruond is taking care of blocking
    }

    onUnload() {

    }
}

registerMod(NoRollbarMod);
