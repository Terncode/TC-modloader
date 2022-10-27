import { BackgroundMessagePing, BackgroundMessageShowToast, ContentBackgroundMessage } from "./backgroundEventInterface";
import { Logger } from "../utils/logger";
import { delay, handleError } from "../utils/utils";
import { getActiveTab } from "../utils/chrome";
import { ToastType } from "../commonInterface";
import tabs from "../browserCompatibility/browserTabs";
import runtime from "../browserCompatibility/browserRuntime";

export async function sendMessageToContent<A = any>(tabId: number, data: ContentBackgroundMessage) {
    const response = await tabs.sendMessage(tabId, { type:"ping" } as BackgroundMessagePing);
    if (response) {
        return sendActualMessage<A>(tabId, data);
    } else {
        Logger.debug("Injecting script programmatically");
        await tabs.executeScript(tabId, { file: "./assets/scripts/content.js" });
        const error = runtime.getLastError();
        if (error) {
            Logger.error(error);
            throw new Error(error.message);
        } else {
            await delay(500);
            return sendActualMessage<A>(tabId, data);
        }
    }
}

async function sendActualMessage<A = any>(tabId: number, data: ContentBackgroundMessage) {
    const retrieveData = await tabs.sendMessage<any, A>(tabId, data);
    Logger.debug(`Sent to ${tabId}`, data, retrieveData);
    const error = handleError(retrieveData, false);
    if (error) {
        throw error;
    }
    return retrieveData;
}

export async function showToastFromBackground(title: string, description: string, type: ToastType = "info", duration = 5000) {
    const tab = await getActiveTab();
    const toast: BackgroundMessageShowToast = {
        type: "show-toast",
        data: {
            description,
            duration,
            title,
            type
        }
    };
    return sendMessageToContent(tab.id, toast);
};
