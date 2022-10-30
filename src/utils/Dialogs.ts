import { appendIfDoesNotExist, decorateElement, removeFromDom } from "./utils";

export class TC_Dialog {
    static TC_DIALOG_CLASS = "tc-dialog";
    static TC_DIALOG_ID = "TC_DIALOG";
    static TC_DIALOG_STYLE_ID = "TC_DIALOG_STYLE";
    static FADE = 250;
    private static EVENT = {
        CLOSE: "TC_CLOSE",
    };
    static alert(message: any): Promise<void> {
        return new Promise<void>((resolve, _reject) => {
            const thing = TC_Dialog.createAndAnimate();
            let resolved = false;
            const r = () => {
                if (resolved) return true;
                resolved = true;
                resolve();
            };

            const header = document.createElement("h1");
            header.textContent = TC_Dialog.forceMsg(message);

            thing.blocker.addEventListener(TC_Dialog.EVENT.CLOSE, r);
            const btn = document.createElement("button");
            btn.textContent = "OK";
            btn.addEventListener("click", () => {
                r();
                TC_Dialog.removeDiv(thing.blocker);
            });
            thing.box.appendChild(header);
            thing.box.appendChild(btn);
            thing.animate();
        });
    }

    static prompt(message = "", _default = ""): Promise<string> {
        return new Promise<string>((resolve, _reject) => {
            const thing = TC_Dialog.createAndAnimate();
            let resolved = false;
            const r = (text: string) => {
                if (resolved) return true;
                resolved = true;
                resolve(text);
            };

            console.log(message, _default);
            const header = document.createElement("h1");

            header.textContent = TC_Dialog.forceMsg(message);
            thing.blocker.addEventListener(TC_Dialog.EVENT.CLOSE, () => r(null));

            const input = document.createElement("input");
            input.value = TC_Dialog.forceMsg(_default);

            const btnOk = document.createElement("button");

            btnOk.textContent = "OK";
            btnOk.addEventListener("click", () => {
                r(input.value);
                TC_Dialog.removeDiv(thing.blocker);
            });

            const btnCancel = document.createElement("button");
            btnCancel.textContent = "Cancel";
            btnCancel.addEventListener("click", () => {
                resolve(null);
                TC_Dialog.removeDiv(thing.blocker);
            });

            thing.box.appendChild(header);
            thing.box.appendChild(input);
            thing.box.appendChild(btnOk);
            thing.box.appendChild(btnCancel);
            thing.animate();
            input.focus();
        });
    }

    static confirm(_message?: string): Promise<boolean> {
        return new Promise<boolean>((resolve, _reject) => {
            const thing = TC_Dialog.createAndAnimate();
            let resolved = false;
            const r = (bool: boolean) => {
                if (resolved) return true;
                resolved = true;
                resolve(bool);
            };

            const header = document.createElement("h1");

            header.textContent = TC_Dialog.forceMsg(_message || "");
            thing.blocker.addEventListener(TC_Dialog.EVENT.CLOSE, () => r(false));
            const btnOk = document.createElement("button");

            btnOk.textContent = "OK";
            btnOk.addEventListener("click", () => {
                r(true);
                TC_Dialog.removeDiv(thing.blocker);
            });

            const btnCancel = document.createElement("button");
            btnCancel.textContent = "Cancel";
            btnCancel.classList.add("cl");
            btnCancel.addEventListener("click", () => {
                resolve(false);
                TC_Dialog.removeDiv(thing.blocker);
            });

            thing.box.appendChild(header);
            thing.box.appendChild(btnOk);
            thing.box.appendChild(btnCancel);
            thing.animate();
        });
    }

    static custom(onDestroy: () => void) {
        const thing = TC_Dialog.createAndAnimate();
        thing.blocker.addEventListener(TC_Dialog.EVENT.CLOSE, () => onDestroy);
        return {
            container: thing.box,
            next: thing.animate,
        };
    }

    private static forceMsg(obj: any) {
        const type = typeof obj;
        if (type === "string") {
            return obj;
        } else if (type === "object") {
            try {
                const data = JSON.stringify(type, null, 2);
                return data;
            } catch (error) {
                return obj.toString();
            }
        }
        return obj.toString();
    }

    private static createAndAnimate() {
        const blocker = TC_Dialog.createBlocker();
        const box = document.createElement("div");
        blocker.appendChild(box);
        //box.style.marginTop = `-${Number.MAX_SAFE_INTEGER}px`;
        return {
            blocker,
            box,
            animate: () => {
                const { height } = box.getBoundingClientRect();
                box.style.marginTop = `-${height}px`;
                TC_Dialog.next(() => {
                    box.style.marginTop = "50px";
                });
            }
        };
    }

    private static createBlocker() {
        TC_Dialog.removeDiv();
        const div = document.createElement("div");
        decorateElement(div);
        div.id = TC_Dialog.TC_DIALOG_ID;
        div.classList.add(TC_Dialog.TC_DIALOG_CLASS);
        div.style.opacity = `0`;
        TC_Dialog.next(() => {
            div.style.opacity = "1";
            TC_Dialog.removeStyle();
        });
        appendIfDoesNotExist(div, document.body);

        TC_Dialog.ensureStyle();
        return div;
    }

    private static next(next: () => void) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                next();
            });
        });
    }
    private static getExisting() {
        return {
            div: document.getElementById(TC_Dialog.TC_DIALOG_ID) as HTMLDivElement,
            style: document.getElementById(TC_Dialog.TC_DIALOG_STYLE_ID) as HTMLStyleElement,
        };
    }


    private static removeDiv(element?: HTMLDivElement) {
        const div = element || TC_Dialog.getExisting().div;
        if (!div) return;
        div.removeAttribute("id");
        div.style.opacity = `0`;
        const divWindow = div.children[0] as HTMLDivElement;

        const event = new Event(TC_Dialog.EVENT.CLOSE, { bubbles: true, cancelable: false });
        div.dispatchEvent(event);

        if(divWindow) {
            const bound = divWindow.getBoundingClientRect();
            if (bound && bound.height) {
                divWindow.style.marginTop = `-${bound.height}px`;
            }
        }
        setTimeout(() => {
            removeFromDom(div);
        }, TC_Dialog.FADE);
    }
    private static ensureStyle() {
        let style = TC_Dialog.getExisting().style;
        if (!style) {
            style = document.createElement("style");
            decorateElement(style);
            style.textContent = getToasterStyle();
            style.id = TC_Dialog.TC_DIALOG_STYLE_ID;
            appendIfDoesNotExist(style, document.head);
        }
    }
    private static removeStyle() {
        const { style, div } = TC_Dialog.getExisting();
        if (div) return;
        removeFromDom(style);
    }
}


export function getToasterStyle() {
    return (`
    .${TC_Dialog.TC_DIALOG_CLASS} {
        position: fixed;
        width: 100%;
        height: 100%;
        left: 0px;
        top: 0px;
        background-color: rgba(0, 0, 0, 0.75);
        transition: opacity ${TC_Dialog.FADE}ms;
        font-family: moz_good_timing, good_timing, monospace;
        overflow: auto;
        z-index: ${Number.MAX_SAFE_INTEGER - 10}
    }
    .${TC_Dialog.TC_DIALOG_CLASS} > div {
        border: 1px solid white;
        background-color: black;
        color: white;
        min-width: 150px;
        min-height: 50px;
        left: 50%;
        width: fit-content;
        margin: auto;
        transition: margin-top ${TC_Dialog.FADE}ms;
        overflow: auto;    
        padding: 10px;
        font-size: 15px;
        overflow: auto;
        z-index: ${Number.MAX_SAFE_INTEGER}
    }
    .${TC_Dialog.TC_DIALOG_CLASS} > div > h1 {
        font-family: moz_good_timing, monospace;
        white-space: pre;
        margin: 0px;
        padding: 2px;
        font-size: 15px;
        margin-bottom: 5px;
    }
    .${TC_Dialog.TC_DIALOG_CLASS} > div > button {
        font-family: moz_good_timing, good_timing, monospace;
        font-size: 15px;

        background-color: black;
        color: white;
        border: 1px solid white;
        float: right;
        padding: 5px;
        margin: 5px;
        transition: background-color 0.25s
        outline: none;
    }
    .${TC_Dialog.TC_DIALOG_CLASS} > div > button cl {
        color: red;
        border: 1px solid red;
    }

    .${TC_Dialog.TC_DIALOG_CLASS} > div > button:hover {
        background-color: rgb(64, 64, 64);
    }
    .${TC_Dialog.TC_DIALOG_CLASS} > div > input {
        outline: none;
        display: block;
        background-color: rgb(64, 64, 64);
        color: white;
        border: 1px solid white;
        font-family: monospace;
    }

    .${TC_Dialog.TC_DIALOG_CLASS}::-webkit-scrollbar {
        width: 10px;
    }
  
    .${TC_Dialog.TC_DIALOG_CLASS}::-webkit-scrollbar-track {
      background: black; 
      border: 1px solid white;
    }
   
    .${TC_Dialog.TC_DIALOG_CLASS}::-webkit-scrollbar-thumb {
      background: white; 
    }
  
    .${TC_Dialog.TC_DIALOG_CLASS}::-webkit-scrollbar-thumb:hover {
      background: rgba(200,200,200); 
      border: 1px solid black; 
    }
    

    `);
}
