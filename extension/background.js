function getTabStreamId(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(streamId);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'START_RECORDING') {
        const streamId = await getTabStreamId(msg.tabId);

        // Save config for recorder.html to read on load
        await chrome.storage.session.set({
          recording: true,
          streamId,
          withVideo: msg.withVideo ?? false,
          withMic: msg.withMic ?? true
        });

        // Open persistent recorder window — real browsing context, can use mic
        await chrome.windows.create({
          url: chrome.runtime.getURL('recorder.html'),
          type: 'popup',
          width: 280,
          height: 170,
          focused: true
        });

        sendResponse({ success: true });

      } else if (msg.type === 'STOP_RECORDING') {
        // Relay to recorder window — swallow rejection if window not open
        chrome.runtime.sendMessage({ type: 'RECORDER_STOP' }).catch(() => {});
        sendResponse({ success: true });

      } else if (msg.type === 'RECORDING_ENDED') {
        await chrome.storage.session.set({ recording: false });
        sendResponse({ success: true });

      } else if (msg.type === 'GET_STATUS') {
        const { recording = false } = await chrome.storage.session.get('recording');
        sendResponse({ recording });

      } else if (msg.type === 'DOWNLOAD_RECORDING') {
        await chrome.downloads.download({
          url: msg.dataUrl,
          filename: msg.filename,
          saveAs: false
        });
        sendResponse({ success: true });
      }
    } catch (e) {
      sendResponse({ error: e.message });
    }
  })();
  return true;
});
