import { BrowserMessageSender } from "./browserInterfaces";
import runtime from "./browserRuntime";

export function isPopup(sender: BrowserMessageSender) {
    return sender.url.startsWith(`chrome-extension://${runtime.getId()}`) || sender.url.startsWith(`moz-extension://`); // TOFIX: Make it work on firefox
}
