let currentMode = 'transcribe';
let selectedFile = null;
let audioBlob = null;

function t() { return (window.__i18n && window.__i18n.t) || {}; }
function base() { return (window.__i18n && window.__i18n.base) || ''; }

function switchMode(mode) {
  currentMode = mode;
  const consoleEl = document.getElementById('console');
  if (consoleEl) consoleEl.dataset.mode = mode;
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.querySelectorAll('.mode-panel').forEach(p => p.style.display = 'none');
  document.getElementById('mode-' + mode).style.display = 'block';

  // Right panel follows the active mode
  const isEmpty = !document.getElementById(mode === 'transcribe' ? 'transcriptText' : 'audioPlayer').dataset.filled;
  document.getElementById('transcribeResult').style.display = (mode === 'transcribe' && !isEmpty) ? 'block' : 'none';
  document.getElementById('synthesizeResult').style.display = (mode === 'synthesize' && !isEmpty) ? 'block' : 'none';
  document.getElementById('transcribeError').style.display = 'none';
  document.getElementById('synthesizeError').style.display = 'none';
  document.getElementById('outEmpty').style.display = isEmpty ? 'flex' : 'none';
}

// Upload zone
const uploadZone = document.getElementById('uploadZone');
const audioInput = document.getElementById('audioFile');

uploadZone.addEventListener('click', () => audioInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});
audioInput.addEventListener('change', () => {
  const f = audioInput.files[0];
  if (f) handleFile(f);
});
document.getElementById('fileInfo').addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-btn')) return;
  audioInput.click();
});

function handleFile(file) {
  const tr = t();
  if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|flac)$/i)) {
    showError('transcribeError', tr.errAudioType || 'Please upload an audio file.');
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    showError('transcribeError', tr.errAudioSize || 'Audio must be under 25MB.');
    return;
  }
  selectedFile = file;
  // Replace the upload zone with the file chip — keeps panel height stable
  uploadZone.style.display = 'none';
  document.getElementById('fileName').textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
  document.getElementById('fileInfo').style.display = 'flex';
  document.getElementById('transcribeResult').style.display = 'none';
  document.getElementById('transcriptText').removeAttribute('data-filled');
  document.getElementById('outEmpty').style.display = 'flex';
  document.getElementById('transcribeBtn').disabled = false;
}

function clearFile() {
  selectedFile = null;
  audioInput.value = '';
  uploadZone.style.display = '';
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('transcribeResult').style.display = 'none';
  document.getElementById('transcriptText').removeAttribute('data-filled');
  document.getElementById('transcribeError').style.display = 'none';
  document.getElementById('outEmpty').style.display = 'flex';
  document.getElementById('transcribeBtn').disabled = true;
}

async function transcribe() {
  const tr = t();
  const errorEl = document.getElementById('transcribeError');
  const loadingEl = document.getElementById('transcribeLoading');
  const resultEl = document.getElementById('transcribeResult');
  const emptyEl = document.getElementById('outEmpty');
  const btn = document.getElementById('transcribeBtn');

  errorEl.style.display = 'none';
  resultEl.style.display = 'none';

  if (!selectedFile) {
    showError('transcribeError', tr.errNoFile || 'Please select an audio file.');
    return;
  }

  btn.disabled = true;
  loadingEl.style.display = 'flex';

  try {
    const formData = new FormData();
    formData.append('audio', selectedFile);

    const res = await fetch(base() + '/api/transcribe', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.text) {
      showError('transcribeError', data.error || (tr.errGeneric || 'Transcription failed.'));
      return;
    }

    const textEl = document.getElementById('transcriptText');
    textEl.textContent = data.text;
    textEl.setAttribute('data-filled', '1');
    const words = data.text.trim().split(/\s+/).filter(Boolean).length;
    document.getElementById('resultMeta').textContent = (tr.resultWords || '{n} words').replace('{n}', words);
    resultEl.style.display = 'block';
    emptyEl.style.display = 'none';
  } catch (err) {
    console.error(err);
    showError('transcribeError', tr.errNetwork || 'Network error. Please try again.');
  } finally {
    btn.disabled = false;
    loadingEl.style.display = 'none';
  }
}

async function synthesize() {
  const tr = t();
  const errorEl = document.getElementById('synthesizeError');
  const loadingEl = document.getElementById('synthesizeLoading');
  const resultEl = document.getElementById('synthesizeResult');
  const emptyEl = document.getElementById('outEmpty');
  const btn = document.getElementById('synthesizeBtn');

  const text = document.getElementById('ttsText').value.trim();
  const lang = document.getElementById('ttsLang').value;

  errorEl.style.display = 'none';
  resultEl.style.display = 'none';

  if (!text) {
    showError('synthesizeError', tr.errNoText || 'Please enter some text.');
    return;
  }

  btn.disabled = true;
  loadingEl.style.display = 'flex';

  try {
    const res = await fetch(base() + '/api/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang })
    });

    const data = await res.json();
    if (!res.ok || !data.audio) {
      showError('synthesizeError', data.error || (tr.errGeneric || 'Speech synthesis failed.'));
      return;
    }

    // MeloTTS returns a WAV file (RIFF header)
    const binaryString = atob(data.audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    audioBlob = new Blob([bytes], { type: 'audio/wav' });

    const player = document.getElementById('audioPlayer');
    player.src = URL.createObjectURL(audioBlob);
    player.setAttribute('data-filled', '1');
    resultEl.style.display = 'block';
    emptyEl.style.display = 'none';
  } catch (err) {
    console.error(err);
    showError('synthesizeError', tr.errNetwork || 'Network error. Please try again.');
  } finally {
    btn.disabled = false;
    loadingEl.style.display = 'none';
  }
}

function downloadAudio() {
  if (!audioBlob) return;
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'speech.wav';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyTranscript() {
  const text = document.getElementById('transcriptText').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const el = document.getElementById('copyCopied');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1800);
  }).catch(() => { prompt('Copy:', text); });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

window.switchMode = switchMode;
window.transcribe = transcribe;
window.synthesize = synthesize;
window.clearFile = clearFile;
window.copyTranscript = copyTranscript;
window.downloadAudio = downloadAudio;
