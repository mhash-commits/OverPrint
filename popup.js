const DEFAULT_SETTINGS = { hideOtherAds: true };

const selectBox = document.getElementById('creative-select');
const statusEl = document.getElementById('status');
const captureBtn = document.getElementById('capture-btn');

const stage = document.getElementById('stage');
const slot = document.getElementById('slot');
const slotImg = document.getElementById('slot-img');
const slotEmpty = document.getElementById('slot-empty');
const dim = document.getElementById('dim');
const dimLabel = document.getElementById('dim-label');

let creatives = [];

function showStatus(message) {
  statusEl.textContent = message;
}

// ---------- Preview ----------
function renderPreview(creative) {
  if (!creative) {
    slot.classList.remove('filled');
    slot.style.width = '200px';
    slot.style.height = '56px';
    slotImg.hidden = true;
    slotEmpty.hidden = false;
    dim.hidden = true;
    return;
  }

  const w = parseInt(creative.width, 10) || 300;
  const h = parseInt(creative.height, 10) || 250;
  const scale = Math.min((stage.clientWidth || 240) / w, 84 / h, 1);
  const shownW = Math.max(28, Math.round(w * scale));
  const shownH = Math.max(14, Math.round(h * scale));

  slot.style.width = `${shownW}px`;
  slot.style.height = `${shownH}px`;
  slot.classList.add('filled');
  slotImg.src = creative.data;
  slotImg.hidden = false;
  slotEmpty.hidden = true;

  dim.style.width = `${shownW}px`;
  dimLabel.textContent = `${w} × ${h}`;
  dim.hidden = false;
}

function selectedCreative() {
  return creatives.find((item) => item.id === selectBox.value);
}

// ---------- Populate creatives ----------
chrome.storage.local.get(['creatives', 'activeCreativeId'], (result) => {
  creatives = result.creatives || [];
  creatives.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} (${item.width} × ${item.height})`;
    if (item.id === result.activeCreativeId) option.selected = true;
    selectBox.appendChild(option);
  });
  renderPreview(selectedCreative());
});

selectBox.addEventListener('change', (e) => {
  chrome.storage.local.set({ activeCreativeId: e.target.value });
  renderPreview(selectedCreative());
});

// ---------- Target an ad slot ----------
function sendToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve(chrome.runtime.lastError ? null : response);
    });
  });
}

async function ensureContentScript(tabId) {
  if (await sendToTab(tabId, { command: 'PING' })) return true;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return !!(await sendToTab(tabId, { command: 'PING' }));
  } catch (err) {
    return false;
  }
}

document.getElementById('select-btn').addEventListener('click', async () => {
  showStatus('');
  if (!selectBox.value) return showStatus('Choose a creative first.');

  const creative = selectedCreative();
  if (!creative) return showStatus('That creative no longer exists. Choose another.');

  const { settings } = await chrome.storage.local.get(['settings']);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (!(await ensureContentScript(tab.id))) {
    return showStatus("Overprint can't run on this page. Open a regular website and try again.");
  }

  const response = await sendToTab(tab.id, {
    command: 'START_SELECTION',
    creative,
    options: { ...DEFAULT_SETTINGS, ...(settings || {}) }
  });
  if (response && response.status === 'success') window.close();
  else showStatus("Couldn't start picking on this page. Reload it and try again.");
});

// ---------- Copy a screenshot ----------
captureBtn.addEventListener('click', async () => {
  captureBtn.textContent = 'Copying…';
  captureBtn.classList.remove('error');
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    const blob = await (await fetch(dataUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    captureBtn.textContent = 'Copied to clipboard';
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error(error);
    captureBtn.textContent = 'Copy failed. Try again';
    captureBtn.classList.add('error');
  }
});

document.getElementById('options-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
