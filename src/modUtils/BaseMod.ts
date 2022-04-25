/* eslint-disable @typescript-eslint/no-unused-vars */
import { CodeModerOrBlocker, IBaseMod, ModFlags } from "../commonInterface";
import { IModGui, IModMenu, ModBackgroundEvent } from "../interfaces";


export class BaseMod extends IBaseMod {
    static flags: ModFlags[] = [];

    static get modName() {
        return "";
    }
    static get description() {
        return "";
    }
    static get version() {
        return "";
    }
    static get modifyCodes(): CodeModerOrBlocker[] {
        return [];
    }
    static get origins(): string[] {
        return [];
    }
    static get requirements(): string[] {
        return []; // Specify required mods to run this mod
    }
    static get priority(): number {
        return 0;
    }

    static background?(event: any): Promise<any> | any;
    onLoad(): Promise<void> | void {
    }
    onUnload(): Promise<void> | void {
    }

    async getItem<V = any>(key: string): Promise<V> {
        throw new Error("Method not implemented");
    }
    async setItem<V = any>(key: string, value: V): Promise<void> {
        throw new Error("Method not implemented");
    }
    async deleteItem(key: string): Promise<void>{
        throw new Error("Method not implemented");
    }
    static getItem<V = any>(key: string): Promise<V> {
        throw new Error("Method not implemented");
    }
    static setItem<V = any>(key: string, value: V): Promise<void> {
        throw new Error("Method not implemented");
    }
    static deleteItem(key: string): Promise<void>{
        throw new Error("Method not implemented");
    }
}
