import { BrowserTabs, createNotImplemented, createNotImplementedRejectPromise } from "./browserInterfaces";

const tabs: BrowserTabs = {
    onRemoved: createNotImplemented("tabs.onRemoved"),
    reload: createNotImplementedRejectPromise("tabs.reload"),
    executeScript: createNotImplementedRejectPromise("tabs.executeScript"),
    query: createNotImplementedRejectPromise("tabs.query"),
    sendMessage: createNotImplemented("tabs.sendMessage"),
    onHighlighted: createNotImplemented("tabs.onHighlighted"),
    onCreated: createNotImplemented("tabs.onCreated"),
    onUpdated: createNotImplemented("tabs.onUpdated"),
    create: createNotImplemented("tabs.create"),
};

if (BROWSER_ENV === "chrome-mv2" || BROWSER_ENV === "chrome-mv3") {
    tabs.onRemoved = (callback) => {
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            callback(tabId, removeInfo);
        });
    };

    tabs.reload = (tabId, reloadProperties) => {
        return chrome.tabs.reload(tabId, reloadProperties);
    };

    tabs.executeScript = (tabId, details) => {
        return new Promise(r => {
            chrome.tabs.executeScript(tabId, details, () => {
                r();
            });
        });
    };

    tabs.query = (queryInfo = {}) => {
        return new Promise(r => {
            chrome.tabs.query(queryInfo, tabs => {
                r(tabs);
            });
        });
    };

    tabs.sendMessage = (tabId, message) => {
        return new Promise(r => {
            chrome.tabs.sendMessage(tabId, message, message => {
                r(message);
            });
        });
    };

    tabs.onHighlighted = (callback) => {
        chrome.tabs.onHighlighted.addListener(callback);
    };

    tabs.onCreated = (callback) => {
        chrome.tabs.onCreated.addListener(callback);
    };

    tabs.onUpdated = (callback) => {
        chrome.tabs.onUpdated.addListener(callback);
    };

    tabs.create = (details) => {
        return new Promise(r => {
            chrome.tabs.create(details, tab => {
                r(tab);
            });
        });
    };
}

if (BROWSER_ENV === "firefox") {
    tabs.onRemoved = (callback) => {
        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            callback(tabId, removeInfo);
        });
    };

    tabs.reload = (tabId, reloadProperties) => {
        return browser.tabs.reload(tabId, reloadProperties);
    };

    tabs.executeScript = async (tabId, details) => {
        await browser.tabs.executeScript(tabId, details);
    };

    tabs.query = (queryInfo = {}) => {
        return browser.tabs.query(queryInfo);
    };

    tabs.sendMessage = (tabId, message) => {
        return browser.tabs.sendMessage(tabId, message);
    };

    tabs.onHighlighted = (callback) => {
        browser.tabs.onHighlighted.addListener(callback);
    };

    tabs.onCreated = (callback) => {
        browser.tabs.onCreated.addListener(callback);
    };

    tabs.onUpdated = (callback) => {
        browser.tabs.onUpdated.addListener(callback);
    };

    tabs.create = (details) => {
        return browser.tabs.create(details);
    };
}

export default tabs;
