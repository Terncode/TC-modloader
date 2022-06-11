import { pushUniq, removeItem } from "./utils";

export type TCListener = (...args: Readonly<any[]>) => any;
export class TCEventEmitter {
    private methods = new Map<string, TCListener[]>();

    on(key: string, listener: TCListener) {
        const arr = this.methods.get(key) || [];
        pushUniq(arr, listener);
        this.methods.set(key, arr);
        return this;
    }

    off(key?: string, listener?: TCListener) {
        if (key) {
            if (listener) {
                const arr = this.methods.get(key);
                if (arr){
                    removeItem(arr, listener);
                    this.methods.set(key, arr);
                }
            } else {
                this.methods.delete(key);
            }
        } else {
            this.methods.clear();
        }
        return this;
    }

    protected emit(key: string, ...args: any) {
        const array = this.methods.get(key);
        if (array) {
            for (let i = 0; i < array.length; i++) {
                array[i](...args);
            }
        }
    }
    protected emitReturn(key: string, ...args: any): any[] {
        const returns: any[] = [];
        const array = this.methods.get(key);
        if (array) {
            for (let i = 0; i < array.length; i++) {
                returns.push(array[i](...args));
            }
        }
        return returns;
    }
}
