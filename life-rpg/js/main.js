let state = loadState();
runDailyCheckIn(state);
checkBudgetBonuses(state);

// 專案／故事裡如果有過期還沒完成的進度，今天第一次遇到時問一次要不要整批順延到今天。
// 不管使用者選是或否，都記下「今天已經問過」，同一天不會再重複打擾。
function checkPostponePrompts(state) {
  const today = todayStr();
  let changed = false;

  (state.projects || []).forEach(p => {
    if (p.lastPostponePromptDate === today) return;
    const overdueCount = p.subtasks.filter(st => !st.done && st.dueDate < today).length;
    if (!overdueCount) return;
    p.lastPostponePromptDate = today;
    changed = true;
    const shouldPostpone = confirm(`專案「${p.title}」有 ${overdueCount} 個過期還沒完成的進度，要幫你把還沒完成的部分整批順延嗎？`);
    if (shouldPostpone) postponeProject(state, p.id);
  });

  (state.storyQuests || []).forEach(q => {
    if (q.lastPostponePromptDate === today) return;
    const overdueCount = q.chapters.filter(ch => !ch.done && ch.dueDate < today).length;
    if (!overdueCount) return;
    q.lastPostponePromptDate = today;
    changed = true;
    const shouldPostpone = confirm(`故事「${q.title}」有 ${overdueCount} 個過期還沒完成的進度，要幫你把還沒完成的部分整批順延嗎？`);
    if (shouldPostpone) postponeStoryQuest(state, q.id);
  });

  return changed;
}

// 第一次畫面渲染只是把已載入的資料畫出來，不算「使用者做了新的變更」，
// 所以先不要 saveState（避免蓋掉 updatedAt，讓雲端同步的新舊比較失真）
let _skipNextSave = true;

function renderAll() {
  renderCharacter(state);
  renderHome(state);
  renderTasks(state);
  renderBooks(state);
  renderHabits(state);
  renderRewards(state);
  renderAchievements(state);
  renderLog(state);
  renderAssistantWidget(state);
  renderAssistantLog(state);
  renderAssistantSettings(state);
  renderCalendarTab(state);
  renderProjects(state);
  renderStoryTab(state);
  renderFinance(state);
  if (_skipNextSave) { _skipNextSave = false; } else { saveState(state); }

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
  el.innerHTML = state.log.slice(0, 10).map(l => `<li>${l.date}${l.time ? ' ' + formatTimeOfDay(l.time) : ''}｜${escapeHtml(l.text)}</li>`).join('');
}

// 今日任務打勾完成時的小慶祝：背景閃一下金光，並跳出一個 +EXP 泡泡飄走
function celebrateTaskComplete(li, expText) {
  if (!li) return;
  li.classList.add('task-complete-flash');
  const popup = document.createElement('span');
  popup.className = 'task-complete-popup';
  popup.textContent = expText || '✨ 完成！';
  li.appendChild(popup);
}

// 新增任務時的小儀式：背景閃一下淡紫光，並跳出一個提示泡泡飄走
function celebrateTaskAdded(li) {
  if (!li) return;
  li.classList.add('task-added-flash');
  const popup = document.createElement('span');
  popup.className = 'task-added-popup';
  popup.textContent = '✨ 新任務！';
  li.appendChild(popup);
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

function showStorageError() {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.maxWidth = '300px';
  toast.innerHTML = `<span class="toast-icon">⚠️</span><div><div class="toast-title">儲存失敗</div><div class="toast-name" style="font-size:12.5px; font-weight:500;">目前這個瀏覽視窗好像無法儲存資料（例如無痕/隱私模式），建議改用一般視窗開啟，不然改的東西會不見</div></div>`;
  document.getElementById('toast-container').appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 8000);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  // 同一個分頁可能同時有「主要導覽」跟「冒險選單」裡的按鈕，兩個都要標記成選取狀態
  document.querySelectorAll(`.tab-btn[data-tab="${tabId}"]`).forEach(b => b.classList.add('active'));
  document.getElementById('adventure-menu').classList.remove('show');
  document.getElementById('adventure-menu-toggle').setAttribute('aria-expanded', 'false');
}

function initSoundOnce() {
  sound.init();
  document.removeEventListener('click', initSoundOnce);
}

// 幫每個「畫框」面板加上四角裝飾星芒，模仿遊戲角色卡的金邊框樣式
function decorateFrames() {
  document.querySelectorAll('.frame').forEach(el => {
    if (el.querySelector('.frame-corner')) return;
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
      const span = document.createElement('span');
      span.className = 'frame-corner corner-' + pos;
      span.textContent = '✦';
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
    });
  });
}

// 時間選擇改用「時」「分」兩個下拉選單，分鐘固定 10 分鐘一格，
// 避免瀏覽器原生 <input type="time"> 的分鐘捲輪不吃 step 屬性
function populateTimeSelect(prefix) {
  const hourEl = document.getElementById(prefix + '-hour');
  const minuteEl = document.getElementById(prefix + '-minute');
  if (!hourEl || !minuteEl) return;
  hourEl.innerHTML = '<option value="">--</option>' +
    Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
      .map(h => `<option value="${h}">${h}</option>`).join('');
  minuteEl.innerHTML = '<option value="">--</option>' +
    ['00', '10', '20', '30', '40', '50']
      .map(m => `<option value="${m}">${m}</option>`).join('');
}

function getTimeValue(prefix) {
  const h = document.getElementById(prefix + '-hour').value;
  const m = document.getElementById(prefix + '-minute').value;
  return (h && m) ? `${h}:${m}` : '';
}

function setTimeValue(prefix, timeStr) {
  const hourEl = document.getElementById(prefix + '-hour');
  const minuteEl = document.getElementById(prefix + '-minute');
  if (!timeStr) { hourEl.value = ''; minuteEl.value = ''; return; }
  const [h, m] = timeStr.split(':');
  hourEl.value = h;
  const snapped = Math.round(Number(m) / 10) * 10;
  minuteEl.value = String(snapped >= 60 ? 0 : snapped).padStart(2, '0');
}

let _editTarget = null;

function openEditModal(kind, id) {
  const titleEl = document.getElementById('edit-title');
  const domainEl = document.getElementById('edit-domain');
  const diffEl = document.getElementById('edit-difficulty');
  const typeEl = document.getElementById('edit-type');
  const dateEl = document.getElementById('edit-date');
  const timeEl = document.getElementById('edit-time');
  [domainEl, diffEl, typeEl, dateEl, timeEl].forEach(el => el.style.display = 'none');

  if (kind === 'task') {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    titleEl.value = t.text;
    domainEl.style.display = ''; domainEl.value = t.domain;
    diffEl.style.display = ''; diffEl.value = t.difficulty;
    timeEl.style.display = ''; setTimeValue('edit-time', t.time || '');
  } else if (kind === 'event') {
    const ev = state.events.find(e => e.id === id);
    if (!ev) return;
    titleEl.value = ev.title;
    domainEl.style.display = ''; domainEl.value = ev.domain;
    typeEl.style.display = ''; typeEl.value = ev.type;
    dateEl.style.display = ''; dateEl.value = ev.date;
    timeEl.style.display = ''; setTimeValue('edit-time', ev.time || '');
  } else if (kind === 'habit') {
    const h = state.habits.find(h => h.id === id);
    if (!h) return;
    titleEl.value = h.name;
    domainEl.style.display = ''; domainEl.value = h.domain;
    diffEl.style.display = ''; diffEl.value = h.difficulty;
  } else if (kind === 'project') {
    const found = findSubtask(state, id);
    if (!found) return;
    titleEl.value = found.subtask.title;
    dateEl.style.display = ''; dateEl.value = found.subtask.dueDate;
  } else if (kind === 'readingplan') {
    const found = findReadingPlanItem(state, id);
    if (!found) return;
    titleEl.value = found.subtask.title;
    dateEl.style.display = ''; dateEl.value = found.subtask.dueDate;
  } else if (kind === 'story') {
    const found = findStoryChapter(state, id);
    if (!found) return;
    titleEl.value = found.chapter.taskTitle;
    dateEl.style.display = ''; dateEl.value = found.chapter.dueDate;
  } else {
    return;
  }

  _editTarget = { kind, id };
  document.getElementById('edit-modal').classList.add('show');
  titleEl.focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('show');
  _editTarget = null;
}

function saveEditModal() {
  if (!_editTarget) return;
  const { kind, id } = _editTarget;
  const title = document.getElementById('edit-title').value.trim();
  if (!title) return;

  if (kind === 'task') {
    updateTask(state, id, {
      text: title,
      domain: document.getElementById('edit-domain').value,
      difficulty: document.getElementById('edit-difficulty').value,
      time: getTimeValue('edit-time'),
    });
  } else if (kind === 'event') {
    updateEvent(state, id, {
      title,
      domain: document.getElementById('edit-domain').value,
      type: document.getElementById('edit-type').value,
      date: document.getElementById('edit-date').value,
      time: getTimeValue('edit-time'),
    });
  } else if (kind === 'habit') {
    updateHabit(state, id, {
      name: title,
      domain: document.getElementById('edit-domain').value,
      difficulty: document.getElementById('edit-difficulty').value,
    });
  } else if (kind === 'project') {
    updateSubtask(state, id, {
      title,
      dueDate: document.getElementById('edit-date').value,
    });
  } else if (kind === 'readingplan') {
    updateReadingPlanItem(state, id, {
      title,
      dueDate: document.getElementById('edit-date').value,
    });
  } else if (kind === 'story') {
    updateStoryChapter(state, id, {
      taskTitle: title,
      dueDate: document.getElementById('edit-date').value,
    });
  }
  closeEditModal();
  sound.playClick();
  renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', initSoundOnce, { once: true });
  decorateFrames();

  ['task-domain', 'habit-domain', 'event-domain', 'project-domain', 'story-domain', 'edit-domain'].forEach(id => {
    const select = document.getElementById(id);
    DOMAINS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.key;
      opt.textContent = `${d.icon} ${d.name}`;
      select.appendChild(opt);
    });
  });

  const habitFreqSelect = document.getElementById('habit-freq');
  HABIT_FREQ_OPTIONS.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    habitFreqSelect.appendChild(opt);
  });

  const weekdayPicker = document.getElementById('habit-weekday-picker');
  weekdayPicker.innerHTML = WEEKDAY_NAMES_ZH.map((w, i) => `
    <label class="weekday-chip"><input type="checkbox" value="${i}" ${i === new Date().getDay() ? 'checked' : ''}>週${w}</label>
  `).join('');
  habitFreqSelect.addEventListener('change', () => {
    const needsWeekday = habitFreqSelect.value === 'weekly' || habitFreqSelect.value === 'biweekly';
    weekdayPicker.style.display = needsWeekday ? 'flex' : 'none';
  });

  const granularitySelect = document.getElementById('project-granularity');
  PROJECT_GRANULARITY_OPTIONS.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    granularitySelect.appendChild(opt);
  });

  const expenseCategorySelect = document.getElementById('expense-category');
  EXPENSE_CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    expenseCategorySelect.appendChild(opt);
  });

  ['task-time', 'event-time', 'edit-time'].forEach(populateTimeSelect);

  document.getElementById('event-date').value = todayStr();
  document.getElementById('project-start').value = todayStr();
  document.getElementById('gcal-origin-hint').textContent = location.origin;

  const muteBtn = document.getElementById('mute-btn');
  muteBtn.textContent = sound.muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', () => {
    muteBtn.textContent = sound.toggleMute() ? '🔇' : '🔊';
  });

  initCloud();
  const cloudBtn = document.getElementById('cloud-btn');
  const cloudPanel = document.getElementById('cloud-panel');
  cloudBtn.addEventListener('click', () => cloudPanel.classList.toggle('show'));

  document.getElementById('cloud-signup').addEventListener('click', async () => {
    const email = document.getElementById('cloud-email').value.trim();
    const password = document.getElementById('cloud-password').value;
    if (!email || password.length < 6) { showCloudError('請輸入信箱，密碼至少 6 碼'); return; }
    const btn = document.getElementById('cloud-signup');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '註冊中…';
    await cloudSignUp(email, password);
    btn.disabled = false;
    btn.textContent = originalText;
  });

  document.getElementById('cloud-signin').addEventListener('click', async () => {
    const email = document.getElementById('cloud-email').value.trim();
    const password = document.getElementById('cloud-password').value;
    if (!email || !password) { showCloudError('請輸入信箱與密碼'); return; }
    const btn = document.getElementById('cloud-signin');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '登入中…';
    await cloudSignIn(email, password);
    btn.disabled = false;
    btn.textContent = originalText;
  });

  document.getElementById('cloud-signout').addEventListener('click', cloudSignOut);

  document.getElementById('cloud-forgot').addEventListener('click', () => {
    const email = document.getElementById('cloud-email').value.trim();
    cloudResetPassword(email);
  });

  renderAll();

  // 晚上十點後打開 app 時，如果今天還沒做過總結，補上一則（見 assistant.js）
  checkDailySummary(state).then(changed => { if (changed) renderAll(); });

  // 專案／故事如果有過期還沒完成的進度，今天第一次看到時問一次要不要整批順延
  if (checkPostponePrompts(state)) renderAll();

  document.addEventListener('click', e => {
    const editBtn = e.target.closest('.edit-item');
    if (editBtn) openEditModal(editBtn.dataset.kind, editBtn.dataset.id);
  });
  document.getElementById('edit-save').addEventListener('click', saveEditModal);
  document.getElementById('edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target.id === 'edit-modal') closeEditModal();
  });

  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 冒險選單開合（桌面版下拉面板／手機版下方選單）
  document.getElementById('adventure-menu-toggle').addEventListener('click', () => {
    const menu = document.getElementById('adventure-menu');
    const willShow = !menu.classList.contains('show');
    menu.classList.toggle('show', willShow);
    document.getElementById('adventure-menu-toggle').setAttribute('aria-expanded', String(willShow));
  });

  // 首頁
  document.getElementById('tab-home').addEventListener('click', e => {
    if (e.target.matches('.primary-task-complete-btn')) {
      const kind = e.target.dataset.kind;
      const id = e.target.dataset.id;
      const { willBeDone, domain } = completeChecklistItem(state, kind, id);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      if (kind === 'story' && willBeDone) maybeCompileStory(state, id);
      if (willBeDone) {
        const card = e.target.closest('.primary-task-card');
        const expEl = card && card.querySelector('.task-exp');
        celebrateTaskComplete(card, expEl ? expEl.textContent : '✨ 完成！');
        _homePrimaryTaskIndex = 0;
        setTimeout(renderAll, 550);
      } else {
        renderAll();
      }
    } else if (e.target.id === 'home-cycle-task-btn') {
      cyclePrimaryTask(state);
      renderHomePrimaryTask(state);
    } else if (e.target.id === 'home-view-all-tasks-btn') {
      switchTab('tab-tasks');
    } else if (e.target.id === 'home-add-task-btn') {
      switchTab('tab-tasks');
      document.getElementById('task-text').focus();
    } else if (e.target.id === 'home-suggest-task-btn') {
      addAssistantMessage(state, buildDailySuggestion(state), 'suggestion');
      sound.playClick();
      renderAll();
      switchTab('tab-assistant');
    } else if (e.target.matches('.home-project-continue-btn')) {
      const id = e.target.dataset.id;
      const found = findSubtask(state, id);
      const domain = found ? found.project.domain : undefined;
      toggleProjectSubtask(state, id);
      sound.playComplete();
      if (domain) onTaskOrHabitComplete(state, domain);
      renderAll();
    } else if (e.target.id === 'home-view-all-projects-btn') {
      switchTab('tab-projects');
    } else if (e.target.id === 'home-create-project-btn') {
      switchTab('tab-projects');
      document.getElementById('project-title').focus();
    } else if (e.target.matches('.home-habit-check')) {
      const id = e.target.dataset.id;
      const domain = (state.habits.find(h => h.id === id) || {}).domain;
      toggleHabit(state, id);
      sound.playComplete();
      if (domain) onTaskOrHabitComplete(state, domain);
      renderAll();
    } else if (e.target.id === 'home-view-all-habits-btn') {
      switchTab('tab-habits');
    } else if (e.target.matches('.home-coach-action-btn')) {
      const type = e.target.dataset.actionType;
      const tab = e.target.dataset.actionTab;
      const id = e.target.dataset.actionId;
      if (type === 'switch-tab') {
        switchTab(tab);
      } else if (type === 'complete-habit') {
        const domain = (state.habits.find(h => h.id === id) || {}).domain;
        toggleHabit(state, id);
        sound.playComplete();
        if (domain) onTaskOrHabitComplete(state, domain);
        renderAll();
      } else if (type === 'add-task') {
        switchTab('tab-tasks');
        document.getElementById('task-text').focus();
      }
    }
  });

  // 用 input（每次按鍵）而不是 change（要失焦才觸發），避免在手機上快速切換分頁
  // 導致存檔前來不及觸發、改的名字又跳回去
  document.getElementById('char-name').addEventListener('input', e => {
    state.character.name = e.target.value;
    saveState(state);
  });
  document.getElementById('char-name').addEventListener('blur', e => {
    if (!e.target.value.trim()) {
      state.character.name = '我的角色';
      renderAll();
    }
  });

  ['title', 'age', 'traits', 'bio'].forEach(field => {
    const el = document.getElementById('char-' + field);
    el.addEventListener('input', e => {
      state.character[field] = e.target.value;
      saveState(state);
      renderCharacter(state); // 只重繪角色資訊卡，不用整頁 renderAll() 避免打字時卡頓
    });
  });

  document.getElementById('avatar-edit-card').addEventListener('click', () => {
    document.getElementById('avatar-upload').click();
  });

  document.getElementById('avatar-upload').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    processAvatarFile(file, dataUrl => {
      state.character.avatar = dataUrl;
      sound.playClick();
      renderAll();
    }, msg => {
      sound.playError();
      alert(
        `大頭貼上傳失敗：${msg}\n\n` +
        `如果是用 iPhone 選相簿裡的照片，可能是 HEIC 格式瀏覽器無法讀取。\n` +
        `可以試試看：先截圖這張照片（截圖一定是 PNG），再上傳截圖；\n` +
        `或到「設定」→「相機」→「格式」改成「最相容」，之後拍的照片就會是可用的 JPG 格式。`
      );
    });
    e.target.value = '';
  });

  document.getElementById('assistant-shuffle').addEventListener('click', () => {
    addAssistantMessage(state, buildDailySuggestion(state), 'suggestion');
    sound.playClick();
    renderAll();
  });

  document.getElementById('mood-picker-toggle').addEventListener('click', () => {
    document.getElementById('mood-buttons').classList.toggle('show');
  });

  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      onMoodCheckin(state, btn.dataset.mood);
      sound.playClick();
      renderAll();
      switchTab('tab-assistant');
      document.getElementById('mood-buttons').classList.remove('show');
    });
  });

  document.getElementById('assistant-chat-form').addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('assistant-chat-input');
    const message = input.value.trim();
    if (!message) return;
    saveAssistantSettings(state); // 避免使用者填好教練設定卻忘記按「儲存設定」，送出訊息時先幫忙存一次
    if (!state.assistant.aiEnabled || !state.assistant.aiEndpoint) {
      alert('請先在上方「⚙️ 教練設定」啟用 AI 並填好服務網址，才能跟教練對話喔');
      return;
    }
    addAssistantMessage(state, message, 'user');
    input.value = '';
    const btn = document.getElementById('assistant-chat-send');
    btn.disabled = true;
    btn.textContent = '思考中…';
    renderAll();
    try {
      const reply = await callAssistantAI(state, message);
      addAssistantMessage(state, reply, 'chat');
    } catch (err) {
      addAssistantMessage(state, '（教練暫時沒辦法回應：' + err.message + '）', 'tip');
    }
    btn.disabled = false;
    btn.textContent = '傳送';
    renderAll();
  });

  document.getElementById('assistant-style').addEventListener('change', e => {
    document.getElementById('assistant-custom-style').style.display = (e.target.value === 'custom') ? '' : 'none';
  });

  document.getElementById('assistant-settings-save').addEventListener('click', () => {
    saveAssistantSettings(state);
    sound.playClick();
    renderAll();
  });

  document.getElementById('assistant-summary-now').addEventListener('click', async () => {
    const btn = document.getElementById('assistant-summary-now');
    saveAssistantSettings(state); // 同樣避免使用者忘記先按「儲存設定」
    btn.disabled = true;
    btn.textContent = '產生中…';
    try {
      await generateDailySummaryNow(state);
    } catch (err) {
      alert(err.message);
    }
    btn.disabled = false;
    btn.textContent = '🌙 立即產生今日總結';
    renderAll();
  });

  // 今日任務
  document.getElementById('task-form').addEventListener('submit', e => {
    e.preventDefault();
    const text = document.getElementById('task-text').value;
    const domain = document.getElementById('task-domain').value;
    const difficulty = document.getElementById('task-difficulty').value;
    const time = getTimeValue('task-time');
    const newTask = addTask(state, text, domain, difficulty, time);
    document.getElementById('task-text').value = '';
    setTimeValue('task-time', '');
    sound.playAdd();
    renderAll();
    if (newTask) {
      const checkbox = document.querySelector(`#task-list input[data-kind="task"][data-id="${newTask.id}"]`);
      celebrateTaskAdded(checkbox && checkbox.closest('.task-item'));
    }
  });

  document.getElementById('task-list').addEventListener('click', e => {
    if (e.target.matches('input[type="checkbox"]')) {
      const id = e.target.dataset.id;
      const kind = e.target.dataset.kind;
      const { willBeDone, domain } = completeChecklistItem(state, kind, id);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      if (kind === 'story' && willBeDone) maybeCompileStory(state, id);
      if (willBeDone) {
        const li = e.target.closest('.task-item');
        const expEl = li && li.querySelector('.task-exp');
        celebrateTaskComplete(li, expEl ? expEl.textContent : '✨ 完成！');
        setTimeout(renderAll, 550); // 讓慶祝動畫播完，任務再排到已完成區
      } else {
        renderAll();
      }
    } else if (e.target.matches('.del-task')) {
      const id = e.target.dataset.id;
      const kind = e.target.dataset.kind;
      if (kind === 'event') deleteEvent(state, id);
      else if (kind === 'habit') deleteHabit(state, id);
      else if (kind === 'reading') deleteBook(state, id);
      else if (kind === 'project') deleteSubtaskItem(state, id);
      else if (kind === 'readingplan') deleteReadingPlanItem(state, id);
      else if (kind === 'story') deleteStoryChapter(state, id);
      else deleteTask(state, id);
      renderAll();
    }
  });

  // 習慣
  document.getElementById('habit-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('habit-name').value;
    const domain = document.getElementById('habit-domain').value;
    const difficulty = document.getElementById('habit-difficulty').value;
    const freq = document.getElementById('habit-freq').value;
    const weekdays = Array.from(document.querySelectorAll('#habit-weekday-picker input:checked')).map(cb => Number(cb.value));
    addHabit(state, name, domain, difficulty, { freq, weekdays });
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
    } else if (e.target.matches('.gen-reading-plan')) {
      const id = e.target.dataset.id;
      const startDate = document.querySelector(`.plan-start[data-id="${id}"]`).value || todayStr();
      const deadline = document.querySelector(`.plan-deadline[data-id="${id}"]`).value;
      const granularity = document.querySelector(`.plan-granularity[data-id="${id}"]`).value;
      if (!deadline) { alert('請先選擇目標完成日期'); return; }
      addReadingPlan(state, id, startDate, deadline, granularity);
      const after = state.books.find(b => b.id === id).readingPlan;
      if (!after) { alert('截止日期必須在開始日期之後，且還有剩餘頁數'); return; }
      sound.playComplete();
      renderAll();
    } else if (e.target.matches('.reading-plan-toggle')) {
      const id = e.target.dataset.id;
      if (_expandedReadingPlans.has(id)) _expandedReadingPlans.delete(id); else _expandedReadingPlans.add(id);
      renderBooks(state);
    } else if (e.target.matches('.readingplan-check')) {
      const willBeDone = e.target.checked;
      toggleReadingPlanItem(state, e.target.dataset.subtask);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone) onTaskOrHabitComplete(state, 'reading');
      renderAll();
    } else if (e.target.matches('.del-readingplan')) {
      deleteReadingPlanItem(state, e.target.dataset.id);
      renderAll();
    }
  });

  // 消費/財務
  document.getElementById('budget-save').addEventListener('click', () => {
    const weekly = document.getElementById('budget-weekly').value;
    const monthly = document.getElementById('budget-monthly').value;
    saveBudget(state, weekly, monthly);
    sound.playClick();
    renderAll();
  });

  document.getElementById('expense-form').addEventListener('submit', e => {
    e.preventDefault();
    const amount = document.getElementById('expense-amount').value;
    const category = document.getElementById('expense-category').value;
    const note = document.getElementById('expense-note').value;
    addExpense(state, amount, category, note);
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-note').value = '';
    sound.playComplete();
    onTaskOrHabitComplete(state, 'finance');
    renderAll();
  });

  document.getElementById('expense-list').addEventListener('click', e => {
    if (e.target.matches('.del-expense')) {
      deleteExpense(state, e.target.dataset.id);
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
    const time = getTimeValue('event-time');
    addEvent(state, title, domain, date, time, type);
    document.getElementById('event-title').value = '';
    setTimeValue('event-time', '');
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
    if (_selectedDay) {
      // 點選日期時順便把新增表單的日期填好，方便快速新增當天的活動/截止日
      document.getElementById('event-date').value = _selectedDay;
      document.getElementById('event-title').focus();
    }
  });

  // 拖曳任務/活動到日曆格子改期
  document.getElementById('event-list').addEventListener('dragstart', e => {
    const item = e.target.closest('[data-drag-id]');
    if (!item) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.dataset.dragId, kind: item.dataset.dragKind }));
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('dragging');
  });
  document.getElementById('event-list').addEventListener('dragend', e => {
    const item = e.target.closest('[data-drag-id]');
    if (item) item.classList.remove('dragging');
  });

  const calGrid = document.getElementById('calendar-grid');
  calGrid.addEventListener('dragover', e => {
    const cell = e.target.closest('.cal-cell[data-date]');
    if (!cell) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    cell.classList.add('drag-over');
  });
  calGrid.addEventListener('dragleave', e => {
    const cell = e.target.closest('.cal-cell[data-date]');
    if (cell) cell.classList.remove('drag-over');
  });
  calGrid.addEventListener('drop', e => {
    const cell = e.target.closest('.cal-cell[data-date]');
    if (!cell) return;
    e.preventDefault();
    cell.classList.remove('drag-over');
    let payload;
    try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (!payload || !payload.id) return;
    moveCalendarItemDate(state, payload.kind, payload.id, cell.dataset.date);
    sound.playClick();
    renderAll();
  });

  document.getElementById('event-list').addEventListener('click', e => {
    if (e.target.matches('.event-check')) {
      const id = e.target.dataset.id;
      const kind = e.target.dataset.kind;
      const { willBeDone, domain } = completeChecklistItem(state, kind, id);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      if (kind === 'story' && willBeDone) maybeCompileStory(state, id);
      renderAll();
    } else if (e.target.matches('.del-event')) {
      const id = e.target.dataset.id;
      const kind = e.target.dataset.kind;
      if (kind === 'task') deleteTask(state, id);
      else if (kind === 'project') deleteSubtaskItem(state, id);
      else if (kind === 'readingplan') deleteReadingPlanItem(state, id);
      else if (kind === 'story') deleteStoryChapter(state, id);
      else deleteEvent(state, id);
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

  // 專案
  document.getElementById('project-form').addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('project-title').value;
    const domain = document.getElementById('project-domain').value;
    const startDate = document.getElementById('project-start').value || todayStr();
    const deadline = document.getElementById('project-deadline').value;
    const granularity = document.getElementById('project-granularity').value;
    if (!title.trim() || !deadline || parseDateStr(deadline) <= parseDateStr(startDate)) {
      alert('請輸入目標，且截止日期必須在開始日期之後');
      return;
    }
    previewProject(title, domain, startDate, deadline, granularity);
    sound.playClick();
    renderProjects(state);
  });

  document.getElementById('project-preview').addEventListener('click', e => {
    if (e.target.matches('#preview-confirm')) {
      confirmPendingProject(state);
      document.getElementById('project-title').value = '';
      document.getElementById('project-deadline').value = '';
      document.getElementById('project-start').value = todayStr();
      sound.playComplete();
      renderAll();
    } else if (e.target.matches('#preview-regenerate')) {
      regeneratePendingProject();
      sound.playClick();
      renderProjects(state);
    } else if (e.target.matches('#preview-cancel')) {
      cancelPendingProject();
      renderProjects(state);
    } else if (e.target.matches('.preview-del-subtask')) {
      removePendingSubtask(e.target.dataset.id);
      renderProjects(state);
    }
  });

  document.getElementById('project-list').addEventListener('click', e => {
    if (e.target.matches('.subtask-check')) {
      const willBeDone = e.target.checked;
      const id = e.target.dataset.subtask;
      const found = findSubtask(state, id);
      const domain = found ? found.project.domain : undefined;
      toggleProjectSubtask(state, id);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      renderAll();
    } else if (e.target.matches('.del-project')) {
      deleteProject(state, e.target.dataset.id);
      renderAll();
    } else if (e.target.matches('.project-toggle')) {
      const id = e.target.dataset.id;
      if (_expandedProjects.has(id)) _expandedProjects.delete(id); else _expandedProjects.add(id);
      renderProjects(state);
    }
  });

  // 故事模式
  document.getElementById('story-form').addEventListener('submit', async e => {
    e.preventDefault();
    const descEl = document.getElementById('story-description');
    const description = descEl.value.trim();
    const domain = document.getElementById('story-domain').value;
    if (!description) { alert('請先描述一下你正在經歷的困境或想突破的課題'); return; }
    saveAssistantSettings(state); // 避免使用者在教練設定填好網址卻忘記按「儲存設定」
    if (!state.assistant.aiEndpoint) {
      alert('故事模式需要 AI 才能理解你的故事，請先到「教練對話」分頁的教練設定啟用 AI 並填寫服務網址');
      return;
    }
    const btn = document.getElementById('story-generate-btn');
    btn.disabled = true;
    btn.textContent = '教練構思故事中…';
    try {
      await generateStoryPreview(state, description, domain);
      renderStoryTab(state);
    } catch (err) {
      alert(err.message);
    }
    btn.disabled = false;
    btn.textContent = '📜 生成故事';
  });

  document.getElementById('story-preview').addEventListener('click', async e => {
    if (e.target.matches('#story-preview-confirm')) {
      confirmPendingStory(state);
      document.getElementById('story-description').value = '';
      sound.playComplete();
      renderAll();
    } else if (e.target.matches('#story-preview-regenerate')) {
      const btn = e.target;
      btn.disabled = true;
      btn.textContent = '重新構思中…';
      try {
        await regeneratePendingStory(state);
      } catch (err) {
        alert(err.message);
      }
      btn.disabled = false;
      btn.textContent = '🔄 重新生成';
      renderStoryTab(state);
    } else if (e.target.matches('#story-preview-cancel')) {
      cancelPendingStory();
      renderStoryTab(state);
    } else if (e.target.matches('.preview-del-chapter')) {
      removePendingChapter(e.target.dataset.id);
      renderStoryTab(state);
    }
  });

  document.getElementById('story-list').addEventListener('click', e => {
    if (e.target.matches('.story-chapter-check')) {
      const willBeDone = e.target.checked;
      const id = e.target.dataset.id;
      const found = findStoryChapter(state, id);
      const domain = found ? found.quest.domain : undefined;
      toggleStoryChapter(state, id);
      sound[willBeDone ? 'playComplete' : 'playClick']();
      if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
      renderAll();
      maybeCompileStory(state, id);
    } else if (e.target.matches('.del-story')) {
      deleteStoryQuest(state, e.target.dataset.id);
      renderAll();
    } else if (e.target.matches('.story-recompile')) {
      regenerateCompiledStory(state, e.target.dataset.id);
    }
  });

  // 故事章節的個人書寫：離開輸入框時自動存檔（不用另外按儲存）
  document.getElementById('story-list').addEventListener('focusout', e => {
    if (!e.target.matches('.story-journal-input')) return;
    updateStoryChapter(state, e.target.dataset.id, { journal: e.target.value });
    saveState(state);
  });

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

  document.getElementById('gcal-import').addEventListener('click', async () => {
    const btn = document.getElementById('gcal-import');
    if (!_gcalAccessToken) { alert('請先按「登入 Google」完成授權'); return; }
    btn.disabled = true;
    btn.textContent = '匯入中…';
    const { imported, error } = await importFromGoogle(state);
    btn.disabled = false;
    btn.textContent = '從 Google 匯入行程';
    if (error) {
      alert('從 Google 日曆匯入失敗，請稍後再試一次');
    } else if (imported === 0) {
      alert('未來 90 天內沒有新的 Google 日曆行程可以匯入');
    } else {
      addLog(state, `從 Google 日曆匯入 ${imported} 筆行程`);
      renderAll();
    }
  });
});
