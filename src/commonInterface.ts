/* eslint-disable @typescript-eslint/no-unused-vars */

export type ModFlags =
    "modify-request" |
    "background-script" |
    "requests" |
    "disable-unload" |
    "extend-loading"/* |
    "background-api"*/;

export type RegString = RegExp | string;

export interface AnyObject {
    [key: string]: any;
}

export type TC_BUTTON_TYPE = "normal" | "warning" | "danger";

type SetType = ((style: TC_BUTTON_TYPE) => void);
type ButtonCallback = (event: MouseEvent, button: HTMLButtonElement, setStyle: SetType) => void;


interface CreateButtonReturn {
    button: HTMLButtonElement;
    setType: SetType;
}
interface CreateButtonTitleReturn extends CreateButtonReturn {
    div: HTMLDivElement;
}

export interface IModGui {
    appendModLayout(element: HTMLElement): void;
    removeModLayout(element: HTMLElement): void;
    createBtn(text: string, cb: ButtonCallback, type?: TC_BUTTON_TYPE): CreateButtonReturn
    createBtnTitle(buttonTitle: string ,buttonText: string, cb: ButtonCallback, type?: TC_BUTTON_TYPE): CreateButtonTitleReturn;
    show(): void;
    hide(): void;
}
export type ToastType = "info" | "error" | "warn";
export interface ToastMethods {
    show: (time: number) => ToastMethods
    hide: (time: number) => ToastMethods
    setText: (message: string) => ToastMethods
    setType: (type: ToastType) => ToastMethods
}
export interface Toaster {
    show(message: string, type: ToastType, time: number): ToastMethods;
}

export interface Dialog {
    alert(message: string): Promise<void>;
    confirm(message?: string): Promise<boolean>;
    prompt(message?: string, _default?: string): Promise<string>
}


export type InterceptType = "stylesheet" | "script";
export type FrameType = "main_frame" | "sub_frame";
export type CodeModerOrBlocker = CodeModer | RequestBlocker | HeadersMainFrame;

export  interface CodeModerBase {
    searcher: RegString;
    type: string[] | string,
}
export interface RequestHeader {
    name: string;
    value?: string | undefined;
    binaryValue?: ArrayBuffer | undefined;
}
export type RequestHeaders = RequestHeader[];
export interface CodeModer extends CodeModerBase {
    mod: (code: string, headers: RequestHeaders, contentType: string | undefined, context: AnyObject, pathname: string, fullUrl: string) => string;
    type: InterceptType[] | InterceptType,
}
export interface RequestBlocker extends CodeModerBase {
    block: true;
    type: (InterceptType | "xmlhttprequest")[] | InterceptType | "xmlhttprequest",
}

export interface HeadersMainFrame extends CodeModerBase {
    mainHeadersMod: (headers: RequestHeaders, contentType: string | undefined, context: AnyObject, pathname: string, fullUrl: string) => void;
    type: FrameType | FrameType[],
}

export interface ModDependency<T, N = string> {
    name: N;
    version: string;
    methods: T
}
export interface DependencyObject {
    [dependency: string]: ModDependency<any>
}

export interface IBaseMod {
    dependencyMethods?: any;
}

type BrowserEnvironments = "chrome-mv2" | "chrome-mv3" | "firefox";

export interface ModloaderInfo {
    version: string;
    browserEnvironment: BrowserEnvironments;
}

export abstract class IBaseMod {
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

    static browserEnvironments?: BrowserEnvironments[];

    static installedDependencies?: DependencyObject;
    installedDependencies?: DependencyObject;

    static dependencyMethods?: any;

    static exportMethods?(): Readonly<any>;
    exportMethods?(): Readonly<any>;

    static background?(event: ModBackgroundEvent): Promise<any> | any;
    protected backgroundCom?: BackgroundCom;

    protected onLoad?(modloaderInfo: ModloaderInfo): Promise<void> | void;
    protected onUnload?(): Promise<void> | void;

    static getItem?<V = any>(_key: string): Promise<V>;
    static setItem?<V = any>(key: string, value: V): Promise<void>;
    static deleteItem?(_key: string): Promise<void>;

    protected getItem?<V = any>(key: string): Promise<V>;
    protected setItem?<V = any>(key: string, value: V): Promise<void>;
    protected deleteItem?(key: string): Promise<void>;
}

export interface BackgroundCom {
    send<R = any, D = any>(data: D): Promise<R>;
    receive<D = any, R = any>(callback: (((obj: D) => Promise<R> | R) | undefined)): void;
}

export interface ModTabs {
    [key: number]: ModTab;
}

export interface ModTab {
    origin: string;
    send<D = any, R = any>(data: D): Promise<R>;
}

export interface ModBackgroundInstall<G> {
    type: "mod-install";
    context: {
        global: G,
    }
    enabled: string[];
    tabs: ModTabs
}
export interface ModBackgroundUninstall<G> {
    type: "mod-uninstall";
    context: {
        global: G,
    }
    enabled: string[];
    tabs: ModTabs
}
export interface ModBackgroundLoad<G> {
    type: "mod-load";
    context: {
        global: G,
    }
    enabled: string[];
    tabs: ModTabs
}
export interface ModBackgroundUnload<G> {
    type: "mod-unload";
    context: {
        global: G,
    }
    enabled: string[];
    tabs: ModTabs
}
export interface ModBackgroundEnable<G> {
    type: "mod-enabled";
    context: {
        global: G,
    }
    enabled: string[];
    tabs: ModTabs
    origin: string;
}
export interface ModBackgroundDisable<G> {
    type: "mod-disable";
    context: {
        global: G,
    }
    enabled: string[];
    tabs: ModTabs
    origin: string;
}
export interface ModBackgroundInjectorLoad<G, T> {
    type: "mod-injector-load";
    context: {
        global: G,
        tab?: {
            id: Readonly<number>,
            data: T,
        }
    }
    enabled: string[];
    tabs: ModTabs
    origin: string;
}
export interface ModBackgroundInjectorUnload<G, T> {
    type: "mod-injector-unload";
    context: {
        global: G,
        tab?: {
            id: Readonly<number>,
            data: T,
        }
    }
    enabled: string[];
    tabs: ModTabs
    origin: string;
}

export interface ModBackgroundInjectorMessage<G, T, M> {
    type: "mod-injector-message";
    context: {
        global: G,
        tab?: {
            id: Readonly<number>,
            data: T,
        }
    }
    enabled: string[];
    tabs: ModTabs
    data: M;
}


export type ModBackgroundEvent<G = AnyObject, T= AnyObject, M = AnyObject> =
ModBackgroundInstall<G> | ModBackgroundUninstall<G> |
ModBackgroundLoad<G> | ModBackgroundUnload<G> |
ModBackgroundEnable<G> | ModBackgroundDisable<G> | ModBackgroundInjectorLoad<G, T> |
ModBackgroundInjectorUnload<G, T> | ModBackgroundInjectorMessage<G, T, M>;
