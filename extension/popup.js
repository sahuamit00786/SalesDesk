const btn = document.getElementById('toggleBtn');
const statusEl = document.getElementById('status');
const withVideoEl = document.getElementById('withVideo');
const withMicEl = document.getElementById('withMic');

function updateUI(recording) {
  if (recording) {
    btn.textContent = 'Stop Recording';
    btn.className = 'btn stop';
    statusEl.textContent = 'Recording...';
    statusEl.className = 'status recording';
    withVideoEl.disabled = true;
    withMicEl.disabled = true;
  } else {
    btn.textContent = 'Start Recording';
    btn.className = 'btn start';
    statusEl.textContent = 'Ready';
    statusEl.className = 'status ready';
    withVideoEl.disabled = false;
    withMicEl.disabled = false;
  }
}

async function init() {
  const { recording } = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  updateUI(recording);
}

btn.addEventListener('click', async () => {
  const { recording } = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

  if (recording) {
    await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    updateUI(false);
  } else {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    statusEl.textContent = 'Starting...';
    statusEl.className = 'status ready';

    // Offscreen docs can't show permission dialogs — request mic here in popup
    // so user sees the prompt. Same extension origin = offscreen inherits the grant.
    let micGranted = false;
    if (withMicEl.checked) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach(t => t.stop());
        micGranted = true;
      } catch (e) {
        statusEl.textContent = 'Mic denied — recording tab audio only';
      }
    }

    const result = await chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      tabId: tab.id,
      withVideo: withVideoEl.checked,
      withMic: withMicEl.checked && micGranted
    });

    if (result?.error) {
      statusEl.textContent = `Error: ${result.error}`;
      statusEl.className = 'status error';
    } else {
      updateUI(true);
    }
  }
});

init();
