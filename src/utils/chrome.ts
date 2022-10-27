import { BrowserTabQueryInfo } from "../browserCompatibility/browserInterfaces";
import tabs from "../browserCompatibility/browserTabs";

export async function chromeRemoveItem(key?: string) {
    return new Promise<void>(resolve => {
        chrome.storage.local.remove(key, resolve);
    });
}
export async function chromeGetItem<T = any | undefined>(key?: string) {
    return new Promise<T>(resolve => {
        chrome.storage.local.get(null, data => {
            if(data) {
                resolve(data[key]);
            }  else {
                resolve(undefined);
            }
        });
    });
}
export async function chromeSetItem(key: string, value: any) {
    return new Promise<void>(resolve => {
        const obj = {};
        obj[key] = value;
        chrome.storage.local.set(obj, resolve);
    });
}

export async function getTabs(queryInfo: BrowserTabQueryInfo = {}) {
    const t = await tabs.query(queryInfo);
    return t.filter(t => t.url && t.url.startsWith("http"));
}
export async function getActiveTab() {
    const tabs = await getTabs({
        active: true,
        currentWindow: true,
    });
    return tabs[0];
}
