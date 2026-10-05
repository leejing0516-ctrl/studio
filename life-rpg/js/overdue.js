// 逾期清單：把「過了日期卻沒勾選完成」的事集中在一個地方，可以補勾（有做但當天忘了勾）、改到今天或刪除。
// 專案子任務／閱讀計畫／故事章節過期的進度本來就會自動留在今日任務，所以不重複列在這裡。
const OVERDUE_HABIT_DAYS = 30; // 習慣最多往回補登幾天

function getMissedHabitDays(state) {
  const today = todayStr();
  const result = [];
  state.habits.forEach(h => {
    const start = (h.recurrence && h.recurrence.startDate) || today;
    const dates = [];
    const d = new Date();
    for (let i = 1; i <= OVERDUE_HABIT_DAYS; i++) {
      d.setDate(d.getDate() - 1);
      const ds = formatDate(d);
      if (ds < start) break;
      if (habitDueToday(h, ds) && !(state.habitCompletions[ds] || {})[h.id]) dates.push(ds);
    }
    if (dates.length) result.push({ habit: h, dates: dates.reverse() }); // 由舊到新
  });
  return result;
}

function getOverdueItems(state) {
  const today = todayStr();
  return getCalendarItems(state)
    .filter(it => (it.kind === 'task' || it.kind === 'event') && !it.done && it.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getOverdueCount(state) {
  return getMissedHabitDays(state).reduce((n, g) => n + g.dates.length, 0) + getOverdueItems(state).length;
}

// 補登某個習慣在過去某一天已完成：寫入打卡紀錄、給 EXP，並重新計算連續天數
function backfillHabit(state, habitId, dateStr) {
  const h = state.habits.find(x => x.id === habitId);
  if (!h) return false;
  const map = state.habitCompletions[dateStr] = state.habitCompletions[dateStr] || {};
  if (map[habitId]) return false;
  map[habitId] = Date.now(); // 用現在的時間戳，跨裝置同步時才會被視為新的打卡
  const exp = TASK_EXP[h.difficulty];
  gainExp(state, h.domain, exp);
  h.streak = computeHabitStreak(state, h);
  if (!h.lastDoneDate || dateStr > h.lastDoneDate) h.lastDoneDate = dateStr;
  const d = DOMAINS.find(x => x.key === h.domain);
  addLog(state, `補登習慣「${h.name}」${dateStr} 已完成，${d.name} +${exp} EXP ／ +${goldFor(exp)} 金幣（連續 ${h.streak} 天）`);
  return true;
}

function formatMonthDayWeekday(dateStr) {
  const d = parseDateStr(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAY_NAMES_ZH[(d.getDay() + 6) % 7]}）`;
}

function renderOverdue(state) {
  const list = document.getElementById('overdue-list');
  const count = getOverdueCount(state);
  const badge = document.getElementById('overdue-count');
  if (badge) badge.textContent = count ? ` (${count})` : '';
  document.querySelectorAll('.menu-item-btn[data-tab="tab-overdue"]').forEach(b => b.classList.toggle('has-alert', count > 0));
  if (!list) return;

  const missed = getMissedHabitDays(state);
  const items = getOverdueItems(state);
  if (!missed.length && !items.length) {
    list.innerHTML = '<p class="empty-hint">🎉 沒有逾期或漏勾的項目，全部都搞定了！</p>';
    return;
  }

  const habitHtml = missed.map(({ habit, dates }) => {
    const d = DOMAINS.find(x => x.key === habit.domain) || DOMAINS[0];
    return `
      <div class="overdue-group">
        <div class="overdue-group-head">
          <span class="task-tag" style="background:${d.color}">${d.icon} ${d.name}</span>
          <strong class="overdue-group-title">${escapeHtml(habit.name)}</strong>
          <span class="tab-hint" style="margin:0">漏勾 ${dates.length} 天</span>
          <button type="button" class="btn small" data-od="habit-all" data-id="${habit.id}">全部補勾</button>
        </div>
        <ul class="overdue-ul">${dates.map(ds => `
          <li class="task-item">
            <label class="task-check">
              <input type="checkbox" data-od="habit-one" data-id="${habit.id}" data-date="${ds}">
              <span class="event-date">🔁 ${formatMonthDayWeekday(ds)}</span>
              <span class="task-text">${escapeHtml(habit.name)}</span>
              <span class="task-exp">+${TASK_EXP[habit.difficulty]} EXP</span>
            </label>
          </li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  const itemHtml = items.length ? `
    <div class="overdue-group">
      <div class="overdue-group-head"><strong class="overdue-group-title">📋 逾期的任務／活動</strong></div>
      <ul class="overdue-ul">${items.map(it => {
        const d = DOMAINS.find(x => x.key === it.domain) || DOMAINS[0];
        const icon = it.kind === 'task' ? '📋' : (it.type === 'deadline' ? '⏰' : '📅');
        return `
          <li class="task-item overdue">
            <label class="task-check">
              <input type="checkbox" data-od="item-done" data-kind="${it.kind}" data-id="${it.id}">
              <span class="task-tag" style="background:${d.color}">${d.icon} ${d.name}</span>
              <span class="event-date">${icon} ${formatMonthDayWeekday(it.date)}${it.time ? ' ' + it.time : ''}</span>
              <span class="task-text">${escapeHtml(it.title)}</span>
            </label>
            <button type="button" class="btn small" data-od="item-today" data-kind="${it.kind}" data-id="${it.id}" title="改成今天做">移到今天</button>
            <button type="button" class="icon-btn" data-od="item-del" data-kind="${it.kind}" data-id="${it.id}" title="刪除">✕</button>
          </li>`;
      }).join('')}</ul>
    </div>` : '';

  list.innerHTML = habitHtml + itemHtml;
}

function handleOverdueClick(e) {
  const el = e.target.closest('[data-od]');
  if (!el) return;
  const act = el.dataset.od, id = el.dataset.id;
  if (act === 'habit-one') {
    if (!el.checked) return;
    backfillHabit(state, id, el.dataset.date);
    sound.playComplete();
  } else if (act === 'habit-all') {
    const group = getMissedHabitDays(state).find(g => g.habit.id === id);
    if (!group) return;
    if (!confirm(`確定要把「${group.habit.name}」漏勾的 ${group.dates.length} 天都標記為已完成嗎？（會獲得對應的 EXP）`)) return;
    group.dates.forEach(ds => backfillHabit(state, id, ds));
    sound.playComplete();
  } else if (act === 'item-done') {
    if (!el.checked) return;
    const { willBeDone, domain } = completeChecklistItem(state, el.dataset.kind, id);
    sound[willBeDone ? 'playComplete' : 'playClick']();
    if (willBeDone && domain) onTaskOrHabitComplete(state, domain);
  } else if (act === 'item-today') {
    moveCalendarItemDate(state, el.dataset.kind, id, todayStr());
    sound.playClick();
  } else if (act === 'item-del') {
    if (el.dataset.kind === 'task') deleteTask(state, id); else deleteEvent(state, id);
  } else {
    return;
  }
  renderAll();
}

document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('overdue-list');
  if (list) list.addEventListener('click', handleOverdueClick);
});
