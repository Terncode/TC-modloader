import { ObjectedError } from "../interfaces";
import { TCBaseEvent } from "../utils/eventHandler";


export interface EventContentModStorageSet extends TCBaseEvent {
    type: "storage-set",
    data: {
        hash: number;
        key: string;
        value: any;
        isStatic: boolean,
    }
}
export interface EventContentModStorageGet extends TCBaseEvent {
    type: "storage-get",
    data: {
        hash: number;
        key: string;
        isStatic: boolean,
    }
}
export interface EventContentModStorageDelete extends TCBaseEvent {
    type: "storage-delete",
    data: {
        hash: number;
        key: string;
        isStatic: boolean,
    }
}

export interface ModStateChange {
    hash: number,
    runningModsCount: number;
}
export interface EventContentModLoad extends TCBaseEvent {
    type: "mod-load",
    data: ModStateChange;
}
export interface EventContentModUnload extends TCBaseEvent {
    type: "mod-unload",
    data: ModStateChange;
}

export interface EventContentModMessage extends TCBaseEvent {
    type: "mod-message",
    data: {
        hash: number,
        data: any,
    };
}

export interface EventContentModError extends TCBaseEvent {
    type: "mod-error",
    data: {
        hash: number,
        error: ObjectedError,
    };
}

export type ContentEvent = EventContentModStorageSet | EventContentModStorageGet | EventContentModStorageDelete |
EventContentModLoad | EventContentModUnload | EventContentModMessage | EventContentModError;
