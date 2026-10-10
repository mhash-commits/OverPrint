const MAX_CREATIVES = 50;
const DEFAULT_SETTINGS = { hideOtherAds: true };

let creatives = [];

chrome.storage.local.get(['creatives', 'settings'], (result) => {
  creatives = result.creatives || [];
  const settings = { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
  document.getElementById('setting-hide-other-ads').checked = settings.hideOtherAds;
  renderGallery();
});

// ---------- Settings ----------
document.getElementById('setting-hide-other-ads').addEventListener('change', (e) => {
  chrome.storage.local.get(['settings'], (result) => {
    chrome.storage.local.set({ settings: { ...(result.settings || {}), hideOtherAds: e.target.checked } });
  });
});

// ---------- Upload ----------
const zone = document.getElementById('drop-zone');
const input = document.getElementById('file-input');

document.getElementById('browse-btn').addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
zone.addEventListener('click', () => input.click());
input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
zone.addEventListener('drop', (e) => {
  e.preventDefault();
  zone.classList.remove('dragging');
  handleFiles(e.dataTransfer.files);
});

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function parseSize(name) {
  const size = name.match(/(\d+)[xX](\d+)/);
  return {
    width: size ? `${size[1]}px` : '300px',
    height: size ? `${size[2]}px` : '250px'
  };
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
  for (const file of files) {
    if (creatives.length >= MAX_CREATIVES) {
      alert(`The library is full (${MAX_CREATIVES} creatives). Remove one to add more.`);
      break;
    }
    try {
      const data = await readAsDataURL(file);
      creatives.push({ id: crypto.randomUUID(), name: file.name, data, ...parseSize(file.name) });
    } catch (err) {
      console.error('Failed to read', file.name, err);
    }
  }
  chrome.storage.local.set({ creatives }, renderGallery);
}

// ---------- Library ----------
document.getElementById('reset-btn').addEventListener('click', () => {
  if (creatives.length === 0) return;
  if (confirm('Remove all creatives from the library? This can’t be undone.')) {
    creatives = [];
    chrome.storage.local.set({ creatives: [], activeCreativeId: null }, renderGallery);
  }
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderGallery() {
  const gallery = document.getElementById('gallery');
  gallery.replaceChildren();
  document.getElementById('library-count').textContent =
    `${creatives.length} of ${MAX_CREATIVES} creatives`;

  if (creatives.length === 0) {
    gallery.appendChild(el('p', 'empty', 'No creatives yet. Drop a banner into the box on the left to add your first one.'));
    return;
  }

  creatives.forEach((ad) => {
    const tile = el('figure', 'tile');

    const frame = el('div', 'frame');
    const img = document.createElement('img');
    img.src = ad.data;
    img.alt = ad.name;
    frame.appendChild(img);
    tile.appendChild(frame);

    const caption = el('figcaption', 'caption');
    const row = el('div', 'caption-row');
    row.appendChild(el('span', 'size', `${parseInt(ad.width, 10)} × ${parseInt(ad.height, 10)}`));

    const remove = el('button', 'remove', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${ad.name}`);
    remove.addEventListener('click', () => {
      creatives = creatives.filter((c) => c.id !== ad.id);
      chrome.storage.local.set({ creatives }, renderGallery);
    });
    row.appendChild(remove);

    caption.appendChild(row);
    caption.appendChild(el('div', 'name', ad.name));
    tile.appendChild(caption);
    gallery.appendChild(tile);
  });
}
