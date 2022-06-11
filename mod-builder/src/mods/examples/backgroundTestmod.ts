/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

interface GlobalContext {
    g?: number
    events: any[]
}
interface TabContext {
    t?: number
}


export default class ExampleBackgroundMod extends IBaseMod {
    private frame: NodeJS.Timeout;
    private count = 0;

    static get flags(): ModFlags[] {
        return [
            "background-script"
        ];
    }

    static get modName() {
        return "Example background";
    }
    static get description() {
        return "Test background communications";
    }
    static get version() {
        return "0.0.0";
    }

    static background(_event: any) {
        const event = _event as ModBackgroundEvent<GlobalContext, TabContext, number>;
        console.log("background test mod", event);
        event.context.global.events = event.context.global.events || [];
        event.context.global.events.push(event.type);

        if(event.type === "mod-injector-message") {
            event.context.global.g = event.context.global.g || 0;
            event.context.global.g++;
            event.context.tab.data.t = event.context.tab.data.t || 0;
            event.context.tab.data.t++;
            return {
                tab: event.context.tab.data,
                global: event.context.global,
                sent: event.data,
            };
        }
    }

    async sendNext() {
        try {
            const result = await this.backgroundCom.send!(this.count++);
            console.log(result);
        } catch (error) {
            console.error(error);
        }
        this.frame = setTimeout(() => {
            this.sendNext();
        }, 1000);
    };

    onLoad() {
        this.sendNext();
    }
    onUnload() {
        clearTimeout(this.frame);
    }

}

registerMod(ExampleBackgroundMod);
