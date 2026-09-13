let state = loadState();
runDailyCheckIn(state);

function renderAll() {
  renderCharacter(state);
  renderTasks(state);
  renderBooks(state);
  renderHabits(state);
  renderRewards(state);
  renderAchievements(state);
  renderLog(state);
  renderAssistantWidget(state);
  renderAssistantLog(state);
  renderCalendarTab(state);
  saveState(state);

  const unlocked = checkAchievements(state);
  if (unlocked.length) {
    unlocked.forEach(a => onAchievement(state, a));
    saveState(state);
    renderAchievements(state);
    renderAssistantWidget(state);
    renderAssistantLog(state);
    unlocked.forEach((a, i) => setTimeout(() => showAchievementToast(a), i * 900));
  }
}

function renderLog(state) {
  const el = document.getElementById('activity-log');
  if (!state.log.length) {
    el.innerHTML = '<li class="empty-hint">還沒有任何紀錄</li>';
    return;
  }
  el.innerHTML = state.log.slice(0, 10).map(l => `<li>${l.date}｜${escapeHtml(l.text)}</li>`).join('');
}

function showAchievementToast(a) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${a.icon}</span><div><div class="toast-title">解鎖成就</div><div class="toast-name">${a.name}</div></div>`;
  document.getElementById('toast-container').appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
}

function initSoundOnce() {
  sound.init();
  document.removeEventListener('click', initSoundOnce);
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', initSoundOnce, { once: true });

  ['task-domain', 'habit-domain', 'event-domain'].forEach(id => {
    const select = document.getElementById(id);
    DOMAINS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.key;
      opt.textContent = `${d.icon} ${d.name}`;
      select.appendChild(opt);
    });
  });

  document.getElementById('event-date').value = todayStr();
  document.getElementById('gcal-origin-hint').textContent = location.origin;

  const muteBtn = document.getElementById('mute-btn');
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', () => {
    muteBtn.textContent = sound.toggleMute() ? '🔇' : '🔊';
  });

  renderAll();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('char-name').addEventListener('change', e => {
    state.character.name = e.target.value || '我的角色';
    renderAll();
  });

  document.getElementById('assistant-shuffle').addEventListener('click', () => {
    addAssistantMessage(state, buildDailySuggestion(state), 'suggestion');
    sound.playClick();
    renderAll();
  });

  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      onMoodCheckin(state, btn.dataset.mood);
      sound.playClick();
      renderAll();
      switchTab('tab-assistant');
    });
  });

  // 今日任務
  document.getElementById('task-form').addEventListener('submit', e => {
    e.preventDefault();
    const text = document.getElementById('task-text').value;
    const domain = document.getElementById('task-domain').value;
    const difficulty = document.getElementById('task-difficulty').value;
    addTask(state, text, domain, difficulty);
    document.getElementById('task-text').value = '';
    renderAll();
  });

  document.getElementById('task-list').addEventListener('click', e => {
    if (e.target.matches('input[type="checkbox"]')) {
      const willBeDone = e.target.checked;
      const domain = (state.tasks.find(t => t.id === e.target.dataset.id) || {}).domain;
      toggleTask(state, e.target.dataset.id);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      renderAll();
    } else if (e.target.matches('.del-task')) {
      deleteTask(state, e.target.dataset.id);
      renderAll();
    }
  });

  // 習慣
  document.getElementById('habit-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('habit-name').value;
    const domain = document.getElementById('habit-domain').value;
    const difficulty = document.getElementById('habit-difficulty').value;
    addHabit(state, name, domain, difficulty);
    document.getElementById('habit-name').value = '';
    renderAll();
  });

  document.getElementById('habit-list').addEventListener('click', e => {
    if (e.target.matches('.habit-check')) {
      const willBeDone = e.target.checked;
      const domain = (state.habits.find(h => h.id === e.target.dataset.id) || {}).domain;
      toggleHabit(state, e.target.dataset.id);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      renderAll();
    } else if (e.target.matches('.del-habit')) {
      deleteHabit(state, e.target.dataset.id);
      renderAll();
    }
  });

  // 閱讀進度
  document.getElementById('book-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('book-title').value;
    const pages = document.getElementById('book-pages').value;
    addBook(state, title, pages);
    document.getElementById('book-title').value = '';
    document.getElementById('book-pages').value = '';
    renderAll();
  });

  document.getElementById('book-list').addEventListener('click', e => {
    if (e.target.matches('.log-page')) {
      const id = e.target.dataset.id;
      const input = document.querySelector(`.page-input[data-id="${id}"]`);
      const book = state.books.find(b => b.id === id);
      const beforePage = book ? book.currentPage : 0;
      const wasDone = book ? book.done : false;
      logPage(state, id, input.value);
      const after = state.books.find(b => b.id === id);
      if (after && after.currentPage > beforePage) {
        onTaskOrHabitComplete(state, 'reading');
        sound.playComplete();
      }
      if (after && after.done && !wasDone) onBookFinish(state, after.title);
      renderAll();
    } else if (e.target.matches('.del-book')) {
      deleteBook(state, e.target.dataset.id);
      renderAll();
    }
  });

  // 獎勵商店
  document.getElementById('reward-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('reward-name').value;
    const cost = document.getElementById('reward-cost').value;
    addReward(state, name, cost);
    document.getElementById('reward-name').value = '';
    document.getElementById('reward-cost').value = '';
    renderAll();
  });

  document.getElementById('reward-list').addEventListener('click', e => {
    if (e.target.matches('.redeem-reward')) {
      const reward = state.rewards.find(r => r.id === e.target.dataset.id);
      const ok = redeemReward(state, e.target.dataset.id);
      sound[ok ? 'playRedeem' : 'playError']();
      if (ok && reward) onRewardRedeem(state, reward.name);
      renderAll();
    } else if (e.target.matches('.del-reward')) {
      deleteReward(state, e.target.dataset.id);
      renderAll();
    }
  });

  // 行事曆
  document.getElementById('event-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('event-title').value;
    const domain = document.getElementById('event-domain').value;
    const type = document.getElementById('event-type').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    addEvent(state, title, domain, date, time, type);
    document.getElementById('event-title').value = '';
    document.getElementById('event-time').value = '';
    renderAll();
  });

  document.getElementById('cal-prev').addEventListener('click', () => { changeMonth(-1); renderCalendarTab(state); });
  document.getElementById('cal-next').addEventListener('click', () => { changeMonth(1); renderCalendarTab(state); });

  document.getElementById('calendar-grid').addEventListener('click', e => {
    const cell = e.target.closest('.cal-cell[data-date]');
    if (!cell) return;
    const date = cell.dataset.date;
    _selectedDay = (_selectedDay === date) ? null : date;
    renderCalendarTab(state);
  });

  document.getElementById('event-list').addEventListener('click', e => {
    if (e.target.matches('.event-check')) {
      const willBeDone = e.target.checked;
      const id = e.target.dataset.id;
      const kind = e.target.dataset.kind;
      let domain;
      if (kind === 'task') {
        domain = (state.tasks.find(t => t.id === id) || {}).domain;
        toggleTask(state, id);
      } else {
        domain = (state.events.find(ev => ev.id === id) || {}).domain;
        toggleEventDone(state, id);
      }
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      renderAll();
    } else if (e.target.matches('.del-event')) {
      const id = e.target.dataset.id;
      if (e.target.dataset.kind === 'task') deleteTask(state, id); else deleteEvent(state, id);
      renderAll();
    }
  });

  document.getElementById('gcal-save').addEventListener('click', () => {
    state.googleCalendar.clientId = document.getElementById('gcal-client-id').value.trim();
    _gcalTokenClient = null;
    saveState(state);
    renderGoogleStatus(state);
  });

  document.getElementById('gcal-connect').addEventListener('click', () => connectGoogle(state));

  document.getElementById('gcal-sync').addEventListener('click', async () => {
    const btn = document.getElementById('gcal-sync');
    if (!_gcalAccessToken) { alert('請先按「登入 Google」完成授權'); return; }
    btn.disabled = true;
    btn.textContent = '同步中…';
    const { success, total } = await syncAllToGoogle(state);
    btn.disabled = false;
    btn.textContent = '同步未上傳的項目';
    if (total === 0) {
      alert('目前沒有需要同步的新項目');
    } else {
      addLog(state, `同步 ${success}/${total} 個行事曆項目到 Google 日曆`);
      renderAll();
    }
  });
});
