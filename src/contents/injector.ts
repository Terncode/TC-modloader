import { InjectorData } from "../background/backgroundEventInterface";
import { TC_MESSAGE_KEY, VENOM_LOCATION, DECODER_KEY } from "../constants";
import { ButtonActivationPosition, InjectorType, StealthMode } from "../interfaces";
import { chromeGetUrl } from "../utils/chrome";
import { Logger } from "../utils/logger";
import { ContentEventHandler } from "./contentEventHandler";

export class Injector {
    private _injectorData: InjectorData = {
        broadcastId: TC_MESSAGE_KEY,
        decoderKey: DECODER_KEY,
        url: chromeGetUrl(VENOM_LOCATION),
        settings: {
            activateButtonPosition: ButtonActivationPosition.Top,
            injectorType: InjectorType.Turbo,
            origin,
            stealthMode: StealthMode.Normal,
        }
    };

    private _eventHandler: ContentEventHandler;
    constructor(injectorData?: InjectorData) {
        if(injectorData) {
            this.injectorData = injectorData;
        }
    }

    set injectorData(injectorData: InjectorData) {
        this._injectorData = injectorData;
    }
    get injectorData() {
        return this._injectorData;
    }
    public async inject() {
        if (this._eventHandler) {
            this.disinfect();
        }
        await Injector.injectJavascript(this._injectorData.url);
        this._eventHandler = new ContentEventHandler(this._injectorData.broadcastId, this._injectorData.decoderKey);
        await this._eventHandler.start(this._injectorData.settings);
    }

    async disinfect() {
        if (this._eventHandler) {
            await this._eventHandler.sendPromise({type: "destroy"});
        }
    }

    get eventHandler() {
        if (this._eventHandler) {
            return this._eventHandler;
        } else {
            throw new Error("Not injected");
        }
    }
    static injectJavascript(payload: string, scriptElement?: HTMLScriptElement) {
        return new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");

            const dataUrl = "data:";
            const sliced = payload.split(",");
            const data = payload.startsWith(dataUrl) ? decodeURIComponent(payload.slice(sliced[0].length + 1)) : payload;
            const blob = new Blob([data], {type: "application/javascript"});
            const blobUrl = script.src = URL.createObjectURL(blob);
            script.type = "application/javascript";
            const destroyScript = () => {
                script.removeEventListener("load", onLoad);
                script.removeEventListener("error", onError);
            };

            const onLoad = async () => {
                destroyScript();
                resolve();
            };
            const onError = (event: ErrorEvent) => {
                Logger.error("failed", event.error);
                destroyScript();
                reject(event.error);;
            };
            script.addEventListener("load", onLoad);
            script.addEventListener("error", onError);
            if (scriptElement) {
                Injector.insetAfter(script, scriptElement);
                script.parentElement.removeChild(script);
            } else {
                document.body.appendChild(script);
                document.body.removeChild(script);
            }
            script.removeAttribute("src");
            script.removeAttribute("type");
            // Instantly revoking the blob in case a webpage would try to steal our injector code
            URL.revokeObjectURL(blobUrl);
        });
    }
    static insetAfter(element: HTMLElement, target: HTMLElement){
        const parent = target.parentElement;
        if (element.nextSibling) {
            parent.insertBefore(element, target.nextSibling);
        } else {
            parent.appendChild(element);
        }
    }
}


