function renderTasks(state) {
  const today = todayStr();
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  const todays = state.tasks.filter(t => t.date === today);

  if (todays.length === 0) {
    list.innerHTML = '<li class="empty-hint">今天還沒有任務，新增一個開始賺 EXP 吧！</li>';
    return;
  }

  todays.forEach(t => {
    const domain = DOMAINS.find(d => d.key === t.domain);
    const li = document.createElement('li');
    li.className = 'task-item' + (t.done ? ' done' : '');
    li.innerHTML = `
      <label class="task-check">
        <input type="checkbox" ${t.done ? 'checked' : ''} data-id="${t.id}">
        <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
        <span class="task-text">${escapeHtml(t.text)}</span>
        <span class="task-exp">+${TASK_EXP[t.difficulty]} EXP</span>
      </label>
      <button class="icon-btn del-task" data-id="${t.id}" title="刪除">✕</button>
    `;
    list.appendChild(li);
  });
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
    date: todayStr(), done: false,
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
