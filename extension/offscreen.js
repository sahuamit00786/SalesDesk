let mediaRecorder = null;
let recordedChunks = [];
let activeStreams = [];
let audioContext = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OFFSCREEN_START') {
    startCapture(msg.streamId, msg.withVideo, msg.withMic)
      .then(() => sendResponse({ success: true }))
      .catch(e => {
        console.error('Capture start failed:', e);
        sendResponse({ error: e.message });
      });
    return true;
  }
  if (msg.type === 'OFFSCREEN_STOP') {
    stopCapture();
    sendResponse({ success: true });
    return true;
  }
});

async function startCapture(streamId, withVideo, withMic) {
  // Tab audio + optional video via chromeMediaSource
  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: withVideo
      ? { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
      : false
  });
  activeStreams.push(tabStream);

  // Mix audio: tab + mic via AudioContext
  audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();

  const tabAudio = audioContext.createMediaStreamSource(tabStream);
  tabAudio.connect(destination);

  if (withMic) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      activeStreams.push(micStream);
      const micAudio = audioContext.createMediaStreamSource(micStream);
      micAudio.connect(destination);
    } catch (e) {
      // Non-fatal: record tab audio only
      console.warn('Mic unavailable — recording tab audio only:', e.message);
    }
  }

  // Build final stream: mixed audio + optional tab video tracks
  const finalTracks = [...destination.stream.getAudioTracks()];
  if (withVideo) {
    finalTracks.push(...tabStream.getVideoTracks());
  }
  const combined = new MediaStream(finalTracks);

  // Pick best supported mimeType
  const mimeType = withVideo
    ? pickMime(['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'])
    : pickMime(['audio/webm;codecs=opus', 'audio/webm']);

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(combined, { mimeType });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const mimeType = withVideo ? 'video/webm' : 'audio/webm';
    const blob = new Blob(recordedChunks, { type: mimeType });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `meeting_${timestamp}.webm`;

    // chrome.downloads not available in offscreen — send blob as data URL to background
    const reader = new FileReader();
    reader.onload = () => {
      chrome.runtime.sendMessage({
        type: 'DOWNLOAD_RECORDING',
        dataUrl: reader.result,
        filename
      });
    };
    reader.readAsDataURL(blob);

    recordedChunks = [];
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  };

  mediaRecorder.start(1000); // chunk every second like RecordingService
}

function stopCapture() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder = null;
  }
  activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
  activeStreams = [];
}

function pickMime(candidates) {
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}
