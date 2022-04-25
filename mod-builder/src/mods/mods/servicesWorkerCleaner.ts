/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

export interface IClean {
    forceClean: () => void,
}

export default class ServiceWorkerCleaner extends IBaseMod {
    private frame: NodeJS.Timeout;
    static get modName() {
        return "swc";
    }
    static get description() {
        return "Service worker cleaner";
    }
    static get version() {
        return "1.0.0";
    }
    static get priority() {
        return 100;
    }
    async onLoad() {
        await this.clearServiceWorkers();
        this.frame = setInterval(this.clearServiceWorkers, 1000 * 60 * 10); // Kill workers every 10 minutes
    }

    clearServiceWorkers = async() => {
        const workers = await navigator.serviceWorker.getRegistrations();
        if(workers.length) {
            navigator.serviceWorker.register = null;
            const promise = workers.map(w => w.unregister());
            try{
                await Promise.all(promise);
            } catch {
                this.toaster.show("Cannot take control over this page!", "error", 2000);
            }
        };
    };
    onUnload() {
        clearInterval(this.frame);
    }
    static get dependencyName() {
        return "swc";
    }
    exportMethods(): IClean  {
        return {
            forceClean: this.clearServiceWorkers,
        };
    }
}

registerMod(ServiceWorkerCleaner);
