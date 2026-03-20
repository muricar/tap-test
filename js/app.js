// ─── CONSTANTS ───────────────────────────────────────────────────
const TAG_COLORS = ['#008CFF', '#ff4d2e', '#9333ea', '#f59e0b', '#10b981', '#ec4899'];
const STORAGE_KEY = 'tappay_config';
const BASE_URL = window.location.origin + window.location.pathname;

// ─── STATE ───────────────────────────────────────────────────────
let tags = [];
let tagCounter = 0;

// ─── BOOT ────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  const tagParam = params.get('tag');

  if (tagParam) {
    // PAY MODE — a seller tapped an NFC sticker
    bootPayMode(tagParam);
  } else {
    // SETUP MODE — seller is configuring
    bootSetupMode();
  }
});

// ══════════════════════════════════════════════════════════════════
// SETUP MODE
// ══════════════════════════════════════════════════════════════════
function bootSetupMode() {
  document.getElementById('setup-mode').style.display = 'flex';
  document.getElementById('setup-mode').style.flexDirection = 'column';
  document.getElementById('setup-mode').style.alignItems = 'center';
  document.getElementById('setup-mode').style.width = '100%';
  document.getElementById('pay-mode').style.display = 'none';

  // Load saved config
  loadConfig();

  // Render
  if (tags.length === 0) {
    addTag('Tag 1');
    addTag('Tag 2');
    addTag('Tag 3');
  } else {
    renderTags();
    refreshNFCUrls();
  }
}

// ── Config persistence ────────────────────────────────────────────
function saveConfig() {
  const username = document.getElementById('venmo-username').value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ username, tags }));
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const { username, tags: savedTags } = JSON.parse(raw);
    if (username) document.getElementById('venmo-username').value = username;
    if (savedTags && savedTags.length) {
      tags = savedTags;
      tagCounter = Math.max(...tags.map(t => t.id));
    }
  } catch(e) {}
}

// ── Tag management ────────────────────────────────────────────────
function addTag(defaultLabel = '') {
  tagCounter++;
  const id = tagCounter;
  const color = TAG_COLORS[(id - 1) % TAG_COLORS.length];
  const label = defaultLabel || `Tag ${id}`;
  const nfcId = `tag-${id}`;
  tags.push({ id, label, nfcId, price: '', note: '', color });
  renderTags();
  refreshNFCUrls();
  saveConfig();
}

function removeTag(id) {
  if (tags.length <= 1) { alert('You need at least one tag.'); return; }
  tags = tags.filter(t => t.id !== id);
  renderTags();
  refreshNFCUrls();
  saveConfig();
}

function updateTag(id, field, value) {
  const tag = tags.find(t => t.id === id);
  if (tag) tag[field] = value;
  refreshNFCUrls();
  saveConfig();
}

function renderTags() {
  const list = document.getElementById('tags-list');
  list.innerHTML = '';
  tags.forEach(tag => {
    const row = document.createElement('div');
    row.className = 'tag-row';
    row.innerHTML = `
      <div class="tag-row-header">
        <div class="tag-dot" style="background:${tag.color}"></div>
        <div class="tag-label-text">${tag.label}</div>
        <button class="btn-remove" onclick="removeTag(${tag.id})" title="Remove">✕</button>
      </div>
      <div class="tag-fields">
        <div class="field-wrap">
          <div class="field-label">Tag Name</div>
          <input type="text" class="rounded" placeholder="e.g. Coffee"
            value="${tag.label}"
            oninput="updateTag(${tag.id}, 'label', this.value); this.closest('.tag-row').querySelector('.tag-label-text').textContent = this.value;">
        </div>
        <div class="field-wrap">
          <div class="field-label">Price ($)</div>
          <input type="number" class="rounded" placeholder="0.00" min="0" step="0.01"
            value="${tag.price}"
            oninput="updateTag(${tag.id}, 'price', this.value)">
        </div>
        <div class="field-wrap" style="grid-column: 1 / -1;">
          <div class="field-label">Payment Message</div>
          <input type="text" class="rounded" placeholder="e.g. Large Coffee, T-Shirt..."
            value="${tag.note}"
            oninput="updateTag(${tag.id}, 'note', this.value)">
        </div>
      </div>
    `;
    list.appendChild(row);
  });
}

// ── NFC URL boxes ─────────────────────────────────────────────────
function refreshNFCUrls() {
  saveConfig();
  const username = document.getElementById('venmo-username').value.trim().replace(/^@/, '');
  const container = document.getElementById('nfc-urls');
  container.innerHTML = '';

  if (!username) {
    container.innerHTML = `<div class="no-username-notice">⬆️ Enter your Venmo username above to generate NFC URLs.</div>`;
    return;
  }

  tags.forEach(tag => {
    // Encode tag config into the URL so no server is needed
    const payload = btoa(JSON.stringify({
      username,
      label: tag.label,
      price: tag.price,
      note: tag.note,
      color: tag.color
    }));
    const url = `${BASE_URL}?tag=${tag.nfcId}&p=${payload}`;

    const box = document.createElement('div');
    box.className = 'nfc-url-box';
    box.innerHTML = `
      <div class="nfc-url-header">
        <div class="nfc-url-dot" style="background:${tag.color}"></div>
        <div class="nfc-url-label">${tag.label || 'Unnamed Tag'}</div>
        <span style="font-size:0.7rem;color:var(--muted);">
          ${tag.price ? '$' + parseFloat(tag.price).toFixed(2) : 'No price'} 
          ${tag.note ? '· ' + tag.note : ''}
        </span>
      </div>
      <div class="nfc-url-body">
        <div class="nfc-url-text" id="url-${tag.id}">${url}</div>
        <button class="btn-copy-url" onclick="copyURL('url-${tag.id}', this)">Copy</button>
      </div>
      <div class="nfc-url-hint">
        📲 Open <strong>NFC Tools</strong> app → Write → URL → paste this → write to sticker labeled "<strong>${tag.label}</strong>"
      </div>
    `;
    container.appendChild(box);
  });
}

function copyURL(elemId, btn) {
  const url = document.getElementById(elemId).textContent;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(() => prompt('Copy this URL:', url));
}

// ══════════════════════════════════════════════════════════════════
// PAY MODE  — triggered when ?tag= is in the URL
// ══════════════════════════════════════════════════════════════════
function bootPayMode(tagId) {
  document.getElementById('setup-mode').style.display = 'none';
  document.getElementById('pay-mode').style.display = 'flex';
  document.getElementById('pay-mode').style.flexDirection = 'column';
  document.getElementById('pay-mode').style.alignItems = 'center';

  const params = new URLSearchParams(window.location.search);
  const payload = params.get('p');

  let config = null;

  // Try to decode config from URL payload (preferred — works without localStorage)
  if (payload) {
    try {
      config = JSON.parse(atob(payload));
    } catch(e) {}
  }

  // Fallback: try localStorage
  if (!config) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const matched = saved.tags.find(t => t.nfcId === tagId);
        if (matched) {
          config = {
            username: saved.username,
            label: matched.label,
            price: matched.price,
            note: matched.note,
            color: matched.color
          };
        }
      }
    } catch(e) {}
  }

  // Hide loader
  document.getElementById('pay-loading').style.display = 'none';

  if (!config || !config.username) {
    // Show error
    document.getElementById('pay-error').style.display = 'flex';
    document.getElementById('error-desc').textContent =
      `Tag "${tagId}" is not configured, or the URL is missing payment data. Ask the seller to copy the full URL from the setup page.`;
    return;
  }

  renderPayScreen(config);
}

function renderPayScreen(config) {
  const { username, label, price, note, color } = config;
  const parsedPrice = price ? parseFloat(price) : 0;

  // Build Venmo URL
  let venmoUrl = `https://venmo.com/u/${username}`;
  const p = new URLSearchParams();
  if (parsedPrice > 0) { p.set('txn', 'charge'); p.set('amount', parsedPrice.toFixed(2)); }
  if (note) p.set('note', note);
  if ([...p].length) venmoUrl += '?' + p.toString();

  // Populate UI
  document.getElementById('pay-header').style.background = color || '#008CFF';
  document.getElementById('pay-tag-name').textContent = label || 'Payment';
  document.getElementById('pay-amount').textContent = parsedPrice > 0 ? `$${parsedPrice.toFixed(2)}` : '';
  document.getElementById('pay-note').textContent = note || '';
  document.getElementById('pay-handle').textContent = `@${username}`;
  document.getElementById('pay-direct-link').href = venmoUrl;

  // Generate QR
  const container = document.getElementById('pay-qrcode');
  container.innerHTML = '';
  try {
    new QRCode(container, {
      text: venmoUrl,
      width: 240,
      height: 240,
      colorDark: '#0a0a0f',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch(e) {
    container.innerHTML = '<p style="color:red;font-size:0.8rem">QR generation failed</p>';
  }

  // Show content
  document.getElementById('pay-content').style.display = 'flex';
  document.getElementById('pay-content').style.flexDirection = 'column';
}
