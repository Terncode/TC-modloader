import { Logger } from "../utils/logger";
import { getOrigin } from "../utils/utils";
import { BackgroundModHandler } from "./modsUtils";

export interface ExBadge {
    onModStateChange: (tabId: number, count: number) => void;
    onModEnableStateChange: (tabId: number, count: number) => void;
}

export function createTabUpdate(bmh: BackgroundModHandler): ExBadge {
    const map = new Map<number, [number, number]>();

    const updateTab = (id: number) => {
        const res = map.get(id);
        if(res && res[1]) {
            const ok = res[0] === res[1];
            chrome.browserAction.setBadgeBackgroundColor({color: ok ? "#00a2ff" : "red"});
            chrome.browserAction.setBadgeText({text:`${res[0]}/${res[1]}`});
        } else {
            chrome.browserAction.setBadgeText({text:""});
        }
    };

    chrome.tabs.onHighlighted.addListener((info) => {
        const id = info.tabIds[0];
        chrome.tabs.query({}, tabs => {
            const tab = tabs.find(t => t.id === id);
            if (tab && tab.url && tab.url.startsWith("http"))  {
                const res = map.get(id);
                if (!res) {
                    const enabled = bmh.installedMods.filter(m => m.enabledOnOrigins.includes(getOrigin(tab.url)));
                    map.set(tab.id, [0, enabled.length]);
                }
            } else {
                chrome.browserAction.setBadgeText({text:""});
            }
            updateTab(id);
        });
    });

    const update = (tab: chrome.tabs.Tab) => {
        if(tab.url) {
            const enabled = bmh.installedMods.filter(m => m.enabledOnOrigins.includes(getOrigin(tab.url)));
            map.set(tab.id, [0, enabled.length]);
            updateTab(tab.id);
        } else {
            map.delete(tab.id);
        }
    };

    // chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    //     if(changeInfo.status === "loading") {
    //         update(tab);
    //     }
    // });

    chrome.tabs.onCreated.addListener(tab => {
        if(tab.url) {
            update(tab);
        }
    });
    chrome.tabs.onRemoved.addListener(id => {
        map.delete(id);
        updateTab(id);
    });

    return {
        onModStateChange: (id, count) => {
            const r = map.get(id);
            if(r) {
                r[0] = count;
                map.set(id, r);
                updateTab(id);
            }
        },
        onModEnableStateChange: (id, count) => {
            const r = map.get(id);
            if(r) {
                r[1] = count;
                map.set(id, r);
                updateTab(id);
            }
        },
    };
}
