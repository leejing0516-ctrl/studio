let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth(); // 0-indexed
let _selectedDay = null;
let _gcalAccessToken = null;
let _gcalTokenClient = null;

function addEvent(state, title, domain, date, time, type) {
  if (!title.trim() || !date) return;
  state.events.push({
    id: 'e' + Date.now() + Math.random().toString(36).slice(2, 7),
    title: title.trim(), domain, date, time: time || '', type,
    done: false, googleEventId: null,
  });
}

function toggleEventDone(state, id) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  ev.done = !ev.done;
  ev.doneAt = ev.done ? Date.now() : null;
  const d = DOMAINS.find(d => d.key === ev.domain);
  if (ev.done) {
    gainExp(state, ev.domain, EVENT_EXP);
    addLog(state, `完成${ev.type === 'deadline' ? '截止事項' : '活動'}「${ev.title}」，${d.name} +${EVENT_EXP} EXP ／ +${goldFor(EVENT_EXP)} 金幣`);
  } else {
    gainExp(state, ev.domain, -EVENT_EXP);
  }
}

function updateEvent(state, id, fields) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;
  Object.assign(ev, fields);
}

function deleteEvent(state, id) {
  state.events = state.events.filter(e => e.id !== id);
}

/* ── 統一「任務 + 活動」的行事曆視圖 ───────────────────────────── */

function getCalendarItems(state) {
  const tasks = state.tasks.map(t => ({
    id: t.id, kind: 'task', title: t.text, domain: t.domain,
    date: t.date, time: t.time || '', done: t.done, doneAt: t.doneAt || null, googleEventId: t.googleEventId,
    difficulty: t.difficulty, exp: TASK_EXP[t.difficulty],
  }));
  const events = state.events.map(e => ({
    id: e.id, kind: 'event', title: e.title, domain: e.domain,
    date: e.date, time: e.time, done: e.done, doneAt: e.doneAt || null, googleEventId: e.googleEventId, type: e.type,
    exp: EVENT_EXP,
  }));
  const projectSubtasks = [];
  (state.projects || []).forEach(p => {
    p.subtasks.forEach(st => {
      projectSubtasks.push({
        id: st.id, kind: 'project', title: `${p.title}｜${st.title}`, domain: p.domain,
        date: st.dueDate, time: '', done: st.done, doneAt: st.doneAt || null, googleEventId: st.googleEventId,
        exp: PROJECT_SUBTASK_EXP,
      });
    });
  });
  const readingPlanItems = [];
  (state.books || []).forEach(b => {
    if (!b.readingPlan) return;
    b.readingPlan.subtasks.forEach(st => {
      readingPlanItems.push({
        id: st.id, kind: 'readingplan', title: `${b.title}｜${st.title}`, domain: 'reading',
        date: st.dueDate, time: '', done: st.done, doneAt: st.doneAt || null, googleEventId: st.googleEventId,
        exp: (st.endPage - st.startPage + 1) * EXP_PER_PAGE,
      });
    });
  });
  const storyChapters = [];
  (state.storyQuests || []).forEach(q => {
    q.chapters.forEach(ch => {
      storyChapters.push({
        id: ch.id, kind: 'story', title: `${q.title}｜${ch.taskTitle}`, domain: q.domain,
        date: ch.dueDate, time: '', done: ch.done, doneAt: ch.doneAt || null, googleEventId: null,
        exp: STORY_CHAPTER_EXP,
      });
    });
  });
  return tasks.concat(events, projectSubtasks, readingPlanItems, storyChapters);
}

// 拖曳任務/活動/專案子任務/閱讀計畫到日曆的某一天，直接改期
function moveCalendarItemDate(state, kind, id, newDate) {
  if (kind === 'task') {
    updateTask(state, id, { date: newDate });
  } else if (kind === 'event') {
    updateEvent(state, id, { date: newDate });
  } else if (kind === 'project') {
    updateSubtask(state, id, { dueDate: newDate });
  } else if (kind === 'readingplan') {
    updateReadingPlanItem(state, id, { dueDate: newDate });
  } else if (kind === 'story') {
    updateStoryChapter(state, id, { dueDate: newDate });
  }
}

function getTodayItems(state) {
  const today = todayStr();
  return getCalendarItems(state).filter(it => {
    if (it.date === today) return true;
    // 專案子任務／閱讀計畫／故事章節如果過期還沒完成，繼續留在「今日任務」直到完成為止，避免漏掉沒趕上的進度
    if ((it.kind === 'project' || it.kind === 'readingplan' || it.kind === 'story') && it.date < today && !it.done) return true;
    return false;
  });
}

function renderCalendarMonth(state) {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('calendar-month-label');
  if (!grid) return;
  label.textContent = `${_calYear} 年 ${MONTH_NAMES_ZH[_calMonth]}`;

  const firstDay = new Date(_calYear, _calMonth, 1);
  // 週一排最左邊：把原本「日=0」為起點的 getDay() 轉成「一=0」為起點
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
  const today = todayStr();

  const itemsByDay = {};
  getCalendarItems(state).forEach(it => {
    (itemsByDay[it.date] = itemsByDay[it.date] || []).push(it);
  });

  let html = WEEKDAY_NAMES_ZH.map((w, i) => `<div class="cal-weekday ${i >= 5 ? 'is-weekend' : ''}">${w}</div>`).join('');
  for (let i = 0; i < startWeekday; i++) html += '<div class="cal-cell empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${_calYear}-${String(_calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayItems = itemsByDay[dateStr] || [];
    const hasOverdue = dayItems.some(it => !it.done && dateStr < today);
    const weekday = (new Date(_calYear, _calMonth, d).getDay() + 6) % 7; // 0=一 ... 6=日
    const holiday = HOLIDAYS_TW[dateStr];
    const classes = ['cal-cell'];
    if (dateStr === today) classes.push('is-today');
    if (dateStr === _selectedDay) classes.push('is-selected');
    if (dayItems.length) classes.push('has-events');
    if (weekday >= 5) classes.push('is-weekend');
    if (holiday) classes.push('is-holiday');
    html += `
      <div class="${classes.join(' ')}" data-date="${dateStr}" ${holiday ? `title="${holiday}"` : ''}>
        <span class="cal-daynum">${d}</span>
        ${dayItems.length ? `<span class="cal-dot ${hasOverdue ? 'overdue' : ''}">${dayItems.length}</span>` : ''}
      </div>
    `;
  }
  grid.innerHTML = html;
}

function changeMonth(delta) {
  _calMonth += delta;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
}

function renderEventList(state) {
  const list = document.getElementById('event-list');
  const filterLabel = document.getElementById('event-filter-label');
  if (!list) return;

  let items = getCalendarItems(state);
  const today = todayStr();
  if (_selectedDay) {
    filterLabel.textContent = `📌 顯示 ${_selectedDay} 的項目（點同一天可取消篩選）`;
    filterLabel.style.display = 'block';
    items = items.filter(it => it.date === _selectedDay);
  } else {
    filterLabel.style.display = 'none';
    // 沒點選特定日期時，只顯示「今天的項目」跟「目前檢視月份中還沒完成的項目」，
    // 避免列表被其他月份、或已經完成的舊項目塞滿
    const monthKey = `${_calYear}-${String(_calMonth + 1).padStart(2, '0')}`;
    items = items.filter(it => it.date === today || (it.date.startsWith(monthKey) && !it.done));
  }

  items.sort((a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99')));
  const pending = items.filter(it => !it.done);
  const done = items.filter(it => it.done);

  if (!items.length) {
    list.innerHTML = '<li class="empty-hint">還沒有安排任何任務、活動或截止日，新增一個吧！</li>';
    return;
  }

  const renderItem = (it) => {
    const d = DOMAINS.find(d => d.key === it.domain);
    const overdue = !it.done && it.date < today;
    const icon = it.kind === 'task' ? '📋' : it.kind === 'project' ? '🎯' : it.kind === 'readingplan' ? '📖' : it.kind === 'story' ? '🗺️' : (it.type === 'deadline' ? '⏰' : '📅');
    return `
      <li class="task-item ${it.done ? 'done' : ''} ${overdue ? 'overdue' : ''}" draggable="true" data-drag-id="${it.id}" data-drag-kind="${it.kind}" title="可拖曳到上方日曆的日期格子，改期">
        <label class="task-check">
          <input type="checkbox" ${it.done ? 'checked' : ''} data-id="${it.id}" data-kind="${it.kind}" class="event-check">
          <span class="task-tag" style="background:${d.color}">${d.icon} ${d.name}</span>
          <span class="event-date">${icon} ${it.date}${it.time ? ' ' + it.time : ''}</span>
          <span class="task-text">${escapeHtml(it.title)}</span>
          ${it.done && it.doneAt ? `<span class="task-donetime">✅ ${formatTimeOfDay(it.doneAt)} 打卡</span>` : ''}
          ${it.googleEventId ? '<span class="gcal-badge" title="已同步到 Google 日曆">🔗</span>' : ''}
        </label>
        <button class="icon-btn edit-item" data-kind="${it.kind}" data-id="${it.id}" title="編輯">✎</button>
        <button class="icon-btn del-event" data-id="${it.id}" data-kind="${it.kind}" title="刪除">✕</button>
      </li>
    `;
  };

  list.innerHTML = pending.map(renderItem).join('') + done.map(renderItem).join('');
}

function renderCalendarTab(state) {
  renderCalendarMonth(state);
  renderEventList(state);
  renderGoogleStatus(state);
}

/* ── Google 日曆同步 ───────────────────────────── */

function renderGoogleStatus(state) {
  const input = document.getElementById('gcal-client-id');
  if (input && document.activeElement !== input) input.value = state.googleCalendar.clientId || '';
  const status = document.getElementById('gcal-status');
  if (status) status.textContent = _gcalAccessToken ? '✅ 已連接，可以同步' : '尚未連接';

  const lastSyncEl = document.getElementById('gcal-last-sync');
  if (lastSyncEl) {
    const t = state.googleCalendar.lastSyncAt;
    lastSyncEl.textContent = t
      ? `🕒 最新更新時間：${formatDateTimeZh(t)}`
      : '尚未同步過';
  }
}

// 把時間戳記格式化成「9/22 14:03」這種簡短好讀的中文格式
function formatDateTimeZh(ms) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 每天早上 5 點、下午 3 點各自動同步一次（上傳＋下載）。純前端沒有背景執行能力，
// 只有瀏覽器分頁開著、剛好經過這兩個時間點時才會觸發，開著也只會觸發一次，不會每次重整頁面都重來。
const AUTO_SYNC_HOURS = [5, 15];

function currentAutoSyncSlotKey() {
  const now = new Date();
  const passedHour = AUTO_SYNC_HOURS.filter(h => now.getHours() >= h).pop();
  if (passedHour === undefined) return null;
  return `${todayStr()}-${passedHour}`;
}

async function maybeAutoSyncGoogle(state) {
  if (!state.googleCalendar.clientId) return;
  const slotKey = currentAutoSyncSlotKey();
  if (!slotKey || state.googleCalendar.lastAutoSyncSlot === slotKey) return;

  if (!_gcalAccessToken) {
    // 嘗試安靜地重新取得授權（使用者之前同意過的話，瀏覽器通常不會再跳出視窗）；
    // 如果瀏覽器判斷需要使用者互動，這裡就會靜靜失敗，等使用者自己到「平台設定」按登入
    if (!initGoogleAuth(state)) return;
    const gotToken = await new Promise(resolve => {
      let settled = false;
      const finish = (ok) => { if (!settled) { settled = true; resolve(ok); } };
      const timeoutId = setTimeout(() => finish(false), 8000); // 靜默授權最多等 8 秒，避免 Google 沒回應就卡住
      _gcalTokenClient.callback = (resp) => {
        clearTimeout(timeoutId);
        if (resp && resp.access_token) { _gcalAccessToken = resp.access_token; finish(true); }
        else finish(false);
      };
      try {
        _gcalTokenClient.requestAccessToken({ prompt: '' });
      } catch (e) {
        clearTimeout(timeoutId);
        finish(false);
      }
    });
    if (!gotToken) return;
  }

  state.googleCalendar.lastAutoSyncSlot = slotKey;
  const { success, total } = await syncAllToGoogle(state);
  const { imported } = await importFromGoogle(state);
  state.googleCalendar.lastSyncAt = Date.now();
  saveState(state);
  if (total || imported) {
    addLog(state, `自動同步：上傳 ${success}/${total} 筆、匯入 ${imported} 筆 Google 日曆行程`);
  }
  renderAll();
}

function initGoogleAuth(state) {
  if (!window.google || !window.google.accounts || !state.googleCalendar.clientId) return false;
  _gcalTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: state.googleCalendar.clientId,
    scope: GCAL_SCOPE,
    callback: (resp) => {
      if (resp && resp.access_token) {
        _gcalAccessToken = resp.access_token;
        renderGoogleStatus(state);
      }
    },
  });
  return true;
}

function connectGoogle(state) {
  if (!state.googleCalendar.clientId) {
    alert('請先貼上你的 Google OAuth 用戶端 ID（說明在下方展開）');
    return;
  }
  if (!_gcalTokenClient && !initGoogleAuth(state)) {
    alert('Google 登入元件尚未載入，請稍後再試一次');
    return;
  }
  _gcalTokenClient.requestAccessToken();
}

async function postGoogleEvent(body) {
  if (!_gcalAccessToken) return null;
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${_gcalAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  } catch (e) {
    console.error('同步到 Google 日曆失敗', e);
    return null;
  }
}

async function syncEventToGoogle(ev) {
  const body = {
    summary: ev.title,
    description: ev.type === 'deadline' ? '截止日期（來自人生 RPG）' : '活動（來自人生 RPG）',
  };
  if (ev.time) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [h, m] = ev.time.split(':').map(Number);
    const endH = String((h + 1) % 24).padStart(2, '0');
    body.start = { dateTime: `${ev.date}T${ev.time}:00`, timeZone: tz };
    body.end = { dateTime: `${ev.date}T${endH}:${String(m).padStart(2, '0')}:00`, timeZone: tz };
  } else {
    body.start = { date: ev.date };
    body.end = { date: addDays(ev.date, 1) };
  }
  const id = await postGoogleEvent(body);
  if (id) { ev.googleEventId = id; return true; }
  return false;
}

async function syncTaskToGoogle(task) {
  const d = DOMAINS.find(d => d.key === task.domain);
  const body = {
    summary: task.text,
    description: `每日任務${d ? '（' + d.name + '）' : ''}（來自人生 RPG）`,
    start: { date: task.date },
    end: { date: addDays(task.date, 1) },
  };
  const id = await postGoogleEvent(body);
  if (id) { task.googleEventId = id; return true; }
  return false;
}

async function syncSubtaskToGoogle(project, subtask) {
  const body = {
    summary: `${project.title}｜${subtask.title}`,
    description: `專案子任務（來自人生 RPG）`,
    start: { date: subtask.dueDate },
    end: { date: addDays(subtask.dueDate, 1) },
  };
  const id = await postGoogleEvent(body);
  if (id) { subtask.googleEventId = id; return true; }
  return false;
}

async function syncReadingPlanItemToGoogle(book, subtask) {
  const body = {
    summary: `${book.title}｜${subtask.title}`,
    description: `閱讀計畫（來自人生 RPG）`,
    start: { date: subtask.dueDate },
    end: { date: addDays(subtask.dueDate, 1) },
  };
  const id = await postGoogleEvent(body);
  if (id) { subtask.googleEventId = id; return true; }
  return false;
}

// 蒐集目前 state 裡所有已經連結過的 googleEventId，避免匯入時重複
function collectKnownGoogleEventIds(state) {
  const ids = new Set();
  state.events.forEach(e => { if (e.googleEventId) ids.add(e.googleEventId); });
  state.tasks.forEach(t => { if (t.googleEventId) ids.add(t.googleEventId); });
  (state.projects || []).forEach(p => p.subtasks.forEach(st => { if (st.googleEventId) ids.add(st.googleEventId); }));
  (state.books || []).forEach(b => {
    if (b.readingPlan) b.readingPlan.subtasks.forEach(st => { if (st.googleEventId) ids.add(st.googleEventId); });
  });
  return ids;
}

// 把 Google 日曆的事件抓進來，變成這個 app 裡的「活動」
// 只抓從現在起 90 天內的事件，已經匯入過（或本來就是從這裡推上去）的不會重複匯入
async function importFromGoogle(state) {
  if (!_gcalAccessToken) return { imported: 0, error: 'not_connected' };

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 90 * 86400000).toISOString();
  const params = new URLSearchParams({
    timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
  });

  let items;
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { 'Authorization': `Bearer ${_gcalAccessToken}` },
    });
    if (!res.ok) return { imported: 0, error: 'request_failed' };
    const data = await res.json();
    items = data.items || [];
  } catch (e) {
    console.error('從 Google 日曆匯入失敗', e);
    return { imported: 0, error: 'request_failed' };
  }

  const known = collectKnownGoogleEventIds(state);
  let imported = 0;
  items.forEach(ev => {
    if (!ev.id || known.has(ev.id) || ev.status === 'cancelled') return;
    const start = ev.start || {};
    const date = start.date || (start.dateTime ? start.dateTime.slice(0, 10) : null);
    if (!date) return;
    const time = start.dateTime ? start.dateTime.slice(11, 16) : '';
    state.events.push({
      id: 'e' + Date.now() + Math.random().toString(36).slice(2, 7),
      title: ev.summary || '(無標題)',
      domain: 'social',
      date, time,
      type: 'event',
      done: false,
      googleEventId: ev.id,
    });
    known.add(ev.id);
    imported++;
  });

  return { imported, error: null };
}

async function syncAllToGoogle(state) {
  const pendingEvents = state.events.filter(e => !e.googleEventId);
  const pendingTasks = state.tasks.filter(t => !t.googleEventId);
  const pendingSubtasks = [];
  (state.projects || []).forEach(p => {
    p.subtasks.filter(st => !st.googleEventId).forEach(st => pendingSubtasks.push({ project: p, subtask: st }));
  });
  const pendingReadingItems = [];
  (state.books || []).forEach(b => {
    if (!b.readingPlan) return;
    b.readingPlan.subtasks.filter(st => !st.googleEventId).forEach(st => pendingReadingItems.push({ book: b, subtask: st }));
  });

  let success = 0;
  for (const ev of pendingEvents) {
    if (await syncEventToGoogle(ev)) success++;
  }
  for (const t of pendingTasks) {
    if (await syncTaskToGoogle(t)) success++;
  }
  for (const { project, subtask } of pendingSubtasks) {
    if (await syncSubtaskToGoogle(project, subtask)) success++;
  }
  for (const { book, subtask } of pendingReadingItems) {
    if (await syncReadingPlanItemToGoogle(book, subtask)) success++;
  }
  return { success, total: pendingEvents.length + pendingTasks.length + pendingSubtasks.length + pendingReadingItems.length };
}
