export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getCodeIn(text: string, start: string, end: string) {
    let s = text.indexOf(start);
    let f = 0;
    while (true) {
        const index = text.indexOf(end, f + 1);
        if (index === -1) {
            break;
        }
        f = index;
    }
    return text.substring(s, f - s + 1);
}


declare const TC_EXPORT: any; // Compiler will inject this object into the context binding
export function registerMod(mod: any) {
    TC_EXPORT["TC_MOD"] = mod;
}
