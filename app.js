(() => {
  const PASSWORD = '16696001277431815';
  const LOGGED_OUT_KEY = 'nomadlogs.loggedOut';

  const trigger = document.getElementById('passwordTrigger');
  const lockPassword = document.getElementById('lockPassword');
  const confirmMark = document.getElementById('passwordConfirm');
  const appRoot = document.getElementById('appRoot');
  const logoutBtn = document.getElementById('logoutBtn');

  function showInput() {
    trigger.classList.add('hidden');
    lockPassword.classList.remove('hidden');
    lockPassword.focus();
  }

  function hideInput() {
    lockPassword.classList.add('hidden');
    lockPassword.value = '';
    trigger.classList.remove('hidden');
  }

  function login() {
    localStorage.removeItem(LOGGED_OUT_KEY);
    appRoot.classList.remove('hidden');
  }

  function logout() {
    localStorage.setItem(LOGGED_OUT_KEY, 'true');
    appRoot.classList.add('hidden');
  }

  if (localStorage.getItem(LOGGED_OUT_KEY) === 'true') {
    appRoot.classList.add('hidden');
  }

  trigger.addEventListener('click', showInput);

  lockPassword.addEventListener('blur', hideInput);

  lockPassword.addEventListener('input', () => {
    if (lockPassword.value === PASSWORD) {
      hideInput();
      confirmMark.classList.remove('hidden');
      setTimeout(() => confirmMark.classList.add('hidden'), 1200);
      login();
    }
  });

  logoutBtn.addEventListener('click', logout);
})();

(() => {
  const STORAGE_KEY = 'nomadlogs.entries';
  const THEME_KEY = 'nomadlogs.theme';

  /** @typedef {{id:string, title:string, content:string, date:string, location:string, mood:string, updatedAt:number}} Entry */

  const el = (id) => document.getElementById(id);

  const entryList = el('entryList');
  const searchInput = el('searchInput');
  const moodFilter = el('moodFilter');
  const emptyState = el('emptyState');
  const editorView = el('editorView');
  const readView = el('readView');

  const entryTitle = el('entryTitle');
  const entryDate = el('entryDate');
  const entryLocation = el('entryLocation');
  const entryContent = el('entryContent');
  const moodPicker = el('moodPicker');
  const wordCount = el('wordCount');

  const readMood = el('readMood');
  const readTitle = el('readTitle');
  const readDate = el('readDate');
  const readLocation = el('readLocation');
  const readContent = el('readContent');

  let state = {
    entries: loadEntries(),
    activeId: null,
    editingId: null, // id being edited, or 'new'
    search: '',
    moodFilter: 'all',
    selectedMood: '😊',
  };

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  // ---------- Rendering ----------
  function getFilteredEntries() {
    const q = state.search.trim().toLowerCase();
    return state.entries
      .filter((e) => state.moodFilter === 'all' || e.mood === state.moodFilter)
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  }

  function renderList() {
    const entries = getFilteredEntries();
    entryList.innerHTML = '';

    if (entries.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'no-results';
      msg.textContent = state.entries.length === 0 ? '尚無日記' : '找不到符合的日記';
      entryList.appendChild(msg);
      return;
    }

    for (const entry of entries) {
      const card = document.createElement('div');
      card.className = 'entry-card' + (entry.id === state.activeId ? ' active' : '');
      card.innerHTML = `
        <div class="entry-card-top">
          <span class="entry-card-title">${entry.mood || ''} ${escapeHtml(entry.title || '無標題')}</span>
          <span class="entry-card-date">${entry.date.slice(5)}</span>
        </div>
        <div class="entry-card-snippet">${escapeHtml(entry.content).slice(0, 60) || '（沒有內容）'}</div>
        ${entry.location ? `<div class="entry-card-location">📍 ${escapeHtml(entry.location)}</div>` : ''}
      `;
      card.addEventListener('click', () => openReadView(entry.id));
      entryList.appendChild(card);
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showView(view) {
    emptyState.classList.add('hidden');
    editorView.classList.add('hidden');
    readView.classList.add('hidden');
    if (view === 'empty') emptyState.classList.remove('hidden');
    if (view === 'editor') editorView.classList.remove('hidden');
    if (view === 'read') readView.classList.remove('hidden');
  }

  function openReadView(id) {
    const entry = state.entries.find((e) => e.id === id);
    if (!entry) return;
    state.activeId = id;
    state.editingId = null;
    readMood.textContent = entry.mood || '';
    readTitle.textContent = entry.title || '無標題';
    readDate.textContent = formatDate(entry.date);
    readLocation.textContent = entry.location ? `📍 ${entry.location}` : '';
    readContent.textContent = entry.content;
    showView('read');
    renderList();
  }

  function openEditor(id) {
    state.editingId = id || 'new';
    const isNew = !id;
    const entry = isNew
      ? { id: null, title: '', content: '', date: todayISO(), location: '', mood: '😊' }
      : state.entries.find((e) => e.id === id);

    if (!entry) return;

    entryTitle.value = entry.title;
    entryContent.value = entry.content;
    entryDate.value = entry.date;
    entryLocation.value = entry.location || '';
    state.selectedMood = entry.mood || '😊';
    updateMoodPickerUI();
    updateWordCount();

    el('deleteBtn').classList.toggle('hidden', isNew);
    showView('editor');
    entryTitle.focus();
  }

  function updateMoodPickerUI() {
    [...moodPicker.querySelectorAll('button')].forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.mood === state.selectedMood);
    });
  }

  function updateWordCount() {
    const len = entryContent.value.length;
    wordCount.textContent = `${len} 字`;
  }

  function saveEntry() {
    const title = entryTitle.value.trim();
    const content = entryContent.value.trim();
    const date = entryDate.value || todayISO();
    const location = entryLocation.value.trim();

    if (!title && !content) {
      cancelEditing();
      return;
    }

    if (state.editingId === 'new') {
      const entry = { id: uid(), title, content, date, location, mood: state.selectedMood, updatedAt: Date.now() };
      state.entries.push(entry);
      state.activeId = entry.id;
    } else {
      const entry = state.entries.find((e) => e.id === state.editingId);
      Object.assign(entry, { title, content, date, location, mood: state.selectedMood, updatedAt: Date.now() });
      state.activeId = entry.id;
    }

    saveEntries();
    renderList();
    openReadView(state.activeId);
  }

  function deleteEntry() {
    if (state.editingId === 'new' || !state.editingId) return;
    if (!confirm('確定要刪除這篇日記嗎？此動作無法復原。')) return;
    state.entries = state.entries.filter((e) => e.id !== state.editingId);
    saveEntries();
    state.activeId = null;
    state.editingId = null;
    renderList();
    showView(state.entries.length ? 'empty' : 'empty');
    if (state.entries.length) {
      openReadView(getFilteredEntries()[0].id);
    } else {
      showView('empty');
    }
  }

  function cancelEditing() {
    if (state.activeId && state.entries.some((e) => e.id === state.activeId)) {
      openReadView(state.activeId);
    } else {
      showView(state.entries.length ? 'read' : 'empty');
      if (!state.entries.length) showView('empty');
      else openReadView(getFilteredEntries()[0]?.id);
    }
  }

  // ---------- Theme ----------
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      el('themeToggle').textContent = '☀️ 淺色模式';
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'light');
      el('themeToggle').textContent = '🌙 深色模式';
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(THEME_KEY, 'dark');
      el('themeToggle').textContent = '☀️ 淺色模式';
    }
  }

  // ---------- Export ----------
  function exportEntries() {
    if (!state.entries.length) {
      alert('目前沒有日記可以匯出。');
      return;
    }
    const sorted = [...state.entries].sort((a, b) => a.date.localeCompare(b.date));
    const text = sorted
      .map((e) => `# ${e.title || '無標題'} ${e.mood || ''}\n${formatDate(e.date)}${e.location ? ' · 📍 ' + e.location : ''}\n\n${e.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomadlogs-export-${todayISO()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Events ----------
  el('newEntryBtn').addEventListener('click', () => openEditor(null));
  el('emptyNewEntryBtn').addEventListener('click', () => openEditor(null));
  el('saveBtn').addEventListener('click', saveEntry);
  el('cancelBtn').addEventListener('click', cancelEditing);
  el('deleteBtn').addEventListener('click', deleteEntry);
  el('editBtn').addEventListener('click', () => openEditor(state.activeId));
  el('themeToggle').addEventListener('click', toggleTheme);
  el('exportBtn').addEventListener('click', exportEntries);

  entryContent.addEventListener('input', updateWordCount);

  moodPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mood]');
    if (!btn) return;
    state.selectedMood = btn.dataset.mood;
    updateMoodPickerUI();
  });

  searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderList();
  });

  moodFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-chip');
    if (!btn) return;
    [...moodFilter.querySelectorAll('.mood-chip')].forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    state.moodFilter = btn.dataset.mood;
    renderList();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && !editorView.classList.contains('hidden')) {
      e.preventDefault();
      saveEntry();
    }
  });

  // ---------- Init ----------
  initTheme();
  renderList();
  const first = getFilteredEntries()[0];
  if (first) {
    openReadView(first.id);
  } else {
    showView('empty');
  }
})();
