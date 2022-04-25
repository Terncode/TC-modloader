/// <reference path="../fix.d.ts" />

import { BackgroundMessageHandler } from "../utils/backgroundCom";
import { createContentController as createContentScriptMessageHandler } from "../contents/contentController";
import { InjectorData } from "../background/backgroundEventInterface";

const background = new BackgroundMessageHandler();
async function onDomLoaded(_event: Event) {
    const inject = await background.sendMessage<InjectorData>({type:"origin-check", data: origin});
    createContentScriptMessageHandler(background, inject);
}
document.addEventListener("DOMContentLoaded", onDomLoaded);
