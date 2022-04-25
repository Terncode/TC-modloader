/* eslint-disable @typescript-eslint/no-unused-vars */

declare type ModFlags = "modify-request" | "background-script" | "requests" | "disable-unload" | "extend-loading";

declare type RegString = RegExp | string;

declare interface AnyObject {
    [key: string]: any;
}

declare type TC_BUTTON_TYPE = "normal" | "warning" | "danger";

type SetType = ((style: TC_BUTTON_TYPE) => void);
type ButtonCallback = (event: MouseEvent, button: HTMLButtonElement, setStyle: SetType) => void;


interface CreateButtonReturn {
    button: HTMLButtonElement;
    setType: SetType;
}
interface CreateButtonTitleReturn extends CreateButtonReturn {
    div: HTMLDivElement;
}

declare interface IModGui {
    appendModLayout(element: HTMLElement): void;
    removeModLayout(element: HTMLElement): void;
    createBtn(text: string, cb: ButtonCallback, type?: TC_BUTTON_TYPE): CreateButtonReturn
    createBtnTitle(buttonTitle: string ,buttonText: string, cb: ButtonCallback, type?: TC_BUTTON_TYPE): CreateButtonTitleReturn;
    show(): void;
    hide(): void;
}
declare type ToastType = "info" | "error" | "warn";
declare interface ToastMethods {
    show: (time: number) => ToastMethods
    hide: (time: number) => ToastMethods
    setText: (message: string) => ToastMethods
    setType: (type: ToastType) => ToastMethods
}
declare interface Toaster {
    show(message: string, type: ToastType, time: number): ToastMethods;
}

declare interface Dialog {
    alert(message: string): Promise<void>;
    confirm(message?: string): Promise<boolean>;
    prompt(message?: string, _default?: string): Promise<string>
}


type InterceptType  = "stylesheet" | "script";
declare type CodeModerOrBlocker = CodeModer | RquestBlocker;

declare  interface CodeModerBase {
    searcher: RegString;
    type: string[] | string,
}
declare interface CodeModer extends CodeModerBase {
    mod: (code: string, contentType: string | undefined, context: AnyObject, pathname: string, fullUrl: string) => string;
    type: InterceptType[] | InterceptType,
}
declare interface RquestBlocker extends CodeModerBase{
    block: true;
    type: (InterceptType | "xmlhttprequest")[] | InterceptType | "xmlhttprequest",
}

declare interface ModDependency<T, N = string> {
    name: N;
    version: string;
    methods: T
}
declare interface DependencyObject {
    [dependency: string]: ModDependency<any>
}

declare interface IBaseMod {
    dependencyMethods?: any;
}

declare abstract class IBaseMod {
    gui: IModGui;
    toaster: Toaster;
    dialog: Dialog;
    static flags?: ModFlags[];

    static modName?: string;
    static description?: string;
    static version?: string;
    static modifyCodes?: CodeModerOrBlocker[];
    static origins?: RegString[];

    static dependencyName?: string;

    static requirements?: string[];

    static installedDependencies?: DependencyObject;
    installedDependencies?: DependencyObject;

    static dependencyMethods?: any;

    static exportMethods?(): Readonly<any>;
    exportMethods?(): Readonly<any>;

    static background?(event: ModBackgroundEvent): Promise<any> | any;
    protected sendBackground?<R = any, D = any>(data: D): Promise<R>;
    protected onLoad?(): Promise<void> | void;
    protected onUnload?(): Promise<void> | void;

    static getItem?<V = any>(_key: string): Promise<V>;
    static setItem?<V = any>(key: string, value: V): Promise<void>;
    static deleteItem?(_key: string): Promise<void>;

    protected getItem?<V = any>(key: string): Promise<V>;
    protected setItem?<V = any>(key: string, value: V): Promise<void>;
    protected deleteItem?(key: string): Promise<void>;
}

declare interface ModContext<G, T> {
    context: {
        global: G,
        tab?: {
            id: number,
            data: T,
        }
        chrome?: Readonly<typeof chrome>;
    }
    data: any;
}

declare interface ModBackgroundInstall<G> {
    type: "mod-install";
    context: {
        global: G,
    }
    chrome?: Readonly<typeof chrome>;
}
declare interface ModBackgroundUninstall<G> {
    type: "mod-uninstall";
    context: {
        global: G,
    }
    chrome?: Readonly<typeof chrome>;
}
declare interface ModBackgroundLoad<G> {
    type: "mod-load";
    context: {
        global: G,
    }
    chrome?: Readonly<typeof chrome>;
}
declare interface ModBackgroundUnload<G> {
    type: "mod-unload";
    context: {
        global: G,
    }
    chrome?: Readonly<typeof chrome>;
}
declare interface ModBackgroundEnable<G> {
    type: "mod-enabled";
    context: {
        global: G,
    }
    chrome?: Readonly<typeof chrome>;
    origin: string;
}
declare interface ModBackgroundDisable<G> {
    type: "mod-disable";
    context: {
        global: G,
    }
    chrome?: Readonly<typeof chrome>;
    origin: string;
}
declare interface ModBackgroundInjectorLoad<G, T> {
    type: "mod-injector-load";
    context: {
        global: G,
        tab?: {
            id: Readonly<number>,
            data: T,
        }
    }
    chrome?: Readonly<typeof chrome>;
    origin: string;
}
declare interface ModBackgroundInjectorUnload<G, T> {
    type: "mod-injector-unload";
    context: {
        global: G,
        tab?: {
            id: Readonly<number>,
            data: T,
        }
    }
    chrome?: Readonly<typeof chrome>;
    origin: string;
}

declare interface ModBackgroundInjectorMessage<G, T, M> {
    type: "mod-injector-message";
    context: {
        global: G,
        tab?: {
            id: Readonly<number>,
            data: T,
        }
    }
    chrome?: Readonly<typeof chrome>;
    data: M;
}


declare type ModBackgroundEvent<G = AnyObject, T= AnyObject, M = AnyObject> =
ModBackgroundInstall<G> | ModBackgroundUninstall<G> |
ModBackgroundLoad<G> | ModBackgroundUnload<G> |
ModBackgroundEnable<G> | ModBackgroundDisable<G> | ModBackgroundInjectorLoad<G, T> |
ModBackgroundInjectorUnload<G, T> | ModBackgroundInjectorMessage<G, T, M>;
