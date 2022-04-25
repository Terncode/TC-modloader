import { random } from "lodash";
import { Logger } from "../utils/logger";
import { delay, hashString } from "../utils/utils";
import { EventHandler } from "../utils/eventHandler";
import { VenomEvent } from "../venom/venomEventInterface";
import { ContentEvent } from "./contentEventInterface";
import { OriginSettings } from "../interfaces";

export class ContentEventHandler extends EventHandler<VenomEvent, ContentEvent> {
    constructor(private broadcastId: string, decoderKey: string) {
        super({
            min: random(Number.MAX_SAFE_INTEGER * 0.50, Number.MAX_SAFE_INTEGER * 0.51),
            max: Math.round(Number.MAX_SAFE_INTEGER - 1),
        }, hashString(SCRIPT_TYPE), broadcastId, decoderKey);
    }

    start(settings: OriginSettings) {
        return new Promise<void>((resolve, reject) => {
            let stop = false;
            let frame = setTimeout(() => {
                stop = true;
                reject(new Error("Unable to establish combination"));
            }, 1000 * 10);

            let listen = true;
            this.eventElement.addEventListener(this.broadcastId, (event: CustomEvent<number[]>) => {
                if (event.detail && Array.isArray(event.detail)) {
                    const buffer = this.encoder.decode(event.detail);
                    const decoded = JSON.parse(buffer);
                    if (decoded && decoded.type === "init-event" && decoded.data === "pong") {
                        Logger.debug("init ping received");
                        listen = false;
                        clearTimeout(frame);
                        resolve();
                        return;
                    } else {
                        this.onMessage(event as any);
                    }
                }
            });
            (async () => {
                const payload = {
                    type: "init-event",
                    data: {
                        type: "ping",
                        settings
                    },
                };
                const buffer = this.encoder.encode(JSON.stringify(payload));
                while(listen && !stop) {
                    const event = new CustomEvent<number[]>(this.broadcastId ,{cancelable:false, bubbles: false, detail: buffer});
                    this.eventElement.dispatchEvent(event);
                    await delay(1000);
                }
            })();
        });
    }
}
