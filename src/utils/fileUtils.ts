type ReaderType = "readAsText" | "readAsDataURL" | "readAsBinaryString" | "readAsArrayBuffer";
type ReturnTypes = string | ArrayBuffer;
export class FileReaderImproved {

    constructor(private blob: Blob) {}

    readFile(type: "readAsArrayBuffer"): Promise<ArrayBuffer>;
    readFile(type: "readAsText" | "readAsDataURL" | "readAsBinaryString"): Promise<string>;
    readFile(type: ReaderType): Promise<ReturnTypes> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                resolve(reader.result);
            });
            reader.addEventListener("error", err => {
                reject(err);
            });
            switch (type) {
                case "readAsArrayBuffer":
                    reader.readAsArrayBuffer(this.blob);
                    break;
                case "readAsBinaryString":
                    reader.readAsBinaryString(this.blob);
                    break;
                case "readAsDataURL":
                    reader.readAsDataURL(this.blob);
                    break;
                case "readAsText":
                    reader.readAsText(this.blob);
                    break;
                default:
                    reject(`Unknown reader type ${type}`);
                    break;
            }

        });
    }
}

export class FileInput {
    private input = document.createElement("input");

    constructor() {
        this.input.type = "file";
    }

    allowMultiple(value: boolean) {
        this.input.multiple = value;
    }
    setAcceptType(extensions?: string[]) {
        if (extensions) {
            this.input.accept = extensions.map(e => `.${e}`).join(", ");
        } else {
            this.input.accept = "";
        }
    }
    show() {
        return new Promise<FileList>((resolve, reject) => {
            const subs: (keyof WindowEventMap)[] = ["mousemove", "touchend"];
            const onCancel = () => {
                unlistenCancel();
                reject(new Error("Not selected"));
            };
            const unlistenCancel = () => {
                subs.forEach(s => window.removeEventListener(s, onCancel));
            };
            const frame = setTimeout(() => {
                subs.forEach(s => window.addEventListener(s, () => onCancel));
            }, 100);

            this.input.addEventListener("change", () => {
                clearTimeout(frame);
                unlistenCancel();
                resolve(this.input.files);
            });

            this.input.click();
        });
    }
}
