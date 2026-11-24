const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const viewerWrap = document.getElementById('viewer-wrap');
const viewer = document.getElementById('pdf-viewer');
const fileNameEl = document.getElementById('file-name');
const fileMetaEl = document.getElementById('file-meta');
const replaceBtn = document.getElementById('replace-btn');
const errorEl = document.getElementById('upload-error');
const form = document.getElementById('chat-form');
const input = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const messages = document.getElementById('messages');

const WEBHOOK_URL = 'https://fouraces.app.n8n.cloud/webhook-test/b760a5ec-97b7-47b6-8f25-10faece02019';
let currentUrl = null;
let currentFile = null;

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = !msg;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadFile(file) {
  if (!file) return;
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    showError('Please upload a PDF file.');
    return;
  }
  showError('');
  currentFile = file;
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(file);

  viewer.src = currentUrl;
  viewerWrap.hidden = false;
  dropZone.hidden = true;

  fileNameEl.textContent = file.name;
  fileNameEl.hidden = false;
  replaceBtn.hidden = false;
  fileMetaEl.textContent = formatSize(file.size);

  addMessage('assistant', `Loaded "${file.name}". What would you like to know?`);
  input.focus();
}

fileInput.addEventListener('change', () => {
  loadFile(fileInput.files[0]);
  fileInput.value = '';
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
replaceBtn.addEventListener('click', () => fileInput.click());

// Drag and drop anywhere on the contract panel (also works when replacing)
const contractPanel = document.querySelector('.contract-panel');
['dragenter', 'dragover'].forEach(evt =>
  contractPanel.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(evt =>
  contractPanel.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
contractPanel.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.textContent = text;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

input.addEventListener('input', () => {
  sendBtn.disabled = !input.value.trim();
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage('user', text);
  input.value = '';
  sendBtn.disabled = true;

  if (!currentFile) {
    addMessage('assistant', 'Please upload a contract PDF first, then ask your question.');
    return;
  }

  const pending = addMessage('assistant', '');
  pending.innerHTML = '<span class="typing" aria-label="Typing"><span></span><span></span><span></span></span>';

  askWebhook(currentFile, text)
    .then(data => renderAnswer(pending, data))
    .catch(err => {
      console.error(err);
      pending.classList.add('error-message');
      pending.textContent = `Sorry, the request failed (${err.message}). Please try again.`;
    })
    .finally(() => { messages.scrollTop = messages.scrollHeight; });
});

async function askWebhook(file, message) {
  const body = new FormData();
  body.append('file', file, file.name);
  body.append('message', message);

  const res = await fetch(WEBHOOK_URL, { method: 'POST', body });
  const raw = await res.text();
  const snippet = raw.trim().slice(0, 200) || '(empty body)';
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${snippet}`);

  const data = extractAnswer(raw);
  if (data) return data;
  // Fallback: the webhook returned plain text instead of the JSON shape.
  if (!raw.trim()) throw new Error('the webhook returned an empty response');
  return { response: raw.trim(), citation: [], reasoning: '' };
}

// Parse the webhook body, tolerating code fences, arrays, and wrapper keys like "output".
function extractAnswer(raw) {
  let value = raw;
  for (let i = 0; i < 4; i++) {
    if (typeof value === 'string') {
      const s = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      try { value = JSON.parse(s); } catch { return null; }
    }
    if (Array.isArray(value)) value = value[0];
    if (value && typeof value === 'object') {
      if (typeof value.response === 'string') return value;
      const inner = value.output ?? value.text ?? value.json ?? value.data;
      if (inner === undefined) return null;
      value = inner;
    } else if (typeof value !== 'string') {
      return null;
    }
  }
  return null;
}

function renderAnswer(el, data) {
  el.textContent = '';

  const answer = document.createElement('div');
  answer.textContent = data.response;
  el.appendChild(answer);

  const citations = Array.isArray(data.citation) ? data.citation.filter(Boolean) : [];
  if (citations.length) {
    const label = document.createElement('div');
    label.className = 'answer-label';
    label.textContent = 'Citations';
    const list = document.createElement('ul');
    list.className = 'citations';
    citations.forEach(c => {
      const li = document.createElement('li');
      li.textContent = c;
      list.appendChild(li);
    });
    el.append(label, list);
  }

  if (data.reasoning) {
    const label = document.createElement('div');
    label.className = 'answer-label';
    label.textContent = 'Reasoning';
    const p = document.createElement('div');
    p.className = 'reasoning';
    p.textContent = data.reasoning;
    el.append(label, p);
  }
}
