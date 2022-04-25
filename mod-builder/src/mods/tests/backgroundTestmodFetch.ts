/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

interface GlobalContext {
    g?: number
    events: any[]
}
interface TabContext {
    t?: number
}


export default class BackgroundTesterModFetch extends IBaseMod {

    static get flags(): ModFlags[] {
        return [
            "background-script"
        ];
    }

    static get modName() {
        return "Background tester fetch";
    }
    static get description() {
        return "This mod should fail to make any requests because of missing request permission";
    }
    static get version() {
        return "0.0.0";
    }

    static background(_event: any) {
        const event = _event as ModBackgroundEvent<GlobalContext, TabContext, number>;
        if(event.type === "mod-install") {
            (async () => {
                try {
                    console.error("installed fetching");
                    const result = await fetch("localhost:5000");
                    console.error("got result", result);
                } catch (error) {
                    console.error("got error", error);
                }
            })();
        }
    }

}

registerMod(BackgroundTesterModFetch);
