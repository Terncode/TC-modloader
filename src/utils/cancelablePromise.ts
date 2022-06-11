export class CancelablePromise<T = any> extends Promise<T> {
    private _TC_reject: any;

    constructor(executor: (resolve: (value: unknown) => void, reject: (reason?: any) => void) => void) {
        let r: (reason?: any) => void;
        super((resolve, reject) => {
            r = reject;
            return executor(resolve, reject);
        });
        this._TC_reject = r!;
    }

    _destroy(reason: string) {
        if(this._TC_reject) {
            this._TC_reject(new Error(reason));
        }
    }
}
