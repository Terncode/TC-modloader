/// <reference path="../../helpers/global.d.ts" />

import { registerMod } from "../../helpers/utils";

export default class GuiExample extends IBaseMod {
    private ref = document.createElement("div");
    static get modName() {
        return "Example gui";
    }
    static get description() {
        return "Adds buttons to mod menu";
    }
    static get version() {
        return "0.0.0";
    }

    protected onLoad(): void | Promise<void> {
        const div = document.createElement("div");
        div.textContent = "some other content";
        const btns = [
            this.gui.createBtnTitle("Title", "the button", () => console.log("test")),
            this.gui.createBtn("Show alter",() => this.dialog.alert("This is alert")),
            this.gui.createBtn("Show Toast",() => this.toaster.show("This is toast", "info", 1000)),
            this.gui.createBtn("Show warn toast",() => this.toaster.show("This is warn toast", "warn", 1000)),
            this.gui.createBtn("Show error toast",() => this.toaster.show("This is error toast", "error", 1000)),
            this.gui.createBtn("change me", (_mouseEvent, _button, setType) => {
                setType("warning");
            }, "danger"),
        ];
        this.ref.appendChild(div);
        for (const btn of btns) {
            this.ref.appendChild(btn.button);
        }
        this.gui.appendModLayout(this.ref);
    }
    protected onUnload(): void | Promise<void> {
        this.gui.removeModLayout(this.ref);
    }
}

registerMod(GuiExample);
