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
    date: t.date, time: t.time || '', done: t.done, googleEventId: t.googleEventId,
    difficulty: t.difficulty, exp: TASK_EXP[t.difficulty],
  }));
  const events = state.events.map(e => ({
    id: e.id, kind: 'event', title: e.title, domain: e.domain,
    date: e.date, time: e.time, done: e.done, googleEventId: e.googleEventId, type: e.type,
    exp: EVENT_EXP,
  }));
  const projectSubtasks = [];
  (state.projects || []).forEach(p => {
    p.subtasks.forEach(st => {
      projectSubtasks.push({
        id: st.id, kind: 'project', title: `${p.title}｜${st.title}`, domain: p.domain,
        date: st.dueDate, time: '', done: st.done, googleEventId: st.googleEventId,
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
        date: st.dueDate, time: '', done: st.done, googleEventId: st.googleEventId,
        exp: (st.endPage - st.startPage + 1) * EXP_PER_PAGE,
      });
    });
  });
  return tasks.concat(events, projectSubtasks, readingPlanItems);
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
  }
}

function getTodayItems(state) {
  const today = todayStr();
  return getCalendarItems(state).filter(it => {
    if (it.date === today) return true;
    // 專案子任務／閱讀計畫如果過期還沒完成，繼續留在「今日任務」直到完成為止，避免漏掉沒趕上的進度
    if ((it.kind === 'project' || it.kind === 'readingplan') && it.date < today && !it.done) return true;
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
  if (_selectedDay) {
    filterLabel.textContent = `📌 顯示 ${_selectedDay} 的項目（點同一天可取消篩選）`;
    filterLabel.style.display = 'block';
    items = items.filter(it => it.date === _selectedDay);
  } else {
    filterLabel.style.display = 'none';
  }

  items.sort((a, b) => (a.date + (a.time || '99:99')).localeCompare(b.date + (b.time || '99:99')));
  const today = todayStr();
  const pending = items.filter(it => !it.done);
  const done = items.filter(it => it.done);

  if (!items.length) {
    list.innerHTML = '<li class="empty-hint">還沒有安排任何任務、活動或截止日，新增一個吧！</li>';
    return;
  }

  const renderItem = (it) => {
    const d = DOMAINS.find(d => d.key === it.domain);
    const overdue = !it.done && it.date < today;
    const icon = it.kind === 'task' ? '📋' : it.kind === 'project' ? '🎯' : it.kind === 'readingplan' ? '📖' : (it.type === 'deadline' ? '⏰' : '📅');
    return `
      <li class="task-item ${it.done ? 'done' : ''} ${overdue ? 'overdue' : ''}" draggable="true" data-drag-id="${it.id}" data-drag-kind="${it.kind}" title="可拖曳到上方日曆的日期格子，改期">
        <label class="task-check">
          <input type="checkbox" ${it.done ? 'checked' : ''} data-id="${it.id}" data-kind="${it.kind}" class="event-check">
          <span class="task-tag" style="background:${d.color}">${d.icon} ${d.name}</span>
          <span class="event-date">${icon} ${it.date}${it.time ? ' ' + it.time : ''}</span>
          <span class="task-text">${escapeHtml(it.title)}</span>
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
  if (!status) return;
  status.textContent = _gcalAccessToken ? '✅ 已連接，可以同步' : '尚未連接';
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
