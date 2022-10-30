export interface InstanceBaseMod {
    gui: IModGui;

    onLoad(): Promise<boolean> | boolean
    onUnload(): Promise<boolean> | boolean
    getItem<V = any>(key: string): Promise<V>;
    setItem<V = any>(key: string, value: V): Promise<void>;
    deleteItem(key: string): Promise<void>;
}


export interface IModGui {

}

export interface IModMenu {
    mods: {
        [key: string]: InstanceBaseMod[];
    }
}

export interface ModContext<G = any, T = any> {
    global: G;
    tabs: Map<number, T>
}

export interface ModInstall<G, T> {
    type: "mod-install";
    context: ModContext<G, T>;
}
export interface ModUninstall<G, T> {
    type: "mod-uninstall";
    context: ModContext<G, T>;
}
export interface ModEnable<G, T> {
    type: "mod-enable";
    origin: string;
    context: ModContext<G, T>;
}
export interface ModDisable<G, T> {
    type: "mod-disable";
    origin: string;
    context: ModContext<G, T>;
}
export interface ModLoad<G, T> {
    type: "mod-load";
    origin: string;
    context: ModContext<G, T>;
}
export interface ModUnload<G, T> {
    type: "mod-unload";
    origin: string;
    context: ModContext<G, T>;
}

export type ModBackgroundEvent<G, T> = ModInstall<G, T> | ModUninstall<G, T> | ModEnable<G, T> | ModDisable<G, T> | ModLoad<G, T> | ModUnload<G, T>


export interface ObjectedError {
    message: string;
    stack: string;
    data?: any;
}


export interface EventPromiseBase<Payload = any, Data = any> {
    payload: EventPromiseBasePayload<Payload>;
    data?: Data;
    error?: ObjectedError;
    status: string;
}
export interface EventPromiseBasePayload<Data = any> {
    id: number,
    data: Data;
}
export interface EventPromisePending<Payload = any> extends EventPromiseBase {
    payload: EventPromiseBasePayload<Payload>;
    status: "pending";
}
export interface EventPromiseResolved<Payload = any, Data = any> extends EventPromiseBase{
    payload: EventPromiseBasePayload<Payload>;
    data: Data;
    status: "resolved"
}


interface EventPromiseRejected<Payload = any> extends EventPromiseBase{
    payload: EventPromiseBasePayload<Payload>;
    error: ObjectedError;
    status: "rejected"
}

export type EventPromise<Payload = any, Data = any> =  EventPromisePending<Payload> | EventPromiseResolved<Payload, Data> | EventPromiseRejected<Payload>;

export enum InjectorType {
    Turbo,
    Normal,
}

export enum StealthMode {
    None,
    Strict,
    Normal,
}
export enum ButtonActivationPosition {
    None = "None",
    Top = "Top",
    Right = "Right",
    Bottom = "Bottom",
    Left = "Left",
}

export interface OriginSettings {
    injectorType: InjectorType,
    stealthMode: StealthMode,
    activateButtonPosition: ButtonActivationPosition,
    origin: string;
}

export type ResourceType =
| "main_frame"
| "sub_frame"
| "stylesheet"
| "script"
| "image"
| "font"
| "object"
| "xmlhttprequest"
| "ping"
| "csp_report"
| "media"
| "websocket"
| "other";

export interface ResponseHeader {
    name: string;
    value?: string;
}
