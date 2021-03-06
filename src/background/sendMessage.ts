import { BackgroundMessagePing, BackgroundMessageShowToast, ContentBackgroundMessage } from "./backgroundEventInterface";
import { Logger } from "../utils/logger";
import { handleError } from "../utils/utils";
import { getActiveTab } from "../utils/chrome";
import { ToastType } from "../commonInterface";

export function sendMessageToContent<A = any>(tabId: number, data: ContentBackgroundMessage) {
    return new Promise<A>((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type:"ping" } as BackgroundMessagePing, (response) => {
            if (response) {
                resolve(sendActualMessage<A>(tabId, data));
            } else {
                Logger.debug("Injecting script programmatically");
                chrome.tabs.executeScript(tabId, {file: "./assets/scripts/content.js"}, () => {
                    if (chrome.runtime.lastError) {
                        Logger.error(chrome.runtime.lastError);
                        return reject(new Error(chrome.runtime.lastError.message));
                    } else{
                        setTimeout(() => {
                            resolve(sendActualMessage<A>(tabId, data));
                        }, 500);
                    }
                });
            }
            return true;
        });
    });
}


function sendActualMessage<A = any>(tabId: number, data: ContentBackgroundMessage) {
    return new Promise<A>((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, data, retrieveData => {
            Logger.debug(`Sent to ${tabId}`, data, retrieveData);
            const error = handleError(retrieveData, false);
            if(error) {
                reject(error);
            } else {
                resolve(retrieveData);
            }
            return true;
        });
    });
}

export async function showToastFromBackground(title: string, description: string, type: ToastType = "info", duration = 5000) {
    const tab = await getActiveTab();
    const toast: BackgroundMessageShowToast = {
        type:"show-toast",
        data:{ description, duration, title, type}
    };
    return sendMessageToContent(tab.id, toast);
};
