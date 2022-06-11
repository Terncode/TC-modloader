import { ModFlags } from "./commonInterface";

export const ORIGIN_KEY = "__ORIGINS__";
export const ORIGIN_SETTINGS_KEY = "__ORIGINS_SETTINGS__";
export const MOD_KEY = "__MODS__";

export const BROADCASTER_ATTRIBUTE = WEBPACK_TC_BROADCAST_ATTRIBUTE;
export const TC_MESSAGE_KEY = WEBPACK_TC_BROADCAST_MESSAGE;
export const DECODER_KEY = WEBPACK_TC_DECODER_KEY;
export const EXTENSION_PACK_KEY = WEBPACK_TC_EXTENSION_PACK;

export const VENOM_LOCATION = "assets/scripts/venom.js";


const DEV_PORTS = [ 3000, 3005, 3010, 3015, 3020, 3030 ];
export const DEV_URLS = DEV_PORTS.map(p => `ws://localhost:${p}/`);
export const ALL_MOD_FLAGS: ModFlags[] = [
    "modify-request",
    "background-script",
    "requests",
    "disable-unload",
    "extend-loading"
];
