import { ModFlags, RegString } from "../commonInterface";
import { BaseMod } from "./BaseMod";

export interface ModMeta {
    name: string;
    description: string;
    version: string;
    flags: ModFlags[];
    hash: number;
    dependency?: string;
    requirements?: ModRequirement[];
    origins: RegString[];
    priority: number;
    dev?: boolean;
}
export interface ModRequirement {
    dependencyName: string;
    version: string;
}

export interface ModMetaCode extends ModMeta {
    code: string;
}

interface ModBaseStorage {
    [key: string]: any
}

export interface ModActualStorage {
    staticMethod: ModBaseStorage;
    local: {
        [key: string]: ModBaseStorage;
    };
}

export interface ModMetaCodeWithStorage {
    modMetaCode: ModMetaCode;
    storage: ModActualStorage;
}

export interface ModMetaCompiled extends ModMeta {
    mod: typeof BaseMod;
    destroy: () => void;
    storage: ModActualStorage
}
export interface ModMetaCompiledVM extends ModMetaCompiled {
    destroy: () => void;
    context: {
        modContext: any,
        TC_EXPORT: {
            TC_MOD: typeof BaseMod;
        }
        rawCode: string;
    }
}


export interface ModStatus {
    enabled: boolean;
    dependencyError?: string;
}
export interface ModRaw {
    data: ArrayBuffer;
    fileName: string;
}
