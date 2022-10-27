import { BrowserWebRequest, createNotImplemented } from "./browserInterfaces";

const webRequest: BrowserWebRequest = {
    onCompleted: createNotImplemented("webRequest.onCompleted"),
    onHeadersReceived: createNotImplemented("webRequest.onHeadersReceived"),
};

if (BROWSER_ENV === "chrome-mv2" || BROWSER_ENV === "chrome-mv3") {
    webRequest.onCompleted = (callback, filter, extra) => {
        chrome.webRequest.onCompleted.addListener(callback, filter as any, extra);
    };

    webRequest.onHeadersReceived = (callback, filter, extra) => {
        chrome.webRequest.onHeadersReceived.addListener(callback as any, filter as any, extra);
    };
}

if (BROWSER_ENV === "firefox") {
    webRequest.onCompleted = (callback, filter, extra) => {
        browser.webRequest.onCompleted.addListener(callback, filter, extra);
    };

    webRequest.onHeadersReceived = (callback, filter, extra) => {
        browser.webRequest.onHeadersReceived.addListener(callback as any, filter, extra as any);
    };
}

export default webRequest;
