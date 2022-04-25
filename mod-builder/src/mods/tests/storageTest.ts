/// <reference path="../../helpers/global.d.ts" />

import { random } from "lodash";
import { registerMod } from "../../helpers/utils";

export default class TestStorage extends IBaseMod {
    static get modName() {
        return "Test Storage";
    }
    static get description() {
        return "Test mod storage";
    }
    static get version() {
        return "0.0.0";
    }

    onLoad() {
        [
            "test",
            "hello world",
            "how about some really long string just to test if it works",
            "--asdAQW)ERi-2w34ikorp",
            "lpdsikojfhijb"
        ].forEach(item => this.saveExample(item));

        const saveStorage = "mod-loaded";
        this.getItem(saveStorage).then((count: any) => {
            count = count || 0;
            count++;
            if (count === 1) {
                console.log("Restart browser if this message disappears storage is successfully stored");
            } else {
                console.log(`Preserving storage works. This mod has been launched ${count} times`);
            }
            this.setItem(saveStorage, count);
        });

    }
    saveExample(key: string){
        const objectToSave = {
            key: {
                number: random(0, 99999),
                float: random(0, 99999, true),
                string: "hello world",
                boolean: true,
                object: {
                    deep: {
                        deeper: {
                            evenDeeper: {
                                underTheIceBerg: {
                                    ground: null,
                                }
                            }
                        }
                    }
                },
                array: [
                    1234567489,
                    0.0005,
                    "hello world",
                    true,
                    false,
                ]
            }
        };
        this.setItem(key, objectToSave).then(() => {
            this.getItem(key).then(obj => {
                if(obj && typeof obj === "object" && objectToSave.key.number === obj.key.number) {
                    console.log(`${key} setItem() getItem() work!`);
                } else {
                    console.error(`${key} setItem() getItem() gave unexpected object!`);
                }
                console.log(objectToSave, obj);
                this.deleteItem(key).then(() => {
                    this.getItem(key).then(obj => {
                        if(obj) {
                            console.error(`${key} deleteItem does not work!`, obj);
                        } else {
                            console.info(`${key} deleteItem() does work!`, );

                        }
                    });
                });
            });
        });
    }

    onUnload(): Promise<void> | void {
    }
}
registerMod(TestStorage);
