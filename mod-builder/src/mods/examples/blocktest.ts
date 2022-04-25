/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

export default class BlockExample extends IBaseMod {
    static get flags(): ModFlags[] {
        return [
            "modify-request"
        ];
    }

    static get modName() {
        return "Example block reporting";
    }
    static get description() {
        return "Block reporting scripts";
    }
    static get version() {
        return "0.0.0";
    }

    static get modifyCodes(): RequestBlocker[] {
        /*
        If you want to modify script check out exampleModifyCode.ts
        */
        return [
            {
                searcher: /report/,
                type: ["script", "xmlhttprequest"],
                block: true,
            },
        ];
    }
}

registerMod(BlockExample);
