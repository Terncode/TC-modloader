import { ToastType } from "../commonInterface";
import { ModStateChange } from "../contents/contentEventInterface";
import { ObjectedError, OriginSettings } from "../interfaces";
import { ModMetaCode } from "../modUtils/modInterfaces";

export interface MessageBase<T = any> {
    type: string;
    data?: T;
}

export interface InjectorData {
    settings: OriginSettings;
    broadcastId: string;
    url: string;
    decoderKey: string;
}

export interface BackgroundMessagePing extends MessageBase<undefined> {
    type: "ping";
}

export interface BackgroundMessageShowAlert extends MessageBase<string> {
    type: "show-alert";
}

export interface BackgroundMessageShowPrompt extends MessageBase<string> {
    type: "show-prompt";
}

export interface BackgroundMessageShowConfirm extends MessageBase<string> {
    type: "show-confirm";
}


export interface BackgroundMessageShowToast extends MessageBase<{type: ToastType, description: string, title: string, duration: number}> {
    type: "show-toast";
}

export interface BackgroundMessageEnabled extends MessageBase<InjectorData | undefined> {
    type: "content-enabled";
}

export interface BackgroundMessageOriginAdd extends MessageBase<string> {
    type: "origin-add";
}

export interface BackgroundMessageOriginRemove extends MessageBase<string> {
    type: "origin-remove";
}

export interface BackgroundMessageCheck extends MessageBase<string> {
    type: "origin-check";
}

export interface BackgroundMessageModInstall extends MessageBase<ModMetaCode>{
    type: "mod-install";
}

export interface BackgroundMessageModUninstall extends MessageBase<number>{
    type: "mod-uninstall";
}

export interface BackgroundMessageModEnable extends MessageBase<string>{
    type: "mod-enable";
}

export interface BackgroundMessageModDisable extends MessageBase<string>{
    type: "mod-disable";
}

export interface BackgroundMessageGetInstalled extends MessageBase<string | undefined> {
    type: "get-installed";
}

export interface BackgroundMessageGetOriginEnabled extends MessageBase<string> {
    type: "get-origin-enabled-mods";
}

export interface BackgroundMessageModDeveloper extends MessageBase<boolean>{
    type: "developer-change";
}

export interface BackgroundMessageModState extends MessageBase<undefined> {
    type: "developer-state";
}

export interface ModState {
    hash: number;
    origin: string;
}

export interface SetModState extends ModState {
    value: boolean;
}

export interface BackgroundMessageGetReportModStateGet extends MessageBase<ModState> {
    type: "get-mod-state";
}

export interface BackgroundMessageGetReportModStateSet extends MessageBase<SetModState> {
    type: "set-mod-state";
}

export interface ContentMessageModEnable extends MessageBase<ModMetaCode> {
    type: "inject-mod";
}

export interface ContentMessageModDisable extends MessageBase<number> {
    type: "extract-mod";
}

export interface BackgroundMessageGetOriginSettings extends MessageBase<string> {
    type: "get-origin-settings";
}

export interface BackgroundMessageSetOriginSettings extends MessageBase<OriginSettings> {
    type: "set-origin-settings";
}

export interface BackgroundMessageFetchErrors extends MessageBase<number> {
    type: "get-mod-internal-data";
}

export interface BackgroundMessageOpenInModMenu extends MessageBase {
    type: "open-mod-menu";
}

interface ModStorageBase {
    hash: number;
    key: string;
    isStatic: boolean,
}

interface  ModStorageDelete extends ModStorageBase {
    type: "storage-delete";
}

interface  ModStorageGet extends ModStorageBase {
    type: "storage-get";
}

interface  ModStorageSave extends ModStorageBase {
    type: "storage-save";
    value: any;
}

type StorageType = ModStorageGet | ModStorageDelete | ModStorageSave;
export interface ContentMessageModStorageUpdate extends MessageBase<StorageType> {
    type: "mod-storage-update";
}

export interface ContentMessageInjectorModLoad extends ModStorageBase {
    type: "injector-mod-load";
    data: ModStateChange;
}

export interface ContentMessageInjectorModUnload extends ModStorageBase {
    type: "injector-mod-unload";
    data: ModStateChange;
}

export interface ContentMessageInjectorModMessage extends ModStorageBase {
    type: "injector-mod-message";
    data: {
        hash: number,
        data: any
    };
}

export interface ContentMessageInjectorModError extends ModStorageBase {
    type: "injector-mod-error"
    data: {
        hash: number,
        error: ObjectedError
    };
}

interface InjectContentData {
    src: string;
    type: "script" | "stylesheet";
    url: string;
}

export interface ContentMessageInjectContent extends MessageBase<InjectContentData> {
    type: "inject-content"
}

export interface BackgroundMessageFetchMod extends MessageBase<string>{
    type: "fetch-mod-name";
}

export interface BackgroundMessageFetchModDependency extends MessageBase<string>{
    type:  "fetch-mod-dependency-name";
}

export interface BackgroundMessageCanUninstall extends MessageBase<number>{
    type: "can-uninstall";
}

export interface ContentMessageSettingsEnabled extends MessageBase<OriginSettings> {
    type: "origin-settings-update";
}

export interface BackgroundMessageModMessage extends MessageBase<{hash:number, data: any}>{
    type: "mod-message";
}

export type BackgroundMessage = BackgroundMessageOriginRemove | BackgroundMessageOriginAdd |
BackgroundMessageCheck | BackgroundMessageModInstall | BackgroundMessageModUninstall | BackgroundMessageGetInstalled |
BackgroundMessageModEnable | BackgroundMessageModUninstall | BackgroundMessageGetReportModStateGet | BackgroundMessageGetReportModStateSet |
BackgroundMessageGetOriginEnabled | ContentMessageModStorageUpdate | ContentMessageInjectorModLoad | ContentMessageInjectorModUnload |
ContentMessageInjectorModMessage | ContentMessageInjectorModMessage | ContentMessageInjectorModError |
BackgroundMessageFetchMod | BackgroundMessageFetchModDependency | BackgroundMessageCanUninstall |
BackgroundMessageGetOriginSettings | BackgroundMessageSetOriginSettings | BackgroundMessageFetchErrors |
BackgroundMessageOpenInModMenu | BackgroundMessageModDeveloper | BackgroundMessageModState;

export type ContentBackgroundMessage =  BackgroundMessagePing | BackgroundMessageShowToast |
BackgroundMessageShowAlert | BackgroundMessageShowPrompt | BackgroundMessageShowConfirm |
BackgroundMessageEnabled | ContentMessageModEnable | ContentMessageModDisable |
ContentMessageInjectorModLoad | ContentMessageInjectorModUnload | ContentMessageInjectorModMessage |
ContentMessageInjectorModError | ContentMessageInjectContent | ContentMessageSettingsEnabled |
BackgroundMessageOpenInModMenu | BackgroundMessageModMessage;
