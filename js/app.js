// ─── TAG COLORS ──────────────────────────────────────────────────
const TAG_COLORS = ['#008CFF', '#ff4d2e', '#9333ea', '#f59e0b', '#10b981', '#ec4899'];

// ─── STATE ───────────────────────────────────────────────────────
let tags = [];       // { id, label, nfcId, price, note }
let tagCounter = 0;

// ─── INIT ────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  // Start with 3 default tags
  addTag('Tag 1', 'nfc-tag-1');
  addTag('Tag 2', 'nfc-tag-2');
  addTag('Tag 3', 'nfc-tag-3');

  if (!('NDEFReader' in window)) {
    document.getElementById('demo-notice').classList.add('visible');
    showManualButtons();
  }
});

// ─── TAG MANAGEMENT ──────────────────────────────────────────────
function addTag(defaultLabel = '', defaultNfcId = '') {
  tagCounter++;
  const id = tagCounter;
  const color = TAG_COLORS[(id - 1) % TAG_COLORS.length];
  const label = defaultLabel || `Tag ${id}`;
  const nfcId = defaultNfcId || `nfc-tag-${id}`;

  tags.push({ id, label, nfcId, price: '', note: '', color });
  renderTags();
}

function removeTag(id) {
  if (tags.length <= 1) {
    alert('You need at least one NFC tag.');
    return;
  }
  tags = tags.filter(t => t.id !== id);
  renderTags();
  if (!('NDEFReader' in window)) showManualButtons();
}

function updateTag(id, field, value) {
  const tag = tags.find(t => t.id === id);
  if (tag) tag[field] = value;
  if (!('NDEFReader' in window)) showManualButtons();
}

function renderTags() {
  const list = document.getElementById('tags-list');
  list.innerHTML = '';

  tags.forEach(tag => {
    const row = document.createElement('div');
    row.className = 'tag-row';
    row.id = `tag-row-${tag.id}`;
    row.innerHTML = `
      <div class="tag-row-header">
        <div class="tag-dot" style="background:${tag.color}"></div>
        <div class="tag-label">${tag.label}</div>
        <div class="tag-id-badge">#${tag.id}</div>
        <button class="btn-remove" onclick="removeTag(${tag.id})" title="Remove tag">✕</button>
      </div>
      <div class="tag-fields">
        <div class="field-wrap">
          <div class="field-label">NFC Tag ID</div>
          <input
            type="text"
            class="rounded nfc-id-input"
            placeholder="e.g. nfc-tag-1"
            value="${tag.nfcId}"
            oninput="updateTag(${tag.id}, 'nfcId', this.value)"
          >
        </div>
        <div class="field-wrap">
          <div class="field-label">Price ($)</div>
          <input
            type="number"
            class="rounded"
            placeholder="0.00"
            min="0"
            step="0.01"
            value="${tag.price}"
            oninput="updateTag(${tag.id}, 'price', this.value)"
          >
        </div>
        <div class="field-wrap" style="grid-column: 1 / -1;">
          <div class="field-label">Payment Message</div>
          <input
            type="text"
            class="rounded"
            placeholder="e.g. Coffee, T-Shirt, Tip..."
            value="${tag.note}"
            oninput="updateTag(${tag.id}, 'note', this.value)"
          >
        </div>
      </div>
    `;
    list.appendChild(row);
  });
}

// ─── MANUAL BUTTONS (for testing without NFC) ────────────────────
function showManualButtons() {
  const wrap = document.getElementById('manual-btns');
  wrap.innerHTML = '';

  if (tags.length === 0) { wrap.style.display = 'none'; return; }

  const label = document.createElement('p');
  label.style.cssText = 'font-size:0.75rem;color:var(--muted);';
  label.textContent = '🧪 Simulate a tap for testing:';
  wrap.appendChild(label);

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'btn-manual-tag';
    const displayLabel = tag.note
      ? `${tag.label} — $${parseFloat(tag.price || 0).toFixed(2)} · ${tag.note}`
      : `${tag.label} — $${parseFloat(tag.price || 0).toFixed(2)}`;
    btn.innerHTML = `
      <div class="btn-dot" style="background:${tag.color}"></div>
      <span>${displayLabel}</span>
    `;
    btn.onclick = () => triggerTag(tag.id);
    wrap.appendChild(btn);
  });

  wrap.style.display = 'flex';
}

// ─── NFC SCANNING ────────────────────────────────────────────────
async function startNFC() {
  const username = getUsername();
  if (!username) { showStatus('error', '⚠️ Enter your Venmo username first.'); return; }
  if (tags.length === 0) { showStatus('error', '⚠️ Add at least one NFC tag first.'); return; }

  if (!('NDEFReader' in window)) {
    showStatus('error', '⚠️ Web NFC not supported here. Use the test buttons above.');
    showManualButtons();
    return;
  }

  try {
    document.getElementById('nfc-btn').disabled = true;
    showStatus('scanning', 'Bring your NFC tag close to the back of your phone...');

    const reader = new NDEFReader();
    await reader.scan();

    reader.onreadingerror = () => {
      showStatus('error', '❌ Could not read tag. Try again.');
      document.getElementById('nfc-btn').disabled = false;
    };

    reader.onreading = ({ serialNumber, message }) => {
      document.getElementById('nfc-btn').disabled = false;

      // Try to extract identifier from the tag
      let readId = serialNumber || '';

      // Also check NDEF records for a text/url identifier
      for (const record of message.records) {
        try {
          if (record.recordType === 'text' || record.recordType === 'url') {
            const text = new TextDecoder().decode(record.data);
            // If the record matches any of our nfcId values, use it
            const matched = tags.find(t => text.includes(t.nfcId));
            if (matched) { readId = matched.nfcId; break; }
          }
        } catch(e) {}
      }

      // Match against configured tags
      const matchedTag = tags.find(t =>
        t.nfcId && (
          readId.toLowerCase().includes(t.nfcId.toLowerCase()) ||
          t.nfcId.toLowerCase().includes(readId.toLowerCase())
        )
      );

      if (matchedTag) {
        showStatus('success', `✅ Matched: ${matchedTag.label}`);
        setTimeout(() => generateQR(matchedTag), 400);
      } else {
        // Unknown tag — show the serial and ask which tag it is
        showStatus('error', `⚠️ Tag not configured. Serial: ${readId || 'unknown'}. Update the NFC Tag ID field to match.`);
      }
    };

  } catch (err) {
    let msg = '❌ NFC scan failed.';
    if (err.name === 'NotAllowedError') msg = '❌ NFC permission denied. Please allow access.';
    if (err.name === 'NotSupportedError') msg = '❌ NFC not supported on this device.';
    showStatus('error', msg);
    document.getElementById('nfc-btn').disabled = false;
  }
}

// Simulate tapping a specific tag (for manual/testing)
function triggerTag(tagId) {
  const username = getUsername();
  if (!username) { showStatus('error', '⚠️ Enter your Venmo username first.'); return; }

  const tag = tags.find(t => t.id === tagId);
  if (!tag) return;

  showStatus('success', `✅ Simulated tap: ${tag.label}`);
  setTimeout(() => generateQR(tag), 300);
}

// ─── QR GENERATION ───────────────────────────────────────────────
function generateQR(tag) {
  const username = getUsername();
  if (!username) { showStatus('error', '⚠️ Enter your Venmo username first.'); return; }

  const price = tag.price ? parseFloat(tag.price) : 0;
  const note  = tag.note || '';

  // Build Venmo deep link
  let url = `https://venmo.com/u/${username}`;
  const params = new URLSearchParams();
  if (price > 0) {
    params.set('txn', 'charge');
    params.set('amount', price.toFixed(2));
  }
  if (note) params.set('note', note);
  if ([...params].length) url += '?' + params.toString();

  // Clear & render QR
  const container = document.getElementById('qrcode');
  container.innerHTML = '';
  try {
    new QRCode(container, {
      text: url,
      width: 220,
      height: 220,
      colorDark: '#0a0a0f',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch(e) {
    container.innerHTML = '<p style="color:red;font-size:0.8rem">QR generation failed</p>';
  }

  // Update display
  document.getElementById('qr-tag-label').textContent = `${tag.label} · ${tag.color ? '●' : ''} tap detected`;
  document.getElementById('qr-header').style && (document.querySelector('.qr-header').style.background = tag.color);
  document.querySelector('.qr-header').style.background = tag.color;
  document.getElementById('display-handle').textContent = '@' + username;
  document.getElementById('display-amount').textContent = price > 0 ? `$${price.toFixed(2)}` : 'No amount set';
  document.getElementById('display-note').textContent = note || '';
  document.getElementById('display-url').textContent = url;

  // Show QR section
  const qrSec = document.getElementById('qr-section');
  qrSec.classList.add('visible');
  qrSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── HELPERS ─────────────────────────────────────────────────────
function getUsername() {
  return document.getElementById('venmo-username').value.trim().replace(/^@/, '');
}

function showStatus(type, text) {
  const el = document.getElementById('nfc-status');
  el.className = 'nfc-status ' + type;
  el.style.display = 'flex';
  if (type === 'scanning') {
    el.innerHTML = `<div class="pulse-dot"></div><span>${text}</span>`;
  } else {
    const icon = type === 'success' ? '✅' : '⚠️';
    el.innerHTML = `<span>${text}</span>`;
  }
}

function copyLink() {
  const url = document.getElementById('display-url').textContent;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(() => prompt('Copy this link:', url));
}

function resetQR() {
  document.getElementById('qr-section').classList.remove('visible');
  document.getElementById('nfc-status').style.display = 'none';
  document.getElementById('qrcode').innerHTML = '';
  document.getElementById('nfc-btn').disabled = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
