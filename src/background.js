chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tonepilot-rewrite',
    title: 'TonePilot: Rewrite...',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'tonepilot-rewrite') {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
      
      chrome.tabs.sendMessage(tab.id, {
        action: 'getSelection'
      });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openSidePanel') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
  }

  if (message.action === 'selectionData') {
    console.log('Background received selection data:', message.data);
    // Forward the selection data to any listening panels
    chrome.runtime.sendMessage({
      action: 'newSelection',
      data: message.data
    }).catch(() => {
      // Panel might not be open, that's okay
      console.log('No panel listening for selection data');
    });
  }

  if (message.action === 'screenAreaSelected') {
    // Forward screen area selection data to panels
    chrome.runtime.sendMessage({
      action: 'screenAreaSelected',
      data: message.data
    }).catch(() => {
      // Panel might not be open, that's okay
    });
  }

  if (message.action === 'clearSelection') {
    console.log('Background received clear selection request');
    // Forward clear selection message to panels
    chrome.runtime.sendMessage({
      action: 'clearSelection'
    }).catch(() => {
      // Panel might not be open, that's okay
    });
  }

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error('Failed to open side panel:', error);
  }
});