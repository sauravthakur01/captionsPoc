(function () {
  const supportNotice = document.getElementById('supportNotice');
  const statusEl = document.getElementById('status');
  const errorEl = document.getElementById('error');
  const interimEl = document.getElementById('interimLine');
  const finalEl = document.getElementById('finalLine');
  const transcriptList = document.getElementById('transcriptList');
  const langSelect = document.getElementById('language');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const autoRestartCb = document.getElementById('autoRestart');

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    supportNotice.textContent = 'Web Speech API is not available. Please use Chrome or Edge.';
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  let recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  let mediaStream = null;
  let listening = false;
  const transcripts = [];

  function setLang(code) {
    recognition.lang = code;
  }
  setLang(langSelect.value);

  recognition.onstart = () => {
    statusEl.textContent = 'Listening…';
  };

  recognition.onend = () => {
    statusEl.textContent = listening ? 'Restarting…' : 'Stopped';
    if (listening && autoRestartCb.checked) {
      try { recognition.start(); } catch (_) {}
    }
  };

  recognition.onerror = (e) => {
    errorEl.textContent = `Error: ${e.error}`;
    // Quick retry on common transient errors
    if (listening && autoRestartCb.checked && ['network', 'no-speech', 'audio-capture'].includes(e.error)) {
      setTimeout(() => { try { recognition.start(); } catch (_) {} }, 500);
    }
  };

  recognition.onresult = (event) => {
    const results = event.results;
    let latestFinal = '';
    let interim = '';
    for (let i = event.resultIndex; i < results.length; i++) {
      const r = results[i];
      const txt = r[0].transcript.trim();
      if (r.isFinal) {
        latestFinal += (latestFinal ? ' ' : '') + txt;
      } else {
        interim += txt + ' ';
      }
    }
    // Update interim display
    interimEl.textContent = interim.trim();
    // Append final phrases to transcript
    if (latestFinal) {
      finalEl.textContent = latestFinal;
      transcripts.push({ text: latestFinal, lang: recognition.lang, time: new Date().toISOString() });
      const li = document.createElement('li');
      li.textContent = latestFinal;
      transcriptList.appendChild(li);
      // Clear interim after a final result
      interimEl.textContent = '';
    }
  };

  langSelect.addEventListener('change', () => {
    setLang(langSelect.value);
    // Soft-restart so the new language applies immediately without user action
    if (listening) {
      try { recognition.stop(); } catch (_) {}
    }
  });

  startBtn.addEventListener('click', async () => {
    await startCaptions();
  });

  stopBtn.addEventListener('click', async () => {
    await stopCaptions();
  });

  async function startCaptions() {
    errorEl.textContent = '';
    finalEl.textContent = '';
    interimEl.textContent = '';
    statusEl.textContent = 'Initializing microphone…';

    try {
      // Request mic access explicitly to surface permissions & improve UX.
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (err) {
      errorEl.textContent = 'Microphone permission denied or unavailable.';
      statusEl.textContent = 'Idle';
      return;
    }

    listening = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    downloadBtn.disabled = false;
    statusEl.textContent = 'Listening…';
    try {
      recognition.start();
    } catch (err) {
      errorEl.textContent = 'Failed to start recognition.';
    }
  }

  async function stopCaptions() {
    listening = false;
    try { recognition.stop(); } catch (_) {}
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusEl.textContent = 'Stopped';
  }



  downloadBtn.addEventListener('click', () => {
    if (!transcripts.length) return;
    const contents = transcripts.map(t => `[${t.lang}] ${t.time} — ${t.text}`).join('\n');
    const blob = new Blob([contents], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'captions-transcript.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && listening) {
      try { recognition.stop(); } catch (_) {}
    }
  });
})();

// python3 -m http.server 5500