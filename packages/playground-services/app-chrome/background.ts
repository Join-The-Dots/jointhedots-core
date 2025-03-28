
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Perform cookie operations in the background page, because not all foreground pages have access to the cookie API.
    // Firefox does not support incognito split mode, so we use sender.tab.cookieStoreId to select the right cookie store.
    // Chrome does not support sender.tab.cookieStoreId, which means it is undefined, and we end up using the default cookie store according to incognito split mode.
    if (request.message === 'open_side_panel') {
        // This will open a tab-specific side panel only on the current tab.

        chrome.sidePanel.open({ tabId: request.tabId }).then((res) => {
            chrome.sidePanel.setOptions({
                tabId: request.tabId,
                path: 'panel.html?embedded=true',
                enabled: true
            })
        })

        sendResponse(null);
        return true; // Tell Chrome that we want to call sendResponse asynchronously.
    }
})

chrome.commands.onCommand.addListener(function (command, tab) {
    console.log("onCommand", command, tab)
    if (command === 'open-panel') {
        chrome.sidePanel.open({ windowId: tab.windowId }).then((res) => {
            chrome.sidePanel.setOptions({
                tabId: tab.id,
                path: 'panel.html',
                enabled: true
            })
        })
    }
})

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'openSidePanel',
        title: 'Open side panel',
        contexts: ['all']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'openSidePanel') {
        // This will open the panel in all the pages on the current window.
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
});
