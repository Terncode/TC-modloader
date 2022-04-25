// import { getOrigin } from "../utils/utils";
// import { Mod } from "./modsUtils";

// const createThrowable = (method: string) => {
//     return (..._any: any[]) => {
//         throw new Error(`Method ${method} not allowed`);
//     };
// };

// export function createModChromeObject(mod: Mod) {
//     chrome.extension;
//     const fakeChrome: Partial<typeof chrome> = {
//         browserAction: disableMethods(chrome.browserAction, "chrome.browserAction"),
//         browsingData: disableMethods(chrome.browsingData, "chrome.browsingData"),
//         extension: disableMethods(chrome.extension, "chrome.extension"),
//         i18n: disableMethods(chrome.i18n, "chrome.i18n"),
//         management: disableMethods(chrome.management, "chrome.management"),
//         permissions: {
//             ...chrome.permissions,
//             onAdded: disableMethods(chrome.permissions.onAdded, "chrome.permissions.onAdded"),
//             onRemoved: disableMethods(chrome.permissions.onRemoved, "chrome.permissions.onRemoved")
//         },
//         runtime:{
//             ...disableMethods(chrome.runtime, "chrome.runtime"),
//             id: mod.mod.name,
//             getPlatformInfo: chrome.runtime.getPlatformInfo
//         },
//         storage: {
//             ...disableMethods(chrome.storage, "chrome.storage"),
//             local: disableMethods(chrome.storage.local, "chrome.storage.local"),
//             managed: disableMethods(chrome.storage.managed, "chrome.storage.managed")
//         },
//         tabs: {
//             ...disableMethods(chrome.tabs, "chrome.tabs"),
//             query: (queryInfo: chrome.tabs.QueryInfo, callback?: (result: chrome.tabs.Tab[]) => void) => {
//                 const pr = new Promise<chrome.tabs.Tab[]>(resolve => {
//                     chrome.tabs.query(queryInfo, tabs => {
//                         resolve(tabs.filter( t => t.url && mod.enabledOnOrigins.includes(getOrigin(t.url))));
//                     });
//                 });
//                 if(callback) {
//                     pr.then(callback);
//                 } else {
//                     return pr;
//                 }
//             },
//         },
//         webRequest: disableMethods(chrome.webRequest, "chrome.webRequest"),
//         windows: disableMethods(chrome.windows, "chrome.windows"),
//     };
//     return fakeChrome;
// }
// // function executeOnTab(mod: Mod, method: (tabId: number, ...args: any[]) => void) {
// //     return (tabId: number, ...args:any[]) => {
// //         const lastIndex = args.length === 0 ? 0 : args.length -1;
// //         let cb: any = args[lastIndex];
// //         const hasCallback = typeof args[lastIndex] === "function";

// //         setTimeout(() => {
// //             chrome.tabs.query({}, tabs => {
// //                 const ids = tabs.filter( t => t.url && mod.enabledOnOrigins.includes(getOrigin(t.url))).map(t => t.id);
// //                 if(ids.includes(tabId)) {
// //                     const copy =  [...args];
// //                     if(hasCallback) {
// //                         copy.pop();
// //                     }
// //                     method(tabId, ...args, cb);
// //                 }
// //             });
// //         });
// //         return hasCallback ? undefined : new Promise(resolve => {
// //             cb = resolve;
// //         });
// //     };
// // }

// function disableMethods<T = any>(object: T, prefix: string): T {
//     const keys = Object.keys(object);
//     const obj = {};
//     for (const key of keys) {
//         obj[key] = createThrowable(`${prefix}.${key}`);
//     }
//     return obj as any;
// }
