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
    static get modifyCodes(): CodeModerOrBlocker[] {
        return [
            {
                searcher: /index-[a-z0-9A-Z]+-test.js/,
                type: "script", // You cannot modify xmlhttprequest
                mod: (code: string, headers: RequestHeaders, contentType: string | undefined, context: { [key: string]: any}, pathname: string, fullUrl: string) => {
                    /*
                            A very basic code how you can modify running javascript and other related stuff you might find useful
                            You can use context to store injection variable. If you are modifying code multiple time you can reuse variable that you have bind on context
                            however if injector turbo charger is enabled this function will not be called with every request due to heavy caching

                            Usually you would use regular expression to replace find and replace stuff

                            Usually you want to expose the variables to the window object and then do the logic onLoad where you can check if you see the variable
                            Do note that most of the time the mod will be ready be ready before the moded code loads you can warp function in promises and wait for
                            it load if it doesn't throw na error. On load promise has to resolve under 10 seconds if you need more time than that use extend-loading
                            flag which won't timeout your mod
                        */
                    let count = context.count || 0;
                    count++;
                    context.count = count;
                    console.log(headers); // <-- readonly won't have effect on it since we are serving custom code back
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
            } as CodeModer,
            {
                type: "main_frame",
                mainHeadersMod: (headers: RequestHeaders, contentType: string | undefined, context: { [key: string]: any}, pathname: string, fullUrl: string) => {
                    console.log(headers); // <-- headers can be modified
                    console.log(contentType);
                    console.log(context);
                    console.log(pathname);
                    console.log(fullUrl);
                }
            } as HeadersMainFrame,
        ] as CodeModerOrBlocker[];
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
