import { debounce, isNative } from "lodash";
import { IModGui, TC_BUTTON_TYPE } from "../commonInterface";
import { appendIfDoesNotExist, removeFromDom } from "../utils/utils";
import { uid } from "uid";
import { ButtonActivationPosition, OriginSettings, StealthMode } from "../interfaces";

interface PointOffset {
    x: number;
    y: number;
    xOff: number;
    yOff: number;
}

export class ModGui implements IModGui {
    private readonly FADEOUT_ANIMATION = 250;
    private modKey = new Map<HTMLElement, HTMLElement>();
    private banner = document.createElement("div");
    private exitButton = document.createElement("button");
    private activateButton = document.createElement("div");
    private wnd: Window;
    private bonds = {
        w: 150,
        h: 35
    };
    private container = document.createElement("div");
    private frame: NodeJS.Timeout;
    private moving: PointOffset;
    private remove = false;
    private style: HTMLStyleElement;
    private buttonClasses = {
        normal: "",
        warn: "",
        error: "",
        containerClass: "",
        modClass: "",
    };
    private buttonText = "Mod menu";

    constructor(private settings: OriginSettings) {
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("touchmove", this.onTouchMove);
        window.addEventListener("mouseup", this.onMouseUp);
        window.addEventListener("touchend", this.onMouseUp);
        window.addEventListener("resize", this.fixBounds);
        window.addEventListener("beforeunload", this.unload);
        const s = this.activateButton.style;
        const style = createStyle(this.FADEOUT_ANIMATION);
        this.style = style.style;
        this.buttonClasses.normal = style.buttonClass;
        this.buttonClasses.warn = style.buttonWarnClass;
        this.buttonClasses.error = style.buttonErrorClass;
        this.buttonClasses.containerClass = style.containerClass;
        this.buttonClasses.modClass = style.modClass;

        document.head.appendChild(style.style);
        this.activateButton.classList.add(style.activatorButtonClass);
        s.zIndex = `${Number.MAX_SAFE_INTEGER}`;
        this.activateButton.textContent = this.buttonText;
        this.activateButton.addEventListener("click", this.show);

        this.container.classList.add(style.containerClass);


        this.banner.classList.add(style.bannerClass);
        this.banner.textContent = "TC's modloader";
        const setMoving = (clientX: number, clientY: number, offsetX: number, offsetY: number) => {
            this.moving = {
                x: clientX,
                y: clientY,
                xOff: offsetX,
                yOff: offsetY,
            };
            this.banner.style.cursor = "grabbing";
        };

        this.banner.addEventListener("mousedown", (event: MouseEvent) => {
            setMoving(event.clientX, event.clientY, event.offsetX, event.offsetY);
        });
        this.banner.addEventListener("touchstart",  (event: TouchEvent) => {
            const lastTouch = event.touches[event.touches.length - 1];
            const div = event.target as HTMLDivElement;
            const { x, y, width, height} = div.getBoundingClientRect();
            const offsetX = (lastTouch.clientX - x) / width * div.offsetWidth;
            const offsetY = (lastTouch.clientY - y) / height * div.offsetHeight;
            setMoving(lastTouch.clientX, lastTouch.clientY, offsetX, offsetY);
        });

        this.exitButton = document.createElement("button");
        this.exitButton.textContent = "X";
        this.exitButton.classList.add(style.exitButtonClass);
        this.exitButton.addEventListener("click", () => {
            this.hide();
        });

        this.container.appendChild(this.banner);
        this.container.appendChild(this.exitButton);
    }
    destroy() {
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        window.removeEventListener("touchend", this.onMouseUp);
        window.removeEventListener("resize", this.fixBounds);
        window.removeEventListener("beforeunload", this.unload);
        window.removeEventListener("touchmove", this.onTouchMove);
        removeFromDom(this.style);
        removeFromDom(this.activateButton);
        removeFromDom(this.container);
        this.clearTimeout();
        if(this.wnd){
            this.wnd.close();
            this.wnd = undefined;
        }
    }
    hideAll(){
        this.hide();
        removeFromDom(this.activateButton);
        removeFromDom(this.container);
        this.clearTimeout();
    }

    private appendIfDoesNotExist(element: HTMLElement, appendTo: HTMLElement) {
        appendIfDoesNotExist(element, appendTo);
        if (document.contains(this.container) || document.contains(this.activateButton)) {
            appendIfDoesNotExist(this.style, document.head);
        }
    }
    private removeFromDom(element: HTMLElement) {
        removeFromDom(element);
        if (!document.contains(this.container) && !document.contains(this.activateButton)) {
            removeFromDom(this.style);
        }
    }
    private unload = () => {
        this.hide();
        this.destroy();
    };

    private autoHide = debounce(() => {
        this.goOffScreen();
        this.clearTimeout();
        this.frame = setTimeout(() => {
            this.removeFromDom(this.activateButton);
        }, this.FADEOUT_ANIMATION);
    }, 1000);

    updateSettings(settings: OriginSettings) {
        this.settings = settings;
        if (settings.stealthMode === StealthMode.Strict) {
            this.hide();

            removeFromDom(this.style);
            removeFromDom(this.activateButton);
            removeFromDom(this.container);
            this.exitButton.style.display = "";
        } else {
            if( [ButtonActivationPosition.Left, ButtonActivationPosition.Right].includes(this.settings.activateButtonPosition)) {
                this.activateButton.textContent = "MM";
            } else {
                this.activateButton.textContent = this.buttonText;
            }
            if(this.settings.activateButtonPosition === ButtonActivationPosition.None) {
                this.exitButton.style.display = "";
            } else {
                this.exitButton.style.display = "none";
            }
        }
        if (!this.shown && this.location !== ButtonActivationPosition.None) {
            this.suggest();
        }
    }

    private onMouseUp = () => {
        this.moving = undefined;
        this.banner.style.cursor = "grab";
        if(this.remove) {
            this.remove = false;
            this.hide();
        }

    };
    private onTouchMove = (event: TouchEvent) => {
        if (!(event instanceof TouchEvent) || !event.isTrusted){
            return;
        }
        for (let i = 0; i < event.touches.length; i++) {
            const touch = event.touches[i];
            const { clientX, clientY } = touch;
            this.handleMoveLogic(clientX, clientY);
        }
    };

    private onMouseMove = (event: MouseEvent) => {
        if (!(event instanceof MouseEvent) || !event.isTrusted || event.ctrlKey || event.altKey || event.metaKey){
            return;
        }
        const { clientX, clientY } = event;
        this.handleMoveLogic(clientX, clientY);
    };

    private handleMoveLogic(clientX: number, clientY: number) {
        if (this.moving) {
            const cb = this.container.getBoundingClientRect();
            const bb = this.banner.getBoundingClientRect();
            const offXSet = bb.left - cb.left;
            const offYSet = bb.top - cb.top;

            const s = this.container.style;
            const y = clientY - this.moving.yOff - offYSet;
            const x = clientX - this.moving.xOff - offXSet;
            s.left = `${x}px`;
            s.top = `${y}px`;
            this.fixBounds();
        }
        this.container.style.backgroundColor = "";
        this.remove = false;
        const middleX = Math.round(window.innerWidth * 0.5);
        const middleY = Math.round(window.innerHeight * 0.5);
        switch (this.location) {
            case "Top":
            case "Bottom":
                const halfWidth = (this.bonds.w * 0.5);
                const startX = middleX - halfWidth;
                const endX = middleX + halfWidth;
                if(clientX > startX && clientX < endX) {
                    if(this.location === "Top") {
                        if(clientY < this.bonds.h) {
                            this.suggest();
                        }
                    } else {
                        if(clientY > window.innerHeight - this.bonds.h) {
                            this.suggest();
                        }
                    }
                }
                break;
            case "Left":
            case "Right":
                const halfHeight = (this.bonds.w * 0.5);
                const startY = middleY - halfHeight;
                const endY = middleY + halfHeight;
                if(clientY > startY && clientY < endY) {
                    if(this.location === "Left") {
                        if(clientX < this.bonds.h) {
                            this.suggest();
                        }
                    } else {
                        if(clientX > window.innerWidth - this.bonds.h) {
                            this.suggest();
                        }
                    }
                }
                break;
            default:
                break;
        }
    }

    private fixBounds = () => {
        if(this.shown) {
            const {left, top, width, height} = this.container.getBoundingClientRect();
            const s = this.container.style;
            if (width > window.innerWidth || height > window.innerHeight) {
                const padding = 10;
                if (width > window.innerWidth) {
                    s.width = `${window.innerWidth - padding}px`;
                }
                if (height > window.innerHeight) {
                    s.height = `${window.innerHeight - padding}px`;
                }
                s.overflow = "auto";
            } else {
                s.width = "";
                s.height = "";
                s.overflow = "";
                if (left < 0) {
                    s.left = `0px`;
                }
                if (top < 0) {
                    s.top = `0px`;
                }
                if(left + width > window.innerWidth) {
                    s.left = `${window.innerWidth - width}px`;
                }
                if (top + height > window.innerHeight) {
                    s.top = `${window.innerHeight - height}px`;
                }
            }
        }
    };

    private clearTimeout() {
        clearTimeout(this.frame);
        this.frame = undefined;
    }

    private suggest() {
        if(this.modKey.size === 0) {
            return;
        }
        if (this.location === "None") {
            this.removeFromDom(this.activateButton);
            return;
        }
        this.clearTimeout();
        if (this.shown) {
            if(this.moving) {
                this.container.style.backgroundColor = "red";
                this.remove = true;
            }

            this.removeFromDom(this.activateButton);
            return;
        }

        const s = this.activateButton.style;
        if (this.location === ButtonActivationPosition.Top && s.top === "0px") return;
        if (this.location === ButtonActivationPosition.Right && s.top === "0px") return;
        if (this.location === ButtonActivationPosition.Bottom && s.top === "0px") return;
        if (this.location === ButtonActivationPosition.Left && s.top === "0px") return;

        s.top = "";
        s.right = "";
        s.bottom = "";
        s.left = "";
        s[this.location] = "0px";

        const l = this.location;
        switch (l) {
            case ButtonActivationPosition.Top:
            case ButtonActivationPosition.Bottom: {
                s.width = `${this.bonds.w}px`;
                s.height = `${this.bonds.h}px`;
                const middleX = Math.round(window.innerWidth * 0.5);
                s.left = `${middleX - (this.bonds.w * 0.5)}px`;
                break;
            }
            case ButtonActivationPosition.Left:
            case ButtonActivationPosition.Right: {
                s.height = `${this.bonds.w}px`;
                s.width = `${this.bonds.h}px`;
                const middleY = Math.round(window.innerHeight * 0.5);
                s.top = `${middleY - (this.bonds.h * 0.5)}px`;
                break;
            }
        }


        this.goOffScreen();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                switch (l) {
                    case ButtonActivationPosition.Top:
                        s.top = "0px";
                        break;
                    case ButtonActivationPosition.Bottom:
                        s.bottom = "0px";
                        break;
                    case ButtonActivationPosition.Left:
                        s.left = "0px";
                        break;
                    case ButtonActivationPosition.Right:
                        s.right = "0px";
                        break;
                }
            });
        });
        this.appendIfDoesNotExist(this.activateButton, document.body);

        this.autoHide();

    }

    private goOffScreen() {
        const s = this.activateButton.style;
        switch (this.location) {
            case ButtonActivationPosition.Top:
                s.top = `${-this.bonds.h}px`;
                break;
            case ButtonActivationPosition.Bottom:
                s.bottom = `${-this.bonds.h}px`;
                break;
            case ButtonActivationPosition.Left:
                s.left = `${-this.bonds.w}px`;
                break;
            case ButtonActivationPosition.Right:
                s.right = `${-this.bonds.w}px`;
                break;

            default:
                break;
        }
    }

    get shown() {
        return document.body.contains(this.container);
    }

    appendModLayout(element: HTMLElement): void {
        const div = document.createElement("div");
        div.appendChild(element);
        div.classList.add(this.buttonClasses.modClass);
        this.modKey.set(element, div);
        this.container.appendChild(div);
        if (this.modKey.size === 1 && this.settings.stealthMode !== StealthMode.Strict) {
            this.suggest();
        }
    }
    removeModLayout(element: HTMLElement): void {
        const toRemove = this.modKey.get(element);
        if (toRemove) {
            this.modKey.delete(element);
            this.container.removeChild(toRemove);
        }
        if(this.modKey.size === 0) {
            this.hide();
        }
    }

    createBtn(text: string, cb: (event: MouseEvent, button: HTMLButtonElement, setStyle: (style: TC_BUTTON_TYPE) => void) => void, type?: TC_BUTTON_TYPE) {
        const btn = document.createElement("button");
        btn.textContent = text;
        const setType = (style: TC_BUTTON_TYPE) => {
            btn.classList.remove(this.buttonClasses.warn, this.buttonClasses.error);
            switch (style) {
                case "danger":
                    btn.classList.add(this.buttonClasses.error);
                    break;
                case "warning":
                    btn.classList.add(this.buttonClasses.warn);
                    break;
                default:
                    break;
            }
            return;
        };
        btn.classList.add(this.buttonClasses.normal);
        setType(type);
        btn.addEventListener("click", (event) => {
            cb(event, btn, setType);
        });
        return {
            button: btn,
            setType,
        };
    }
    createBtnTitle(buttonTitle: string, buttonText: string, cb: (event: MouseEvent, button: HTMLButtonElement, setStyle: (style: TC_BUTTON_TYPE) => void) => void, type?: TC_BUTTON_TYPE) {
        const div = document.createElement("div");
        const span = document.createElement("span");
        const button = this.createBtn(buttonText, cb, type);
        span.textContent = `${buttonText}:`;
        div.appendChild(span);
        div.appendChild(button.button);
        return {
            ...button,
            div,
        };
    }
    show = (event?: MouseEvent) => {
        if (this.modKey.size === 0) return;
        this.clearTimeout();
        this.removeFromDom(this.activateButton);
        let x = (window.innerWidth * 0.5);
        let y = 0;
        if (event) {
            x = event.clientX;
            y = event.clientY;
        }

        const { width, height } = this.container.getBoundingClientRect();
        if (this.settings.stealthMode === StealthMode.Strict) {
            if(this.wnd) {
                this.wnd.focus();
                return;
            };
            this.container.style.left = "0px";
            this.container.style.top = "0px";
            const params = `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=50,height=50`;

            if (isNative(window.open)) {
                this.wnd = window.open("", "", params);
            }
            if (this.wnd) {
                this.wnd.document.body.style.background = "black";
                this.wnd.document.body.appendChild(this.style);
                this.wnd.document.body.appendChild(this.container);
                const { width, height } = this.container.getBoundingClientRect();
                const wHeight = this.wnd.outerHeight - this.wnd.innerHeight;
                const wWidth = this.wnd.outerWidth - this.wnd.innerWidth;
                const w = width + wWidth;
                const h = height + wHeight;
                this.wnd.resizeTo(w, h);
                this.wnd.moveTo(
                    Math.floor((window.screen.width * 0.5) - (w * 0.5)),
                    Math.floor((window.screen.height * 0.5) - (h * 0.5)),
                );
            } else {
                if(isNative(window.alert)) {
                    window.alert("Unable to open window. Make sure that you have enabled\n -\"Sites can send pop-ups and use redirects\"");
                }
            }

            return;
        }

        this.appendIfDoesNotExist(this.container, document.body);;

        this.container.style.left = `${x - width * 0.5}px`;
        this.container.style.top = `${y - height * 0.5}px`;
        this.fixBounds();

    };
    hide = () => {
        if (this.wnd){
            this.wnd.close();
            this.wnd = undefined;
        }
        this.removeFromDom(this.container);
    };
    get location() {
        return  this.settings.stealthMode === StealthMode.Strict ? ButtonActivationPosition.None : this.settings.activateButtonPosition;
    }
}

function createStyle(fadeout: number) {
    const correct = (text: string) => {
        const int = parseInt(text.charAt(0), 10);
        return isNaN(int) ? text : `${String.fromCharCode(int + 97)}${text.slice(1)}`;
    };
    const style = document.createElement("style");
    const activatorButtonClass = correct(uid(8));
    const bannerClass = correct(uid(8));
    const containerClass = correct(uid(8));
    const modClass = correct(uid(8));
    const exitButtonClass = correct(uid(8));

    const buttonClass = correct(uid(8));
    const buttonWarnClass = correct(uid(8));
    const buttonErrorClass = correct(uid(8));

    const sides = ["top", "right", "bottom", "left"];
    const transitionsButton = sides.map(e => `${e} ${fadeout}ms`);

    style.textContent = `
        .${activatorButtonClass} {
            position: fixed !important;
            border: 1px solid white !important;
            background-color: black !important;
            color: white !important;
            text-align: center !important;
            font-size: 20px !important;
            outline: none !important;
            font-family: good_timing, monospace !important;
            cursor: pointer !important;
            user-select: none !important;
            transition: ${transitionsButton.join(", ")};
            z-index: ${Number.MAX_SAFE_INTEGER};
            overflow: hidden;
        }
        .${containerClass} {
            position: fixed !important;
            border: 1px solid white !important;
            background-color: black;
            color: white !important;
            text-align: center !important;
            font-size: 20px !important;
            outline: none !important;
            min-width: 150px;
            min-height: 50px;
            font-family: good_timing, monospace !important;
            user-select: none !important;
            z-index: ${Number.MAX_SAFE_INTEGER};
        }
        .${modClass} {
            border: 1px solid white;
            background-color: black;
            font-size: 15px;
            text-align: left;
            outline: none;
            font-family: good_timing, monospace;
            padding: 2px;
            margin: 2px;
        }
        .${bannerClass} {
            background-color: rgba(255,255,255,0.25);
            font-size: 15px;
            font-family: dead_space;
            text-align: center;
            padding: 5px;
            margin: 5px;
            text-shadow: 0px 0px 2px #000001;
            cursor: grab;
        }
        .${exitButtonClass} {
            position: absolute !important;
            right: 0px !important;
            top: 0px !important;
            background-color: rgb(255, 64, 64) !important;
            outline: none !important;
            color: white;
            border: none;
            outline: none;
            cursor: pointer;
        }
        .${buttonClass} {
            position: relative !important;
            background-color: black;
            outline: none !important;
            color: white;
            border: 1px solid white;
            outline: none;
            cursor: pointer;
            transition: background-color 0.25s;
        }
        .${buttonClass}: hover {
            background-color: rgba(255, 255, 255, 0.50) !important;
        }
        .${buttonClass} .${buttonWarnClass} {
            background-color: #332b00;
            color: #d3ab26;
            border: 1px solid #d3ab26;
        }
        .${buttonClass} .${buttonErrorClass} {
            background-color: #290000;
            color: #dd8080;
            border: 1px solid #dd8080;
        }
        .${containerClass}::-webkit-scrollbar {
            width: 10px;
        }
        .${containerClass}::-webkit-scrollbar-track {
          background: black; 
          border: 1px solid white;
        }
        .${containerClass}::-webkit-scrollbar-thumb {
          background: white; 
        }
        .${containerClass}::-webkit-scrollbar-thumb:hover {
          background: rgba(200, 200, 200); 
          border: 1px solid black; 
        }
    `;

    return {
        activatorButtonClass,
        bannerClass,
        exitButtonClass,
        containerClass,
        buttonClass,
        buttonWarnClass,
        buttonErrorClass,
        modClass,
        style,
    };
}
