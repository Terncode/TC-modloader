import { removeItem } from "./utils";

export class IDGenerator {
    private inUse: number[] = [];

    constructor(private readonly min: number, private readonly max: number) {
        if (this.min > this.max) {
            const temp = this.min;
            this.min = this.max;
            this.max = temp;
        }
    }

    next() {
        if (this.inUse.length >= this.range) {
            throw new Error(`id limit exuded use unuse(number) to release the taken id`);
        }
        let id = 0;

        while(this.hasId(id + this.min)) {
            id++;
        }
        const actualId = id + this.min;
        this.inUse.push(actualId);
        return actualId;
    }
    unuse(id: number) {
        removeItem(this.inUse, id);
    }

    hasId(id: number) {
        return this.inUse.indexOf(id) !== -1;
    }
    get range() {
        return this.max - this.min;
    }

}
