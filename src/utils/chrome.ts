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

export function chromeGetUrl(url: string) {
    return chrome.extension.getURL(url);
}

export function getTabs(queryInfo: chrome.tabs.QueryInfo = {}) {
    return new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query(queryInfo,tabs =>{
            resolve(tabs.filter(t => t.url && t.url.startsWith("http")));
        });
    });
}
export async function getActiveTab() {
    const tabs = await getTabs({
        active: true,
        currentWindow: true,
    });
    return tabs[0];
}
