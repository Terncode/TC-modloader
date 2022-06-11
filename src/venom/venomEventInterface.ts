import { OriginSettings } from "../interfaces";
import { ModMetaCode } from "../modUtils/modInterfaces";
import { TCBaseEvent } from "../utils/eventHandler";


export interface EventVenomDestroy extends TCBaseEvent {
    type: "destroy",
}
export interface EventVenomStatus extends TCBaseEvent {
    type: "status",
}

export interface EventVenomInitMods extends TCBaseEvent {
    type: "init-mods",
    data: ModMetaCode[];
}
export interface EventVenomModEnable extends TCBaseEvent {
    type: "mod-enable",
    data: ModMetaCode;
}

export interface EventVenomModDisable extends TCBaseEvent {
    type: "mod-disable",
    data: number;
}
export interface EventVenomSettingsUpdate extends TCBaseEvent {
    type: "settings-update",
    data: OriginSettings;
}
export interface EventVenomModMenuOpen extends TCBaseEvent {
    type: "open-mod-menu",
}

export interface EventVenomModMessage extends TCBaseEvent {
    type: "mod-message",
    data: {
        hash: number;
        data: any;
    };
}

export type VenomEvent = EventVenomDestroy | EventVenomStatus | EventVenomInitMods |
EventVenomModEnable | EventVenomModDisable | EventVenomSettingsUpdate | EventVenomModMenuOpen |
EventVenomModMessage;


