import { random } from "lodash";
import { BROADCASTER_ATTRIBUTE, DECODER_KEY, TC_MESSAGE_KEY } from "../constants";
import { Logger } from "../utils/logger";
import { hashString } from "../utils/utils";
import { EventHandler } from "../utils/eventHandler";
import { ContentEvent } from "../contents/contentEventInterface";
import { VenomEvent } from "./venomEventInterface";
import { OriginSettings } from "../interfaces";

export class VenomEventHandler extends EventHandler<ContentEvent, VenomEvent> {
    private readonly elementAttribute = BROADCASTER_ATTRIBUTE;
    constructor() {
        super({
            min: Math.round(random(Number.MAX_SAFE_INTEGER * 0.1, Number.MAX_SAFE_INTEGER * 0.1)),
            max: Math.round(Number.MAX_SAFE_INTEGER * 0.49),
        }, hashString(SCRIPT_TYPE), TC_MESSAGE_KEY, DECODER_KEY);
    }
    destroy() {
        (this.eventElement as any).removeEventListener(this.generatedId, this.onMessage);
    }

    start() {
        return new Promise<OriginSettings>(resolve => {
            const fn = (event: CustomEvent<number[]>) => {
                const buffer = this.encoder.decode(event.detail);
                const data = JSON.parse(buffer);
                if (data && data.type === "init-event" && data.data?.type === "ping") {
                    const returnObject = {
                        data: "pong",
                        type: "init-event",
                    };
                    const buffer = this.encoder.encode(JSON.stringify(returnObject));
                    const returnEvent = new CustomEvent<number[]>(this.generatedId ,{cancelable:false, bubbles: false, detail: buffer});
                    Logger.debug("Init ping received");
                    this.eventElement.dispatchEvent(returnEvent);
                    resolve(data.data.settings);
                } else {
                    this.onMessage(event as any);
                }
            };
            this.eventElement.addEventListener(this.generatedId, fn);
        });
    }
}

