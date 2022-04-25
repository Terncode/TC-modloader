import { random, sample } from "lodash";
import { TC_Toaster } from "./utils/Toaster";

export async function testToaster () {
    let count = 0;
    for (let i = 0; i < 500; i++) {
        TC_Toaster.makeToast("Brute tester", `Brute tester ${count++}`, sample(["error", "info", "warn"])).show(random(500, 1000));
    }
    await new Promise(r => setTimeout(r, 500));

    for (let i = 0; i < 50; i++) {
        TC_Toaster.makeToast("Brute tester", `Brute tester ${count++}`, sample(["error", "info", "warn"])).show(random(500, 1000));
        await new Promise(r => setTimeout(r, 100));
    }
}
