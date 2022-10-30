import { EXTENSION_PACK_KEY } from "../constants";
type Buffer = number[];

export class EncodeDecoder {
    private static readonly runtime_hash = EXTENSION_PACK_KEY;

    constructor(private encoding_key: string) {}

    encode(message: string): Buffer | string {
        const buffer: Buffer = [];
        const nextIndex = new NextIndex(this.encoding_key, EncodeDecoder.runtime_hash);
        for (let i = 0; i < message.length; i++) {
            let charCode = message.charCodeAt(i);
            charCode += nextIndex.nextNumber();
            buffer.push(charCode);
        }
        return BROWSER_ENV === "firefox" ? JSON.stringify(buffer) : buffer; // Firefox is having problems passing none primitive types in to window
    }
    decode(what: Buffer | string): string {
        what = BROWSER_ENV === "firefox" ? JSON.parse(what as string) : what;

        let decoded = "";
        const nextIndex = new NextIndex(this.encoding_key, EncodeDecoder.runtime_hash);
        for (let i = 0; i < what.length; i++) {
            const charCode = (what as Buffer)[i] - nextIndex.nextNumber();
            decoded += String.fromCharCode(charCode);
        }
        return decoded;
    }
}

class NextIndex {
    private index = 0;
    constructor(private key1: string, private key2: string) {
        const merged = `${key1}${key2}`;
        for (let i = 0; i < merged.length; i++) {
            this.index += merged.charCodeAt(i);
            if (i % 2) {
                this.index = Math.round(this.index / (merged.length * 0.5));
            }

        }
    }
    nextNumber() {
        this.index++;
        if (this.index % 2) {
            return this.key1.charCodeAt(this.index % this.key1.length);
        } else {
            return this.key2.charCodeAt(this.index % this.key2.length);
        }
    }
}
