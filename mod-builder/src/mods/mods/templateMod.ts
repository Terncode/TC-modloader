/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";


export default class ExampleMod extends IBaseMod /* base mod will initialized durning runtime */ {
    static get flags(): ModFlags[] {
        return [
            "modify-request", // TemplateMod.modifyCode // will be called on script match
            "background-script", // TemplateMod.background // will be used my modloader
            "requests", // gives you ability to make request
            "disable-unload" // function onUnload won't be called as you are make the mod unlodable
        ];
    }
    // Required mod name
    static get modName() {
        return "Template mod";
    }
    // Required mod description
    static get description() {
        return "You can use this template mod to create your own mod";
    }
    // Required and it has to max x.x.x semver schema without this the mod won't compile!
    static get version() {
        return "0.0.0";
    }
    // Allowed origin
    // you can user empty array to allow on all origins or use "*"
    // It can also handle regular expressions
    static get origins(): RegString[] {
        return [];
    }
    static get priority() { // you can prioritize when your mod should load. the higher the number is the faster the mod will be loaded
        return 10;
    }
    // When to mod loads this function will be called
    // if an error is thrown inside the function the mod won't load and user will be notified
    onLoad() {
        console.log("mod loaded!");

        // to enable background communicator you need to enable "background-script" flag
        // this message will show on static background event.type "mod-injector-message"
        this.sendBackground("ping").then(() => {
            console.log("ping received");
        }).catch(console.error);
    }

    // this function is called when a user wants to unload the mod of before the page exist
    // this function won't be called if flag disable-unload is presented but user will be notified instead
    // this function will are display an error message to the user in case that mod has modify code-flag in it
    // as it is not possible to unmodify code durning runtime
    onUnload() {
        console.log("Un loaded");
        const count = "count";

        // saving values;
        this.getItem(count).then(count => {
            count = count || 0;
            count++;
            this.setItem(count, count);
        });

        // This storage is accessible by background script
        ExampleMod.getItem(count).then(count => {
            count = count || 0;
            count++;
            ExampleMod.setItem(count, count);
        });

        // use dependency
        this.dependencyMethods.dependencyName.method("hello world");
    }

    // background script
    // mods on background is instantiated you can process events
    static background(_event: any) { // if you return a promise if has to be solved under 10 seconds before it times out!
        const event = _event as ModBackgroundEvent<any, any, any>;

        switch (event.type) {
            case "mod-install": // on mod install
            case "mod-load": // on background load
            case "mod-enabled": // when user enables mod on origin
            case "mod-injector-load": // when injector successfully loads a mod
            case "mod-injector-message": // when a message is sent from the injector mod
            case "mod-injector-unload": // when injector unloads mod
            case "mod-disable": // when user disables the mod
            case "mod-unload": // on mod unload
            case "mod-uninstall": // on uninstall
                break;
            default:
                break;
        }


        // since mod is never instantiated the context is provided with is where you can use global and tab local variables if that exits
        if (typeof event.context.global.count === "undefined") {
            event.context.global.count = 0;
        }
        event.context.global.count++;

        // example on handling injector message
        if (event.type === "mod-injector-message") {
            if (typeof event.context.tab !== "undefined") {
                event.context.tab.data = 0;
            }
            event.context.tab.data++;
            if (event.data === "ping") {
                return "pong";
            } else {
                return {
                    messageCountGlobal: event.context.global.count,
                    messageCountLocal: event.context.tab.data,
                };
            }
        }
        // use dependency
        ExampleMod.dependencyMethods.methodStatic.method("static hello world");
    }

    // mods can act as dependencies meaning other mods can use this mod methods
    // check file examples examples/lodashDependencyTestMod.ts and examples/dependencyUseMod.ts
    static get dependencyName() {
        return "example-mod";
    }
    //dependencyMethods?: any; // you can add your dependency methods that will be accessible in other mods;
    exportMethods(): any { // you can add your dependency methods that will be accessible in other mods;
        return {
            method: () => "hello",
        };
    }
    static exportMethods(): any { // you can export static methods
        return {
            methodStatic: () => "hello",
        };
    }
}

registerMod(ExampleMod);
