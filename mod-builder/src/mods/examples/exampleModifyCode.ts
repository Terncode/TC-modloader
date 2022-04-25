/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

export default class ExampleModifyCode extends IBaseMod {
    static get modName() {
        return "Example modify code";
    }
    static get description() {
        return "Modify localhost javascript code as an example";
    }
    static get version() {
        return "0.0.0";
    }
    static get origins() {
        return ["localhost"];
    }
    static get flags(): ModFlags[] {
        return [
            "modify-request",
        ];
    }
    static get modifyCodes(): CodeModer[] {
        return [
            {
                searcher: /index-[a-z0-9A-Z]+-test.js/,
                type: "script", // You cannot modify xmlhttprequest
                mod: (code: string, contentType: string | undefined, context: { [key: string]: any}, pathname: string, fullUrl: string) => {
                    let count = context.count || 0;
                    count++;
                    context.count = count;
                    // returning modded code
                    const BANNER = `/* This code has been tampered ;) */`;
                    const INJECTOR_INFO = `window.DEBUG_INJECT=["${code.length}", "${contentType}", '${JSON.stringify(context)}', "${pathname}", "${fullUrl}"];`;
                    const newCode = code
                        .replace("localVariable", `localVariable = window.exposedVariable`)
                        .replace("const spin = false;", "const spin = true;")
                        .replace(`element.style.backgroundColor = "yellow";`, `element.style.backgroundColor = "orange;element.style.padding:5px;"`)
                        .replace(`element.textContent = "DVD";`, `element.textContent = "Injected-${count}-times";`)
                        .replace(`element.style.color = "white";`, `element.style.color = "black";element.style.fontWeight = "bolder"`);
                    return `${BANNER}\n${INJECTOR_INFO}\n${newCode}`;
                }
            }
        ] as CodeModer[];
    }

    onLoad() {

        setInterval(() => {
            if ("exposedVariable" in window) {
                console.log("I see the variable");
            } else {
                console.log("I still don't anything");
            }
        }, 1000);


    }
    onUnload(): Promise<void> | void {
    }
}
registerMod(ExampleModifyCode);
