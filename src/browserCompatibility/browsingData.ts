import { BrowserBrowsingData, createNotImplemented } from "./browserInterfaces";

const browsingData: BrowserBrowsingData = {
    remove: createNotImplemented("browsingData.remove")
};

if (BROWSER_ENV === "chrome-mv2" || BROWSER_ENV === "chrome-mv3") {
    browsingData.remove = (options, dataToRemove) => {
        return new Promise(r => {
            chrome.browsingData.remove({
                origins: options.origins,
            }, dataToRemove, r);
        });
    };
}

if (BROWSER_ENV === "firefox") {
    browsingData.remove = (options, dataToRemove) => {
        return browser.browsingData.remove({
            hostnames: options.origins
        }, dataToRemove);
    };
}

export default browsingData;
