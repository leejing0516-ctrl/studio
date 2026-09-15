// 把「今日任務、到期活動/截止日、專案子任務、閱讀計畫、今天該做的習慣、簡易閱讀打卡」統一成一份今日清單
function getTodayChecklist(state) {
  const today = todayStr();
  const calItems = getTodayItems(state); // 今日任務 + 到期活動/截止日 + 到期專案子任務 + 到期閱讀計畫

  const habitDone = state.habitCompletions[today] || {};
  const habitItems = getDueHabitsToday(state).map(h => ({
    id: h.id, kind: 'habit', title: h.name, domain: h.domain,
    done: !!habitDone[h.id], doneAt: habitDone[h.id] || null, difficulty: h.difficulty, streak: h.streak || 0,
  }));

  // 只有「沒有閱讀計畫」的書才用簡易打卡；有計畫的書由 calItems 提供當天的閱讀進度項目
  const readingDone = state.readingCompletions[today] || {};
  const readingItems = state.books.filter(b => !b.done && !b.readingPlan).map(b => ({
    id: b.id, kind: 'reading', title: `閱讀《${b.title}》`, domain: 'reading',
    done: !!readingDone[b.id], doneAt: readingDone[b.id] || null,
  }));

  const items = calItems.concat(habitItems, readingItems);
  // 依時間由早到晚排序，沒設定時間的排在最後（保留原本相對順序）
  items.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  return items;
}

function renderTasks(state) {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  const items = getTodayChecklist(state);

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-hint">今天還沒有任務，新增一個開始賺 EXP 吧！</li>';
    return;
  }

  const pending = items.filter(it => !it.done);
  const done = items.filter(it => it.done);

  const renderItem = (it) => {
    const domain = DOMAINS.find(d => d.key === it.domain);
    let prefix = '', extra = '';
    if (it.kind === 'event') prefix = it.type === 'deadline' ? '⏰ ' : '📅 ';
    else if (it.kind === 'habit') { prefix = '🔁 '; extra = `<span class="habit-streak">連續 ${it.streak} 天</span>`; }
    else if (it.kind === 'reading') prefix = '📖 ';
    else if (it.kind === 'project') prefix = '🎯 ';
    else if (it.kind === 'readingplan') prefix = '📖 ';
    else if (it.kind === 'story') prefix = '🗺️ ';
    const exp = it.exp !== undefined ? it.exp : (it.kind === 'habit' ? TASK_EXP[it.difficulty] : READING_CHECKIN_EXP);
    const canEdit = it.kind !== 'reading';
    const isOverdue = (it.kind === 'project' || it.kind === 'readingplan' || it.kind === 'story') && it.date < todayStr() && !it.done;
    return `
      <li class="task-item ${it.done ? 'done' : ''}">
        <label class="task-check">
          <input type="checkbox" ${it.done ? 'checked' : ''} data-id="${it.id}" data-kind="${it.kind}">
          <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
          <span class="task-text">${prefix}${escapeHtml(it.title)}</span>
          ${isOverdue ? `<span class="task-overdue">已過期 ${it.date}</span>` : ''}
          ${it.time ? `<span class="task-time">🕐 ${it.time}</span>` : ''}
          ${it.done && it.doneAt ? `<span class="task-donetime">✅ ${formatTimeOfDay(it.doneAt)} 打卡</span>` : ''}
          ${extra}
          <span class="task-exp">+${exp} EXP</span>
        </label>
        ${canEdit ? `<button class="icon-btn edit-item" data-kind="${it.kind}" data-id="${it.id}" title="編輯">✎</button>` : ''}
        <button class="icon-btn del-task" data-id="${it.id}" data-kind="${it.kind}" title="刪除">✕</button>
      </li>
    `;
  };

  list.innerHTML = pending.map(renderItem).join('') + done.map(renderItem).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function addTask(state, text, domain, difficulty, time) {
  if (!text.trim()) return;
  state.tasks.push({
    id: 't' + Date.now() + Math.random().toString(36).slice(2, 7),
    domain, text: text.trim(), difficulty, time: time || '',
    date: todayStr(), done: false, googleEventId: null,
  });
}

function toggleTask(state, id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  t.doneAt = t.done ? Date.now() : null;
  const exp = TASK_EXP[t.difficulty];
  if (t.done) {
    gainExp(state, t.domain, exp);
    state.stats.tasksCompleted += 1;
    const d = DOMAINS.find(d => d.key === t.domain);
    addLog(state, `完成任務「${t.text}」，${d.name} +${exp} EXP ／ +${goldFor(exp)} 金幣`);
  } else {
    gainExp(state, t.domain, -exp);
    state.stats.tasksCompleted = Math.max(0, state.stats.tasksCompleted - 1);
  }
}

function updateTask(state, id, fields) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  Object.assign(t, fields);
}

function deleteTask(state, id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
}
