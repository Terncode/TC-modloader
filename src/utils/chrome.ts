import { BrowserTabQueryInfo } from "../browserCompatibility/browserInterfaces";
import storage from "../browserCompatibility/browserStorage";
import tabs from "../browserCompatibility/browserTabs";

export async function chromeRemoveItem(key?: string) {
    await storage.local.remove(key);
}
export async function chromeGetItem<T = any | undefined>(key?: string): Promise<T> {
    const data = await storage.local.get(null);
    if(data) {
        return data[key];
    }  else {
        return null;
    }

}
export async function chromeSetItem(key: string, value: any) {
    const obj = {};
    obj[key] = value;
    await storage.local.set(obj);
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
