import { dataClone } from "../utils/utils";
import { BrowserRuntime, createNotImplemented } from "./browserInterfaces";

const runtime: BrowserRuntime = {
    sendMessage: createNotImplemented("runtime.sendMessage"),
    onMessage: createNotImplemented("runtime.onMessage"),
    getLastError: createNotImplemented("runtime.getLastError"),
    getId: createNotImplemented("runtime.getId"),
    onInstalled: createNotImplemented("runtime.onInstalled"),
    getURL: createNotImplemented("runtime.getUrl"),
};

if (BROWSER_ENV === "chrome-mv2" || BROWSER_ENV === "chrome-mv3") {
    runtime.sendMessage = (message) => {
        return new Promise((resolve,reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                const error = handleError(response);
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    };

    runtime.onMessage = (callback) => {
        return chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            return callback(msg, sender, sendResponse);
        });
    };

    runtime.getLastError = () => {
        return chrome.runtime.lastError;
    };

    runtime.getId = () => {
        return chrome.runtime.id;
    };

    runtime.onInstalled = (listener) => {
        chrome.runtime.onInstalled.addListener(listener);
    };

    runtime.getURL = (path) => {
        return chrome.runtime.getURL(path);
    };
}

if (BROWSER_ENV === "firefox") {
    runtime.sendMessage = async (message) => {
        const response = await browser.runtime.sendMessage(message);
        const error = handleError(response);
        if (error) {
            throw error;
        }
        return response;
    };

    runtime.onMessage = (callback) => {
        return browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            return callback(msg, sender, (res) => sendResponse(dataClone(res)));
        });
    };

    runtime.getLastError = () => {
        return browser.runtime.lastError;
    };

    runtime.getId = () => {
        return browser.runtime.id;
    };

    runtime.onInstalled = (listener) => {
        browser.runtime.onInstalled.addListener(listener);
    };

    runtime.getURL = (path) => {
        return browser.runtime.getURL(path);
    };
}

export function handleError(obj: any): Error | undefined {
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        if(obj.error) {
            const error = new Error(obj.error.message);
            error.stack = obj.error.stack || error.stack;
            return error;
        }
    }
}

export default runtime;
