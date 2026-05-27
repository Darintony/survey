/* ================================================================
   survey/js/script.js
   - Strict email & phone validation
   - Unique email & phone enforcement
   - 200-word message limit with live counter
   - Toast at top-left
   - Email confirmation modal simulation
   - Message truncated to 100 chars in card view
================================================================ */

'use strict';

/* ── State ── */
let entries = [];
let counter = 0;

/* ── DOM refs ── */
const nameInput    = document.getElementById('name');
const emailInput   = document.getElementById('email');
const phoneInput   = document.getElementById('phone');
const msgInput     = document.getElementById('message');
const wordCounter  = document.getElementById('word-counter');
const entriesList  = document.getElementById('entries-list');
const emptyState   = document.getElementById('empty-state');
const countBadge   = document.getElementById('count-badge');
const clearAllBtn  = document.getElementById('clear-all-btn');
const toast        = document.getElementById('toast');

/* ================================================================
   VALIDATION HELPERS
================================================================ */

/** Valid email: user@domain.ext — strict RFC-ish regex */
function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
}

/** Phone: exactly 10 digits, no spaces / letters */
function isValidPhone(val) {
  return /^\d{10}$/.test(val.trim());
}

/** Count words in a string */
function wordCount(str) {
  return str.trim() === '' ? 0 : str.trim().split(/\s+/).length;
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Truncate to first 100 chars */
function truncate(str) {
  if (str.length <= 100) return escHtml(str);
  return escHtml(str.slice(0, 100)) + '<span class="truncated">..............</span>';
}

/* ================================================================
   TOAST (top-left)
================================================================ */
let toastTimer = null;

function showToast(msg, type = 'success') {
  toast.textContent  = msg;
  toast.className    = 'toast';           // reset classes
  toast.classList.add(type, 'show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ================================================================
   INLINE ERROR HELPERS
================================================================ */
function setError(fieldId, msg) {
  const el    = document.getElementById('err-' + fieldId);
  const input = document.getElementById(fieldId);
  if (el)    el.textContent = msg;
  if (input) input.classList.toggle('invalid', msg !== '');
}

function clearErrors() {
  ['name', 'email', 'phone', 'message'].forEach(id => setError(id, ''));
}

/* ================================================================
   WORD COUNTER (live)
================================================================ */
msgInput.addEventListener('input', () => {
  const count = wordCount(msgInput.value);
  wordCounter.textContent = `${count} / 200 words`;
  wordCounter.className   = 'word-counter';

  if (count >= 200) {
    wordCounter.classList.add('at-limit');
    capWordLimit();
  } else if (count >= 180) {
    wordCounter.classList.add('near-limit');
  }
});

/** Prevent typing beyond 200 words */
function capWordLimit() {
  const words = msgInput.value.trim().split(/\s+/);
  if (words.length > 200) {
    msgInput.value = words.slice(0, 200).join(' ');
  }
}

/* Only allow numeric input in phone field */
phoneInput.addEventListener('input', () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
});

/* ================================================================
   UNIQUENESS CHECK
================================================================ */
function isDuplicateEmail(email) {
  return entries.some(e => e.email.toLowerCase() === email.toLowerCase());
}

function isDuplicatePhone(phone) {
  return entries.some(e => e.phone === phone);
}

/* ================================================================
   SUBMIT
================================================================ */
function submitEntry() {
  clearErrors();

  const name    = nameInput.value.trim();
  const email   = emailInput.value.trim();
  const phone   = phoneInput.value.trim();
  const message = msgInput.value.trim();
  let   valid   = true;

  /* Name */
  if (!name) {
    setError('name', 'Full name is required.');
    valid = false;
  }

  /* Email — format */
  if (!email) {
    setError('email', 'Email address is required.');
    valid = false;
  } else if (!isValidEmail(email)) {
    setError('email', 'Enter a valid email (e.g. user@domain.com).');
    valid = false;
  } else if (isDuplicateEmail(email)) {
    setError('email', 'This email has already been submitted.');
    valid = false;
  }

  /* Phone — numeric + exactly 10 digits */
  if (!phone) {
    setError('phone', 'Phone number is required.');
    valid = false;
  } else if (!/^\d+$/.test(phone)) {
    setError('phone', 'Phone number must contain only digits.');
    valid = false;
  } else if (phone.length !== 10) {
    setError('phone', 'Phone number must be exactly 10 digits.');
    valid = false;
  } else if (isDuplicatePhone(phone)) {
    setError('phone', 'This phone number has already been submitted.');
    valid = false;
  }

  /* Message — required + max 200 words */
  if (!message) {
    setError('message', 'Message is required.');
    valid = false;
  } else if (wordCount(message) > 200) {
    setError('message', 'Message must not exceed 200 words.');
    valid = false;
  }

  if (!valid) {
    showToast('⚠️ Please fix the errors below.', 'error');
    return;
  }

  /* Save entry */
  counter++;
  const entry = { id: counter, name, email, phone, message };
  entries.unshift(entry);

  renderEntries();
  resetForm();
  showEmailModal(name, email);
}

/* ================================================================
   RESET FORM
================================================================ */
function resetForm() {
  nameInput.value  = '';
  emailInput.value = '';
  phoneInput.value = '';
  msgInput.value   = '';
  wordCounter.textContent = '0 / 200 words';
  wordCounter.className   = 'word-counter';
  clearErrors();
}

/* ================================================================
   DELETE / CLEAR ALL
================================================================ */
function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  renderEntries();
  showToast('🗑 Entry removed.', 'warning');
}

function clearAll() {
  if (!confirm('Remove all entries?')) return;
  entries = [];
  renderEntries();
  showToast('🗑 All entries cleared.', 'warning');
}

/* ================================================================
   RENDER ENTRIES
================================================================ */
function renderEntries() {
  countBadge.textContent = entries.length;

  if (entries.length === 0) {
    emptyState.style.display = 'block';
    entriesList.innerHTML    = '';
    clearAllBtn.classList.remove('visible');
    return;
  }

  emptyState.style.display = 'none';
  clearAllBtn.classList.add('visible');

  entriesList.innerHTML = entries.map(e => `
    <div class="entry-card">
      <div class="entry-header">
        <div class="entry-name">${escHtml(e.name)}</div>
        <span class="entry-num">#${e.id}</span>
      </div>
      <div class="entry-meta">
        <div class="meta-item">
          <span>✉️</span>
          <span>${escHtml(e.email)}</span>
        </div>
        <div class="meta-item">
          <span>📞</span>
          <span>${escHtml(e.phone)}</span>
        </div>
      </div>
      <div class="entry-message">${truncate(e.message)}</div>
      <button class="delete-btn" data-id="${e.id}" title="Delete">✕</button>
    </div>
  `).join('');

  /* Attach delete listeners */
  entriesList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteEntry(Number(btn.dataset.id)));
  });
}

/* ================================================================
   EMAIL CONFIRMATION MODAL (simulated — no real email API)
================================================================ */
function showEmailModal(name, email) {
  /* Remove any existing modal */
  const old = document.getElementById('email-modal-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.className = 'email-modal-overlay';
  overlay.id        = 'email-modal-overlay';

  overlay.innerHTML = `
    <div class="email-modal" role="dialog" aria-modal="true" aria-label="Email confirmation">
      <div class="modal-icon">📧</div>
      <h3>Confirmation Email Sent!</h3>
      <p class="to-line">To: <span>${escHtml(email)}</span></p>
      <div class="email-body">
        Dear <strong>${escHtml(name)}</strong>,<br><br>
        You have successfully submitted the survey.<br><br>
        Thank you for taking the time to share your thoughts with us.
        We appreciate your feedback and will get back to you if needed.<br><br>
        Warm regards,<br>
        <strong>The Survey Team</strong>
      </div>
      <button class="btn-close-modal" id="btn-close-modal">Got it!</button>
    </div>
  `;

  document.body.appendChild(overlay);
  showToast('✓ Survey submitted! Check your email.', 'success');

  document.getElementById('btn-close-modal').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ================================================================
   EVENT LISTENERS
================================================================ */
document.getElementById('btn-submit').addEventListener('click', submitEntry);
document.getElementById('btn-reset').addEventListener('click', resetForm);
clearAllBtn.addEventListener('click', clearAll);
