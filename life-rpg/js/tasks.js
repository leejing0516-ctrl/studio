function renderTasks(state) {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  const items = getTodayItems(state);

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-hint">今天還沒有任務，新增一個開始賺 EXP 吧！</li>';
    return;
  }

  const pending = items.filter(it => !it.done);
  const done = items.filter(it => it.done);

  const renderItem = (it) => {
    const domain = DOMAINS.find(d => d.key === it.domain);
    const exp = it.kind === 'task' ? TASK_EXP[it.difficulty] : EVENT_EXP;
    const prefix = it.kind === 'event' ? (it.type === 'deadline' ? '⏰ ' : '📅 ') : '';
    return `
      <li class="task-item ${it.done ? 'done' : ''}">
        <label class="task-check">
          <input type="checkbox" ${it.done ? 'checked' : ''} data-id="${it.id}" data-kind="${it.kind}">
          <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
          <span class="task-text">${prefix}${escapeHtml(it.title)}</span>
          <span class="task-exp">+${exp} EXP</span>
        </label>
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

function addTask(state, text, domain, difficulty) {
  if (!text.trim()) return;
  state.tasks.push({
    id: 't' + Date.now() + Math.random().toString(36).slice(2, 7),
    domain, text: text.trim(), difficulty,
    date: todayStr(), done: false, googleEventId: null,
  });
}

function toggleTask(state, id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
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

function deleteTask(state, id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
}
