import { BrowserStorage, createNotImplemented } from "./browserInterfaces";

const storage: BrowserStorage =  {
    local: {
        clear: createNotImplemented("store.local.clear"),
        get: createNotImplemented("store.local.get"),
        remove: createNotImplemented("store.local.remove"),
        set: createNotImplemented("store.local.set"),
        getQuotaBytes: createNotImplemented("store.local.getQuotaBytes"),
    }
};

if (BROWSER_ENV === "chrome-mv2" || BROWSER_ENV === "chrome-mv3") {
    const clocal = chrome.storage.local;
    const local = storage.local;
    local.clear = () => {
        return new Promise(r => {
            clocal.clear(() => {
                r();
            });
        });
    };
    local.remove = (keys) => {
        return new Promise(r => {
            clocal.remove(keys, () => {
                r();
            });
        });
    };
    local.get = (keys) => {
        return new Promise(r => {
            clocal.get(keys, res => {
                r(res);
            });
        });
    };
    local.set = (keys) => {
        return new Promise(r => {
            clocal.set(keys, () => {
                r();
            });
        });
    };
    local.getQuotaBytes = () => {
        return clocal.QUOTA_BYTES;
    };
}

if (BROWSER_ENV === "firefox") {
    const flocal = browser.storage.local;
    const local = storage.local;

    local.clear = () => {
        return flocal.clear();
    };
    local.remove = (keys) => {
        return flocal.remove(keys);
    };
    local.get = (keys) => {
        return flocal.get(keys);
    };
    local.set = (keys) => {
        return flocal.set(keys);
    };
    local.getQuotaBytes = () => {
        return Number.MAX_SAFE_INTEGER;
    };
}


export default storage;
