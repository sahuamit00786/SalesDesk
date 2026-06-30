(async () => {
  const titleEl  = document.getElementById('title');
  const subEl    = document.getElementById('sub');
  const startBtn = document.getElementById('startBtn');
  const stopBtn  = document.getElementById('stopBtn');
  const errMsg   = document.getElementById('errMsg');

  function showError(msg) {
    subEl.textContent = '';
    errMsg.textContent = msg;
    errMsg.style.display = 'block';
    startBtn.disabled = true;
  }

  const { streamId, withVideo, withMic } =
    await chrome.storage.session.get(['streamId', 'withVideo', 'withMic']);

  if (!streamId) { showError('No stream ID — close and try again.'); return; }

  // --- Acquire streams BEFORE user clicks (before streamId expires) ---
  const activeStreams = [];

  let tabStream;
  try {
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId }
      },
      video: withVideo
        ? { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
        : false
    });
    activeStreams.push(tabStream);
  } catch (e) {
    showError(`Tab capture failed: ${e.message}`);
    return;
  }

  let micStream = null;
  if (withMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      activeStreams.push(micStream);
      subEl.textContent = 'Tab audio + mic ready';
    } catch (e) {
      subEl.textContent = 'Tab audio only (mic denied)';
    }
  } else {
    subEl.textContent = withVideo ? 'Tab audio + video ready' : 'Tab audio ready';
  }

  startBtn.disabled = false;

  // --- AudioContext created INSIDE click handler = guaranteed user gesture ---
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;

    // User gesture here lets AudioContext run immediately (no suspended state)
    const audioCtx    = new AudioContext();
    await audioCtx.resume(); // explicit resume to be safe
    const destination = audioCtx.createMediaStreamDestination();

    audioCtx.createMediaStreamSource(tabStream).connect(destination);
    if (micStream) {
      audioCtx.createMediaStreamSource(micStream).connect(destination);
    }

    const finalTracks = [...destination.stream.getAudioTracks()];
    if (withVideo) finalTracks.push(...tabStream.getVideoTracks());
    const combined = new MediaStream(finalTracks);

    const mimeType = withVideo
      ? pickMime(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'])
      : pickMime(['audio/webm;codecs=opus', 'audio/webm']);

    const chunks   = [];
    const recorder = new MediaRecorder(combined, { mimeType });

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      subEl.textContent = 'Saving…';
      const blob = new Blob(chunks, { type: withVideo ? 'video/webm' : 'audio/webm' });
      const ts   = new Date().toISOString().replace(/[:.]/g, '-');

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await chrome.runtime.sendMessage({
            type: 'DOWNLOAD_RECORDING',
            dataUrl: reader.result,
            filename: `meeting_${ts}.webm`
          });
        } catch (_) {}

        try { await chrome.runtime.sendMessage({ type: 'RECORDING_ENDED' }); } catch (_) {}

        activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
        audioCtx.close();
        window.close();
      };
      reader.readAsDataURL(blob);
    };

    recorder.start(1000);

    titleEl.innerHTML = '<span class="dot"></span>Recording';
    subEl.textContent = micStream ? 'Tab + mic' : 'Tab audio only';
    stopBtn.style.display = 'block';

    function doStop() {
      if (recorder.state !== 'inactive') {
        stopBtn.disabled = true;
        recorder.stop();
      }
    }

    stopBtn.addEventListener('click', doStop);

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'RECORDER_STOP') doStop();
    });
  });

  function pickMime(candidates) {
    for (const m of candidates) {
      if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return '';
  }
})();
