/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";
interface Script {
    src: string;
    textContent: string;
    source: HTMLScriptElement;
}

export default class ExampleMod extends IBaseMod /* base mod will initialized durning runtime */ {
    private MutationObserver: MutationObserver;
    private cache = new Set();
    private index = 0;
    private div = document.createElement("div");
    static get modName() {
        return "Script downloader";
    }
    static get description() {
        return "Download all the";
    }
    static get version() {
        return "1.0.0";
    }
    saveAs(blob: Blob, name: string) {
        const a = document.createElementNS("http://www.w3.org/1999/xhtml", "a") as HTMLAnchorElement;
        a.download = name;
        a.rel = "noopener";
        a.href = URL.createObjectURL(blob);
        a.click();
    }

    private convertScripts(script: HTMLScriptElement): Script {
        return {
            source: script,
            src: script.src,
            textContent: script.textContent,
        };
    }
    addScripts = async (script: Script) => {
        if (script.src && this.cache.has(script.src)) return;
        if (script.textContent && this.cache.has(script.textContent)) return;
        let code = script.textContent;
        if (script.src) {
            const req = await fetch(script.src);
            if (!req.ok) return;
            code = await req.text();
            this.cache.add(script.src);
        } else {
            this.cache.add(code);
        }
        const scriptElement = document.createElement("div");
        let scriptName = `Script ${++this.index}.js`;
        try {
            const url = new URL(script.src);
            const name = url.pathname.split("/");
            scriptName = name[name.length - 1];
        } catch (error) {}
        console.log(scriptName);
        const btn = this.gui.createBtnTitle(scriptName, "Download", () => {
            const blob = new Blob([code], {
                type: "text/plain"
            });
            this.saveAs(blob, scriptName);
        });
        scriptElement.appendChild(btn.div);
        this.div.appendChild(scriptElement);
    };

    onLoad() {
        [...document.getElementsByTagName("script")].map(this.convertScripts).forEach(this.addScripts);
        this.div.style.maxHeight = "200px";
        this.div.style.maxWidth = "400px";
        this.div.style.overflow = "auto";
        this.MutationObserver = new MutationObserver(records => {
            for (const record of records) {
                for (const node of record.addedNodes) {
                    if (node.nodeName.toLowerCase() === "script") {
                        this.addScripts(this.convertScripts(node as HTMLScriptElement));
                    }
                }
            }
        });
        this.MutationObserver.observe(document, { childList: true, subtree: true });
        this.gui.appendModLayout(this.div);
    }
    onUnload() {
        if (this.MutationObserver) {
            this.MutationObserver.disconnect();
        }
        this.gui.removeModLayout(this.div);
    }
}

registerMod(ExampleMod);
