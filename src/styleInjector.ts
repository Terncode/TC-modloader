import { clamp } from "lodash";

export class InjectableStyle {
    private style: HTMLStyleElement;
    private count = 0;

    constructor(styleContent: string) {
        const style = document.createElement("style");
        style.textContent = styleContent;
        this.style = style;
    }

    use() {
        this.count++;
        this.ensureExistence();
    }
    unuse() {
        this.count = clamp(this.count - 1, 0, Number.MAX_SAFE_INTEGER);
        this.ensureExistence();
    }
    private ensureExistence() {
        const contains = document.contains(this.style);
        if (this.count > 0) {
            if (!contains) {
                document.head.appendChild(this.style);
            }
        } else {
            if (contains) {
                this.style.parentElement.removeChild(this.style);
            }
        }
    }

}
