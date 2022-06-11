/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

export default class TestStorage extends IBaseMod {
    static get modName() {
        return "BG Api";
    }
    static get flags(): ModFlags[] {
        return [
            "background-script",
            "background-api"
        ];
    }
    static get description() {
        return "Background api tester";
    }
    static get version() {
        return "0.0.0";
    }
    static background(_event:any) {
        const event = _event as ModBackgroundEvent<any, any, any>;
        if (event.type === "mod-load") {
            event.context.global.interval = setInterval(() => {
                console.warn("running");
                for (const [key, value] of Object.entries(event.tabs)) {
                    const v = value as ModTab;
                    console.warn(key, origin);
                    v.send("test").then(r => {
                        console.warn("result", r);
                    }).catch(err=> {
                        console.error("err", err);
                    });
                }
            }, 1000);
        }

        if (event.type === "mod-unload") {
            clearInterval(event.context.global.interval);
        }
        console.warn(event);
    }

    onLoad() {
        this.backgroundCom.receive(a => {
            return new Promise(r => {
                console.log("received", a);
                setTimeout(() => {
                    r("ok");
                }, 100);
            });
        });

    }
    onUnload(): Promise<void> | void {
    }
}
registerMod(TestStorage);
