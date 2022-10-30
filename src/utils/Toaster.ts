import { ToastType } from "../commonInterface";;
import { appendIfDoesNotExist, d, decorateElement, removeFromDom, writeClipboard } from "./utils";

export class TC_Toaster {
    static TOASTER_ID = "tc-toast";
    static TOASTER_STYLER_ID = "tc-t-styler";
    static CAP = 10;

    static makeToast(title: string, description: string, type: ToastType = "info")  {
        const div = TC_Toaster.ensureToastPresented();
        const toast = new Toast(title, description, type, div);
        const originalHide = toast["onFullHide"].bind(toast);
        toast["onFullHide"] = () => {
            if (toast["ref"] && toast["ref"].contains(toast["toast"])) {
                toast["ref"].removeChild(toast["toast"]);
            }
            const internalReturn = originalHide();
            const div = TC_Toaster.getExiting();
            if (div.toaster) {
                const count = div.toaster.children.length;
                if (!count) {
                    if (div.toaster.parentElement) {
                        removeFromDom(div.toaster);
                        if(div.style) {
                            removeFromDom(div.style);

                        }
                    }
                }
            }
            return internalReturn;
        };
        return toast;
    }


    private static getExiting() {
        return {
            toaster: d().getElementById(TC_Toaster.TOASTER_ID)  as HTMLDivElement,
            style: d().getElementById(TC_Toaster.TOASTER_STYLER_ID) as HTMLStyleElement,
        };
    }

    static ensureToastPresented() {
        let divToaster = TC_Toaster.getExiting().toaster;
        if (!divToaster) {
            divToaster = d().createElement("div");
            divToaster.id = this.TOASTER_ID;
            decorateElement(divToaster);
        }
        appendIfDoesNotExist(divToaster, document.body);
        TC_Toaster.ensureStyleIsPresented();
        return divToaster;
    }

    static ensureStyleIsPresented() {
        let style = TC_Toaster.getExiting().style;
        if (!style) {
            style = d().createElement("style");
            style.textContent = getToasterStyle();
            style.id = TC_Toaster.TOASTER_STYLER_ID;
            decorateElement(style);
        }
        appendIfDoesNotExist(style, d().head);
        return style;
    }
}

export class Toast {
    static readonly FADE_TIME = 500;
    private toast = document.createElement("div");
    private h1 = document.createElement("h1");
    private span = document.createElement("span");
    private frame: NodeJS.Timeout;
    private hiding: NodeJS.Timeout;
    private lastDuration = 1000;
    static readonly CLASS = {
        ERROR: "err",
        WARN: "wrn",
        INFO: "inf",
        //TOAST: "TC-toast",
    };

    constructor(private _title : string, private _description: string, private _type: ToastType, private ref: HTMLDivElement) {
        this.setTitle(_title).setDescription(this._description).setType(_type);
        //this.toast.classList.add(Toast.CLASS.TOAST);
        this.toast.append(this.h1);
        this.toast.append(this.span);
        this.toast.addEventListener("click", event => {
            this.setTime(500);
            if(event.ctrlKey) {
                const wrote = writeClipboard(`${this.title}: ${this.description}`);
                if (wrote) {
                    this.setDescription("Copied to clipboard");
                } else {
                    this.hide();
                }
            } else {
                this.hide();
            }
        });
    }
    get title() {
        return this._title;
    }
    setTitle(value: string) {
        this._title = value;
        this.h1.textContent = `${this._title}:`;
        return this;
    }
    get description() {
        return this._description;
    }
    setDescription(value: string) {
        this.span.textContent = this._description = value;
        return this;
    }
    get type() {
        return this._type;
    }
    get scriptType() {
        return SCRIPT_TYPE;
    }
    setType(type: ToastType) {
        this._type = type;
        const possibleClasses = [Toast.CLASS.ERROR, Toast.CLASS.WARN, Toast.CLASS.INFO];
        const cl = this.toast.classList;
        for (const className of possibleClasses) {
            cl.remove(className);
        }

        switch (type) {
            case "error":
                cl.add(Toast.CLASS.ERROR);
                break;
            case "warn":
                cl.add(Toast.CLASS.WARN);
                break;
            case "info":
                cl.add(Toast.CLASS.INFO);
                break;
        }
        return this;
    }
    show(duration: number) {
        if (!this.isVisible) {
            while(this.ref.children.length > TC_Toaster.CAP) {
                const lastChild = this.ref.children[0] as HTMLElement;
                removeFromDom(lastChild);
            }
            if (!d().contains(this.ref)) {
                this.ref = TC_Toaster.ensureToastPresented();
                TC_Toaster.ensureStyleIsPresented();
            }
            this.ref.appendChild(this.toast);
            this.toast.style.opacity = "0";
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.toast.style.opacity = "1";
                });;
            });
        }
        this.bindTimeout(duration);
        return this;
    }
    protected onFullHide() {}
    hide() {
        this.clearFrame();
        const parent = this.toast.parentElement;
        this.toast.style.opacity = "0";
        if (parent) {
            this.hiding = setTimeout(() => {
                //TODO check
                removeFromDom(this.toast);
                this.onFullHide();
            }, Toast.FADE_TIME);
        }
        return this;
    }
    setTime(duration = this.lastDuration) {
        if (this.isVisible) {
            this.bindTimeout(duration);
        } else {
            this.show(duration);
        }
    }
    private get isVisible() {
        return this.ref.contains(this.toast);
    }
    private bindTimeout(duration: number) {
        this.clearFrame();
        this.lastDuration = duration;
        this.frame = setTimeout(() => {
            this.hide();
        }, duration);
    }
    private clearFrame() {
        if(this.frame) {
            clearTimeout(this.frame);
        }
        if(this.hiding) {
            clearTimeout(this.hiding);
        }
        this.frame = undefined;
        this.hiding = undefined;
    }
}

export function getToasterStyle() {
    return (`
    #${TC_Toaster.TOASTER_ID} {
        position: fixed;
        bottom: 0;
        margin: auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        font-family: moz_dead_space, dead_space, monospace;
        padding: 0;
        margin: 0;
        user-select: none;
        z-index: ${Number.MAX_SAFE_INTEGER};
        pointer-events: none;
        touch-action: none;
        
    }
    #${TC_Toaster.TOASTER_ID} > div {
        border: 1px solid white;
        background-color: black;
        color: white;
        font-family: moz_dead_space, dead_space, monospace;
        padding: 2px;
        margin: auto;
        display: flex;
        transition: background-color 0.25s, color 0.25s, opacity ${Toast.FADE_TIME}ms;
        cursor: pointer;
        align-items: center;

        pointer-events: all;
        touch-action: auto;
    }
    #${TC_Toaster.TOASTER_ID} > div:hover {
        background-color: rgba(255, 255, 255, 0.25);
        color: rgba(0, 0, 0, 0.25);
    }

    #${TC_Toaster.TOASTER_ID} > div > h1{ 
        font-size: 20px;
        font-family: monospace;
        margin-right: 2px;
        cursor: pointer;
        margin: 0;
        padding: 0;
    }
    #${TC_Toaster.TOASTER_ID} > div > span{ 
        font-size: 20px;
        font-family: monospace;
        cursor: pointer;
        margin: 0;
        padding: 0;
    }
    #${TC_Toaster.TOASTER_ID} .${Toast.CLASS.INFO} {
        background-color: black;
    
    }
    #${TC_Toaster.TOASTER_ID} .${Toast.CLASS.WARN} {
        background-color: #332b00;
        color: #d3ab26;
        border: 1px solid #d3ab26;
    }
    #${TC_Toaster.TOASTER_ID} .${Toast.CLASS.ERROR} {
        background-color: #290000;
        color: #dd8080;
        border: 1px solid #dd8080;
    }
    `);
}
