export type BrowserMessageSender = chrome.runtime.MessageSender | browser.runtime.MessageSender;
export type BrowserSenderResponse<R = any> = (response?: R) => void;
export type BrowserTab = chrome.tabs.Tab | browser.tabs.Tab;
export type BrowserTabRemoveInfo = chrome.tabs.TabRemoveInfo | browser.tabs._OnRemovedRemoveInfo
export type BrowserLastError = chrome.runtime.LastError | browser.runtime._LastError;
export type BrowserTabReloadProps = chrome.tabs.ReloadProperties | browser.tabs._ReloadReloadProperties;
export type BrowserTabQueryInfo = chrome.tabs.QueryInfo | browser.tabs._QueryQueryInfo;
export type BrowserTabHighlightEvent = chrome.tabs.TabHighlightInfo | browser.tabs._OnHighlightedHighlightInfo;
export type BrowserTabChangeInfo = chrome.tabs.TabChangeInfo | browser.tabs._OnUpdatedChangeInfo;
export type BrowserTabCreate = chrome.tabs.CreateProperties | browser.tabs._CreateCreateProperties;
export type BrowserRuntimeOnInstalled = chrome.runtime.InstalledDetails | browser.runtime._OnInstalledDetails;

export type BrowserBrowserActionBadgeBackgroundColorDetails = chrome.browserAction.BadgeBackgroundColorDetails | browser.browserAction._SetBadgeBackgroundColorDetails;
export type BrowserBrowserActionTextDetails = chrome.browserAction.BadgeTextDetails | browser.browserAction._SetBadgeTextDetails;

export type BrowserBrowsingDataRemovalOptions =  { origins: string[] }// chrome.browsingData.RemovalOptions | browser.browsingData.RemovalOptions;
export type BrowserBrowsingDataDataTypeSet = chrome.browsingData.DataTypeSet | browser.browsingData.DataTypeSet;

export type BrowserWebRequestCacheDetails = chrome.webRequest.WebResponseCacheDetails | browser.webRequest._OnCompletedDetails;
export type BrowserWebRequestHeaderDetails = chrome.webRequest.WebResponseHeadersDetails | browser.webRequest._OnHeadersReceivedDetails;
export type BrowserWebRequestFilter = chrome.webRequest.RequestFilter | browser.webRequest.RequestFilter;
export type BrowserWebRequestBlockingResponse = chrome.webRequest.BlockingResponse | browser.webRequest.BlockingResponse

export type BrowserWebRequestBlockingHeaders = "blocking" | "responseHeaders"

type InjectorDetailNoRunAt = Omit<chrome.tabs.InjectDetails | browser.extensionTypes.InjectDetails, "runAt" | "cssOrigin">;
export interface BrowserInjectDetails extends InjectorDetailNoRunAt {
    runAt?: browser.extensionTypes.InjectDetails["runAt"];
    cssOrigin?: browser.extensionTypes.InjectDetails["cssOrigin"];
}

export interface BrowserRuntime {
    onMessage: <M = any>(callback: (message: M, sender: BrowserMessageSender, senderResponse: BrowserSenderResponse) => boolean) => void;
    onInstalled: (callBack: (details: BrowserRuntimeOnInstalled) => void) => void;
    sendMessage: <M = any, R = any>(message: M) => Promise<R>;
    getLastError: () => BrowserLastError;
    getId: () => string;
    getURL: (path: string) => string;
}

export interface BrowserTabs {
    onRemoved: (callback: (tabId: number, removeInfo: BrowserTabRemoveInfo) => void) => void;
    onCreated: (callback: (info: BrowserTab) => void) => void
    onUpdated:  (callback: (tabId: number, changeInfo: BrowserTabChangeInfo, tab: BrowserTab) => void) => void
    onHighlighted: (callback: (info: BrowserTabHighlightEvent) => void) => void;
    reload: (tabId: number, props?: BrowserTabReloadProps) => Promise<void>;
    query: (queryInfo?: BrowserTabQueryInfo) => Promise<BrowserTab[]>;
    executeScript: (tabId: number, details: BrowserInjectDetails) => Promise<void>;
    sendMessage: <M = any, R = any>(tabId: number, message: M) => Promise<R>;
    create: (create: BrowserTabCreate) => Promise<BrowserTab>;
}

export interface BrowserStorage {
    local: {
        getQuotaBytes: () => number,
        clear: () => Promise<void>;
        get: (key: any) => Promise<{ [key: string]: any}>,
        remove: (key: any) => Promise<void>;
        set: (key: any) => Promise<void>;
    }
}

export interface BrowserBrowserAction {
    setBadgeBackgroundColor: (details: BrowserBrowserActionBadgeBackgroundColorDetails) => void;
    setBadgeText: (details: BrowserBrowserActionTextDetails) => void
}

export interface BrowserBrowsingData {
    remove: (options: BrowserBrowsingDataRemovalOptions, dataToRemove: BrowserBrowsingDataDataTypeSet) => Promise<void>;
}

export interface BrowserWebRequest {
    onCompleted: (callback: (details: BrowserWebRequestCacheDetails) => void, filter: BrowserWebRequestFilter, opt_extraInfoSpec?: "responseHeaders"[]) => void;
    onHeadersReceived: (callback: (details: BrowserWebRequestHeaderDetails) => void | BrowserWebRequestBlockingResponse, filter: BrowserWebRequestFilter, opt_extraInfoSpec?: string[]) => void;
}

export function createNotImplementedRejectPromise(fnName: string) {
    return () => Promise.reject(`Function ${fnName} not implement on browser environment "${BROWSER_ENV}"`);
};

export function createNotImplemented(fnName: string) {
    return () => {
        throw new Error(`Function ${fnName} not implement on browser environment "${BROWSER_ENV}"`);
    };
}
