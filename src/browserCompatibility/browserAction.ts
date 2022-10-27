import { BrowserBrowserAction, createNotImplemented } from "./browserInterfaces";

const browserAction: BrowserBrowserAction = {
    setBadgeBackgroundColor: createNotImplemented("browserAction.setBadgeBackgroundColor"),
    setBadgeText: createNotImplemented("browserAction.setBadgeText"),
};

if (BROWSER_ENV === "chrome-mv2" || BROWSER_ENV === "chrome-mv3") {
    browserAction.setBadgeBackgroundColor = (details) => {
        chrome.browserAction.setBadgeBackgroundColor(details);
    };

    browserAction.setBadgeText = (details) => {
        chrome.browserAction.setBadgeText(details);
    };
}

if (BROWSER_ENV === "firefox") {
    browserAction.setBadgeBackgroundColor = (details) => {
        browser.browserAction.setBadgeBackgroundColor(details);
    };

    browserAction.setBadgeText = (details) => {
        browser.browserAction.setBadgeText({
            text: details.text,
            tabId:details.tabId,
        });
    };
}

export default browserAction;
