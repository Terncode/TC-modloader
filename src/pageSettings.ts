import { DECODER_KEY, ORIGIN_SETTINGS_KEY, TC_MESSAGE_KEY, VENOM_LOCATION } from "./constants";
import { chromeGetItem, chromeSetItem } from "./utils/chrome";
import { uid } from "uid";
import { attachDebugMethod, getOrigin, randomString } from "./utils/utils";
import { InjectorData } from "./background/backgroundEventInterface";
import { escapeRegExp } from "lodash";
import { ButtonActivationPosition, InjectorType, OriginSettings, StealthMode } from "./interfaces";
import { BrowserTab } from "./browserCompatibility/browserInterfaces";
import tabs from "./browserCompatibility/browserTabs";
import runtime from "./browserCompatibility/browserRuntime";

export const defaultOriginSettings: Readonly<OriginSettings> = {
    injectorType: InjectorType.Turbo,
    stealthMode: StealthMode.Normal,
    activateButtonPosition: ButtonActivationPosition.Top,
    origin: "",
};
export class OriginSetter {
    private map = new Map<string,  OriginSettings>();
    private ids = new Map<number,  string>();
    private decoderKey = new Map<number,  string>();
    private injectorCode: string;
    private scriptCache = new Map<string, Map<number, string>>();

    constructor() {
        attachDebugMethod("OriginSetter", this);
        const request = new XMLHttpRequest();
        const url = runtime.getURL(VENOM_LOCATION);
        request.open("GET",url, false);
        request.send();
        if (request.status === 200) {
            this.injectorCode = request.responseText;
        }

        tabs.onRemoved(this.onTabRemoved);
    }
    destroy() {
        tabs.onRemoved(this.onTabRemoved);
    }
    onTabRemoved = (tabId: number) => {
        this.ids.delete(tabId);
        this.decoderKey.delete(tabId);
    };


    async init() {
        const settings = (await chromeGetItem <OriginSettings[]>(ORIGIN_SETTINGS_KEY) || []);
        for (const setting of settings) {
            this.map.set(setting.origin, setting);
        }
    }
    private save() {
        const storage: OriginSettings[] = [];
        this.map.forEach(value => storage.push(value));
        return chromeSetItem(ORIGIN_SETTINGS_KEY, storage);
    }
    get(origin: string): OriginSettings {
        return this.map.get(origin) || {
            ...defaultOriginSettings,
            origin
        };
    }
    set(origin:  string, settings: OriginSettings) {
        this.map.set(origin, settings);
        this.save();
    }

    getAllSettings(tab: BrowserTab, regenerate = false): InjectorData {
        if (!this.ids.has(tab.id) || regenerate) {
            const id = uid(32);
            this.ids.set(tab.id, id);
            this.decoderKey.set(tab.id, randomString(64));
        }

        const origin = (tab.url && getOrigin(tab.url)) || "";
        const settings = this.get(origin);
        const broadcastId = this.ids.get(tab.id);
        const decoderKey = this.decoderKey.get(tab.id);
        const injectorModdedCode = this.injectorCode
            .replace(new RegExp(escapeRegExp(TC_MESSAGE_KEY), "g"), broadcastId)
            .replace(new RegExp(escapeRegExp(DECODER_KEY), "g"), decoderKey);
        const url = `data:;charset=utf-8,${encodeURIComponent(injectorModdedCode)}`;
        return {
            settings,
            broadcastId,
            decoderKey,
            url
        };
    }

    getCachedScript(url: string, hash: number): string | undefined {
        const map = this.scriptCache.get(url);
        if (map) {
            return map.get(hash);
        }
        return undefined;
    }
    setCachedScript(url: string, hash: number, payload: string) {
        const map = this.scriptCache.get(url);
        if (map) {
            map.set(hash, payload);
            this.scriptCache.set(url, map);
        } else {
            const hashMap = new Map();
            hashMap.set(hash, payload);
            this.scriptCache.set(url, hashMap);
        }
    }
}
