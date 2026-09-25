function todaysCompletions(state) {
  const today = todayStr();
  if (!state.habitCompletions[today]) state.habitCompletions[today] = {};
  return state.habitCompletions[today];
}

// 連續天數直接從打卡歷史往回算，不靠累加欄位（累加欄位在跨裝置同步或漏存時容易歸零）；
// 沒排定的日子跳過不中斷，排定了卻沒打卡就中斷（今天還沒打不算中斷）
function computeHabitStreak(state, habit) {
  const today = todayStr();
  const d = parseDateStr(today);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const ds = formatDate(d);
    if ((state.habitCompletions[ds] || {})[habit.id]) streak++;
    else if (ds !== today && habitDueToday(habit, ds)) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getDueHabitsToday(state) {
  const today = todayStr();
  return state.habits.filter(h => habitDueToday(h, today));
}

function renderHabits(state) {
  const list = document.getElementById('habit-list');
  list.innerHTML = '';

  if (state.habits.length === 0) {
    list.innerHTML = '<li class="empty-hint">還沒有設定任何習慣，新增一個開始養成吧！</li>';
    return;
  }

  const doneMap = todaysCompletions(state);
  const today = todayStr();
  state.habits.forEach(h => {
    const domain = DOMAINS.find(d => d.key === h.domain);
    const done = !!doneMap[h.id];
    const dueToday = habitDueToday(h, today);
    const li = document.createElement('li');
    li.className = 'task-item' + (done ? ' done' : '') + (dueToday ? '' : ' not-due');
    li.innerHTML = `
      <label class="task-check">
        <input type="checkbox" ${done ? 'checked' : ''} data-id="${h.id}" class="habit-check">
        <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
        <span class="task-text">${escapeHtml(h.name)}</span>
        <span class="habit-freq">🔁 ${describeRecurrence(h.recurrence)}</span>
        <span class="habit-streak">連續 ${computeHabitStreak(state, h)} 天</span>
        <span class="task-exp">+${TASK_EXP[h.difficulty]} EXP</span>
        ${dueToday ? '' : '<span class="not-due-tag">今天沒排定</span>'}
      </label>
      <button class="icon-btn edit-item" data-kind="habit" data-id="${h.id}" title="編輯">✎</button>
      <button class="icon-btn del-habit" data-id="${h.id}" title="刪除">✕</button>
    `;
    list.appendChild(li);
  });
}

function addHabit(state, name, domain, difficulty, recurrence) {
  if (!name.trim()) return;
  state.habits.push({
    id: 'h' + Date.now() + Math.random().toString(36).slice(2, 7),
    name: name.trim(), domain, difficulty, streak: 0, lastDoneDate: null,
    recurrence: Object.assign({ startDate: todayStr() }, recurrence),
  });
}

function toggleHabit(state, id) {
  const h = state.habits.find(h => h.id === id);
  if (!h) return;
  const doneMap = todaysCompletions(state);
  const today = todayStr();
  const exp = TASK_EXP[h.difficulty];

  if (!doneMap[h.id]) {
    doneMap[h.id] = Date.now();
    gainExp(state, h.domain, exp);
    h.streak = computeHabitStreak(state, h);
    h.lastDoneDate = today;
    const d = DOMAINS.find(d => d.key === h.domain);
    addLog(state, `完成習慣「${h.name}」，${d.name} +${exp} EXP ／ +${goldFor(exp)} 金幣（連續 ${h.streak} 天）`);
  } else {
    delete doneMap[h.id];
    gainExp(state, h.domain, -exp);
    h.streak = computeHabitStreak(state, h);
    if (h.streak === 0) h.lastDoneDate = null;
  }
}

function updateHabit(state, id, fields) {
  const h = state.habits.find(h => h.id === id);
  if (!h) return;
  Object.assign(h, fields);
}

function deleteHabit(state, id) {
  state.habits = state.habits.filter(h => h.id !== id);
}
