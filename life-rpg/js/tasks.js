// 把「今日任務、到期活動/截止日、今天該做的習慣、閱讀、專案子任務」統一成一份今日清單
function getTodayChecklist(state) {
  const today = todayStr();
  const calItems = getTodayItems(state); // 今日任務 + 到期活動/截止日

  const habitDone = state.habitCompletions[today] || {};
  const habitItems = getDueHabitsToday(state).map(h => ({
    id: h.id, kind: 'habit', title: h.name, domain: h.domain,
    done: !!habitDone[h.id], difficulty: h.difficulty, streak: h.streak || 0,
  }));

  const readingDone = state.readingCompletions[today] || {};
  const readingItems = state.books.filter(b => !b.done).map(b => ({
    id: b.id, kind: 'reading', title: `閱讀《${b.title}》`, domain: 'reading',
    done: !!readingDone[b.id],
  }));

  const projectItems = [];
  (state.projects || []).forEach(p => {
    p.subtasks.filter(st => st.dueDate === today).forEach(st => {
      projectItems.push({
        id: st.id, kind: 'project', title: `${p.title}｜${st.title}`, domain: p.domain, done: st.done,
      });
    });
  });

  return calItems.concat(habitItems, readingItems, projectItems);
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
    let exp, prefix, extra = '';
    if (it.kind === 'task') {
      exp = TASK_EXP[it.difficulty]; prefix = '';
    } else if (it.kind === 'event') {
      exp = EVENT_EXP; prefix = it.type === 'deadline' ? '⏰ ' : '📅 ';
    } else if (it.kind === 'habit') {
      exp = TASK_EXP[it.difficulty]; prefix = '🔁 ';
      extra = `<span class="habit-streak">連續 ${it.streak} 天</span>`;
    } else if (it.kind === 'reading') {
      exp = READING_CHECKIN_EXP; prefix = '📖 ';
    } else if (it.kind === 'project') {
      exp = PROJECT_SUBTASK_EXP; prefix = '🎯 ';
    }
    const canEdit = it.kind !== 'reading';
    return `
      <li class="task-item ${it.done ? 'done' : ''}">
        <label class="task-check">
          <input type="checkbox" ${it.done ? 'checked' : ''} data-id="${it.id}" data-kind="${it.kind}">
          <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
          <span class="task-text">${prefix}${escapeHtml(it.title)}</span>
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

function updateTask(state, id, fields) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  Object.assign(t, fields);
}

function deleteTask(state, id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
}
