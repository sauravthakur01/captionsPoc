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

  let recognition = null;
  let mediaStream = null;
  let listening = false;
  let restartAttempts = 0;
  let lastActivityTime = Date.now();
  let activityMonitor = null;
  const transcripts = [];

  // Create or recreate recognition instance with fresh configuration
  function createRecognition() {
    if (recognition) {
      try {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.stop();
      } catch (_) {}
    }

    console.log('[Captions] Creating new recognition instance');
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langSelect.value;

    recognition.onstart = () => {
      console.log('[Captions] Recognition started');
      statusEl.textContent = 'Listening…';
      errorEl.textContent = '';
      restartAttempts = 0;
      lastActivityTime = Date.now();
    };

    recognition.onend = () => {
      console.log('[Captions] Recognition ended, listening:', listening, 'autoRestart:', autoRestartCb.checked);
      statusEl.textContent = listening ? 'Restarting…' : 'Stopped';
      
      if (listening && autoRestartCb.checked) {
        restartAttempts++;
        console.log('[Captions] Auto-restart attempt:', restartAttempts);
        
        // Add delay to prevent rapid restart loops
        const delay = Math.min(500 * restartAttempts, 3000);
        setTimeout(() => {
          if (listening) {
            try { 
              recognition.start(); 
            } catch (e) {
              console.error('[Captions] Failed to restart:', e);
              // If restart fails, recreate the instance
              if (restartAttempts > 3) {
                console.log('[Captions] Too many restart failures, recreating instance');
                createRecognition();
                if (listening) {
                  try { recognition.start(); } catch (_) {}
                }
              }
            }
          }
        }, delay);
      }
    };

    recognition.onerror = (e) => {
      console.error('[Captions] Recognition error:', e.error, e);
      errorEl.textContent = `Error: ${e.error}`;
      
      // Handle all transient errors that should trigger auto-restart
      const restartableErrors = [
        'network',           // Network connectivity issues
        'no-speech',         // No speech detected timeout
        'audio-capture',     // Temporary audio problems
        'aborted',           // Service aborted (common after long sessions)
        'service-not-allowed' // Service temporarily unavailable
      ];
      
      if (listening && autoRestartCb.checked && restartableErrors.includes(e.error)) {
        console.log('[Captions] Attempting recovery from error:', e.error);
        restartAttempts++;
        
        const delay = Math.min(1000 * restartAttempts, 5000);
        setTimeout(() => {
          if (listening) {
            // Recreate instance if too many errors
            if (restartAttempts > 5) {
              console.log('[Captions] Too many errors, recreating instance');
              createRecognition();
            }
            try { 
              recognition.start(); 
            } catch (err) {
              console.error('[Captions] Failed to start after error:', err);
            }
          }
        }, delay);
      } else if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        // Don't auto-restart on permission errors
        console.error('[Captions] Permission denied, stopping');
        stopCaptions();
      }
    };

    recognition.onresult = (event) => {
      lastActivityTime = Date.now();
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
        console.log('[Captions] Final result:', latestFinal);
        finalEl.textContent = latestFinal;
        transcripts.push({ text: latestFinal, lang: recognition.lang, time: new Date().toISOString() });
        const li = document.createElement('li');
        li.textContent = latestFinal;
        transcriptList.appendChild(li);
        // Clear interim after a final result
        interimEl.textContent = '';
      }
    };

    return recognition;
  }

  // Initialize recognition
  createRecognition();

  // Monitor for silent failures - restart if no activity for too long
  function startActivityMonitor() {
    if (activityMonitor) {
      clearInterval(activityMonitor);
    }
    
    activityMonitor = setInterval(() => {
      if (!listening) {
        return;
      }
      
      const timeSinceActivity = Date.now() - lastActivityTime;
      // If no activity (no results) for 5 minutes, proactively restart
      if (timeSinceActivity > 5 * 60 * 1000) {
        console.warn('[Captions] No activity for 5 minutes, forcing restart');
        lastActivityTime = Date.now();
        try {
          recognition.stop();
        } catch (_) {}
        
        setTimeout(() => {
          if (listening) {
            createRecognition();
            try { recognition.start(); } catch (_) {}
          }
        }, 1000);
      }
    }, 30000); // Check every 30 seconds
  }

  function stopActivityMonitor() {
    if (activityMonitor) {
      clearInterval(activityMonitor);
      activityMonitor = null;
    }
  }

  function setLang(code) {
    recognition.lang = code;
  }

  langSelect.addEventListener('change', () => {
    console.log('[Captions] Language changed to:', langSelect.value);
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
    console.log('[Captions] Starting captions');
    errorEl.textContent = '';
    finalEl.textContent = '';
    interimEl.textContent = '';
    statusEl.textContent = 'Initializing microphone…';

    try {
      // Request mic access explicitly to surface permissions & improve UX.
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      console.log('[Captions] Microphone access granted');
    } catch (err) {
      console.error('[Captions] Microphone access denied:', err);
      errorEl.textContent = 'Microphone permission denied or unavailable.';
      statusEl.textContent = 'Idle';
      return;
    }

    listening = true;
    restartAttempts = 0;
    lastActivityTime = Date.now();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    downloadBtn.disabled = false;
    statusEl.textContent = 'Listening…';
    
    // Start activity monitor for long sessions
    startActivityMonitor();
    
    try {
      recognition.start();
    } catch (err) {
      console.error('[Captions] Failed to start recognition:', err);
      errorEl.textContent = 'Failed to start recognition.';
    }
  }

  async function stopCaptions() {
    console.log('[Captions] Stopping captions');
    listening = false;
    restartAttempts = 0;
    
    // Stop activity monitor
    stopActivityMonitor();
    
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
    console.log('[Captions] Downloading transcript');
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

  // Handle tab visibility - stop when hidden, restart when visible
  let wasListeningBeforeHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && listening) {
      console.log('[Captions] Tab hidden, pausing recognition');
      wasListeningBeforeHidden = true;
      try { recognition.stop(); } catch (_) {}
    } else if (!document.hidden && wasListeningBeforeHidden && listening) {
      console.log('[Captions] Tab visible again, resuming recognition');
      wasListeningBeforeHidden = false;
      lastActivityTime = Date.now();
      setTimeout(() => {
        if (listening) {
          try { 
            recognition.start(); 
          } catch (e) {
            console.error('[Captions] Failed to resume after tab visible:', e);
            // Recreate if resume fails
            createRecognition();
            try { recognition.start(); } catch (_) {}
          }
        }
      }, 500);
    }
  });

  // Periodic instance refresh for very long sessions (every 30 minutes)
  setInterval(() => {
    if (listening) {
      console.log('[Captions] Periodic refresh - recreating recognition instance');
      try { recognition.stop(); } catch (_) {}
      
      setTimeout(() => {
        if (listening) {
          createRecognition();
          try { 
            recognition.start(); 
          } catch (e) {
            console.error('[Captions] Failed to start after periodic refresh:', e);
          }
        }
      }, 1000);
    }
  }, 30 * 60 * 1000); // Every 30 minutes

  console.log('[Captions] App initialized successfully');
})();

// python3 -m http.server 5500