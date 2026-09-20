// 首頁：把「今天最重要的事」濃縮成看一眼就懂的幾個區塊。
// 這裡完全不建立新的資料邏輯，全部讀既有的任務/專案/習慣/教練函式，只是換一種呈現方式。

let _homePrimaryTaskIndex = 0;

/* ── 共用：勾選完成/取消完成，今日任務清單跟首頁主線任務卡共用同一份判斷邏輯 ── */
function completeChecklistItem(state, kind, id) {
  let domain;
  if (kind === 'event') {
    domain = (state.events.find(ev => ev.id === id) || {}).domain;
    toggleEventDone(state, id);
  } else if (kind === 'habit') {
    domain = (state.habits.find(h => h.id === id) || {}).domain;
    toggleHabit(state, id);
  } else if (kind === 'reading') {
    domain = 'reading';
    toggleReadingCheckin(state, id);
  } else if (kind === 'project') {
    const found = findSubtask(state, id);
    domain = found ? found.project.domain : undefined;
    toggleProjectSubtask(state, id);
  } else if (kind === 'readingplan') {
    domain = 'reading';
    toggleReadingPlanItem(state, id);
  } else if (kind === 'story') {
    const found = findStoryChapter(state, id);
    domain = found ? found.quest.domain : undefined;
    toggleStoryChapter(state, id);
  } else {
    domain = (state.tasks.find(t => t.id === id) || {}).domain;
    toggleTask(state, id);
  }

  let willBeDone = false;
  const today = todayStr();
  if (kind === 'event') willBeDone = !!(state.events.find(e => e.id === id) || {}).done;
  else if (kind === 'habit') willBeDone = !!(state.habitCompletions[today] || {})[id];
  else if (kind === 'reading') willBeDone = !!(state.readingCompletions[today] || {})[id];
  else if (kind === 'project') { const f = findSubtask(state, id); willBeDone = !!(f && f.subtask.done); }
  else if (kind === 'readingplan') { const f = findReadingPlanItem(state, id); willBeDone = !!(f && f.subtask.done); }
  else if (kind === 'story') { const f = findStoryChapter(state, id); willBeDone = !!(f && f.chapter.done); }
  else willBeDone = !!(state.tasks.find(t => t.id === id) || {}).done;

  return { willBeDone, domain };
}

/* ── 今日主線任務：從今日清單裡挑一項最該優先做的 ── */
function pickPrimaryTaskCandidates(state) {
  const today = todayStr();
  const items = getTodayChecklist(state).filter(it => !it.done);
  const score = (it) => {
    if (it.date && it.date < today) return 0; // 已超過期限但尚未完成
    if (it.time) return 1; // 今天有指定時間
    if (it.kind === 'project') return 2; // 重要專案產生的子任務
    if (it.difficulty === 'hard') return 3; // 困難度較高
    return 4; // 其他一般任務
  };
  return items
    .map(it => ({ it, s: score(it) }))
    .sort((a, b) => a.s - b.s || (a.it.time || '99:99').localeCompare(b.it.time || '99:99'))
    .map(x => x.it);
}

function cyclePrimaryTask(state) {
  const candidates = pickPrimaryTaskCandidates(state);
  if (!candidates.length) return;
  _homePrimaryTaskIndex = (_homePrimaryTaskIndex + 1) % candidates.length;
}

/* ── 重要專案：只自動排序（截止日最近／有逾期子任務／最近有進度），暫不支援手動釘選 ── */
function pickPrimaryProject(state) {
  const today = todayStr();
  const active = (state.projects || []).filter(p => p.subtasks.length && !p.subtasks.every(s => s.done));
  if (!active.length) return null;
  const hasOverdue = p => p.subtasks.some(s => !s.done && s.dueDate < today);
  const lastProgress = p => p.subtasks.reduce((max, s) => (s.doneAt && s.doneAt > max ? s.doneAt : max), 0);
  return active.slice().sort((a, b) => {
    if (a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
    const ao = hasOverdue(a), bo = hasOverdue(b);
    if (ao !== bo) return ao ? -1 : 1;
    return lastProgress(b) - lastProgress(a);
  })[0];
}

/* ── 教練的一句行動建議：優先看逾期任務／即將到期專案／未完成習慣／今日狀態 ── */
function buildHomeCoachTip(state) {
  const today = todayStr();

  // 只看「今日任務」真的會顯示的逾期項目（專案/閱讀計畫/故事章節），
  // 一般任務/活動逾期後不會自動排進今天，教練也不該叫使用者去今日任務裡找一個不在那裡的項目
  const overdue = getCalendarItems(state).filter(it =>
    !it.done && it.date < today && (it.kind === 'project' || it.kind === 'readingplan' || it.kind === 'story'));
  if (overdue.length) {
    return {
      text: `「${overdue[0].title}」已經過期了，要不要先處理這一件？`,
      actionLabel: '開始這項任務', actionType: 'switch-tab', actionTab: 'tab-tasks',
    };
  }

  const project = pickPrimaryProject(state);
  if (project) {
    const daysLeft = daysBetween(today, project.deadline);
    const next = project.subtasks.find(s => !s.done);
    if (next && daysLeft <= 7) {
      return {
        text: `專案「${project.title}」快到期了，下一步是「${next.title}」。`,
        actionLabel: '繼續專案', actionType: 'switch-tab', actionTab: 'tab-projects',
      };
    }
  }

  const doneMap = state.habitCompletions[today] || {};
  const undoneHabits = getDueHabitsToday(state).filter(h => !doneMap[h.id]);
  if (undoneHabits.length) {
    const easiest = undoneHabits.slice().sort((a, b) => (a.difficulty === 'easy' ? -1 : 1) - (b.difficulty === 'easy' ? -1 : 1))[0];
    return {
      text: `今天的習慣「${easiest.name}」還沒打卡，先完成這個最容易的吧！`,
      actionLabel: '完成這個習慣', actionType: 'complete-habit', actionId: easiest.id,
    };
  }

  const candidates = pickPrimaryTaskCandidates(state);
  if (!candidates.length) {
    const scheduledToday = getTodayChecklist(state).length;
    if (scheduledToday > 0) {
      return {
        text: '今天該做的都做了，辛苦了！休息一下，或回顧一下今天的收穫吧。',
        actionLabel: '和教練聊聊', actionType: 'switch-tab', actionTab: 'tab-assistant',
      };
    }
    return {
      text: '今天還沒有安排任何任務，要不要先新增一個小冒險？',
      actionLabel: '新增今日任務', actionType: 'add-task',
    };
  }

  if (candidates.length === 1) {
    return {
      text: `今天還有「${candidates[0].title}」還沒完成，先從這件開始吧！`,
      actionLabel: '查看主線任務', actionType: 'switch-tab', actionTab: 'tab-tasks',
    };
  }
  return {
    text: `今天還有 ${candidates.length} 件事等著你，先挑主線任務那一項開始吧！`,
    actionLabel: '查看主線任務', actionType: 'switch-tab', actionTab: 'tab-tasks',
  };
}

/* ── 各區塊渲染 ── */
function renderHomePrimaryTask(state) {
  const el = document.getElementById('home-primary-task');
  if (!el) return;
  const candidates = pickPrimaryTaskCandidates(state);

  if (!candidates.length) {
    el.innerHTML = `
      <div class="home-card-title">🎯 今日主線任務</div>
      <p class="empty-hint">今天還沒有主線任務，為自己安排一場小冒險吧！</p>
      <div class="home-card-actions">
        <button type="button" class="btn" id="home-add-task-btn">新增今日任務</button>
        <button type="button" class="btn small" id="home-suggest-task-btn">讓教練推薦一項任務</button>
      </div>
    `;
    return;
  }

  _homePrimaryTaskIndex = _homePrimaryTaskIndex % candidates.length;
  const it = candidates[_homePrimaryTaskIndex];
  const domain = DOMAINS.find(d => d.key === it.domain);
  const exp = it.exp !== undefined ? it.exp : (it.kind === 'habit' ? TASK_EXP[it.difficulty] : READING_CHECKIN_EXP);
  const gold = goldFor(exp);
  const info = overallLevelInfo(state);
  const remain = info.expToNext - info.expIntoLevel;
  const willLevelUp = exp >= remain;
  const isOverdue = it.date && it.date < todayStr();

  el.innerHTML = `
    <div class="home-card-title">🎯 今日主線任務</div>
    <div class="primary-task-body">
      <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
      ${isOverdue ? '<span class="task-overdue">已過期</span>' : ''}
      <h3 class="primary-task-name">${escapeHtml(it.title)}</h3>
      <div class="primary-task-meta">
        ${it.time ? `<span class="task-time">🕐 ${it.time}</span>` : ''}
        <span class="task-exp">+${exp} EXP</span>
        <span class="task-gold">💰 +${gold}</span>
      </div>
      ${willLevelUp ? '<div class="primary-task-levelup-hint">✨ 完成這項任務即可升級！</div>' : ''}
    </div>
    <div class="home-card-actions">
      <button type="button" class="btn primary-task-complete-btn" data-kind="${it.kind}" data-id="${it.id}">完成任務</button>
      <button type="button" class="btn small" id="home-cycle-task-btn">換一項</button>
      <button type="button" class="btn small" id="home-view-all-tasks-btn">查看今日全部任務</button>
    </div>
  `;
}

function renderHomeProject(state) {
  const el = document.getElementById('home-primary-project');
  if (!el) return;
  const p = pickPrimaryProject(state);

  if (!p) {
    el.innerHTML = `
      <div class="home-card-title">🎯 重要專案</div>
      <p class="empty-hint">有一個想完成的大目標嗎？把它交給教練拆成可以行動的小任務。</p>
      <div class="home-card-actions">
        <button type="button" class="btn small" id="home-create-project-btn">建立第一個專案</button>
      </div>
    `;
    return;
  }

  const domain = DOMAINS.find(d => d.key === p.domain);
  const doneCount = p.subtasks.filter(s => s.done).length;
  const total = p.subtasks.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const next = p.subtasks.find(s => !s.done);

  el.innerHTML = `
    <div class="home-card-title">🎯 重要專案</div>
    <div class="home-project-header">
      <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
      <span class="project-title">${escapeHtml(p.title)}</span>
    </div>
    <div class="project-deadline">截止日：${p.deadline}</div>
    <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:${domain.color}"></div></div>
    <p class="tab-hint" style="margin:6px 0;">${doneCount} / ${total} 完成（${pct}%）</p>
    ${next ? `<p class="home-project-next">下一步：${escapeHtml(next.title)}</p>` : ''}
    <div class="home-card-actions">
      ${next ? `<button type="button" class="btn small home-project-continue-btn" data-id="${next.id}">繼續專案</button>` : ''}
      <button type="button" class="btn small" id="home-view-all-projects-btn">查看全部專案</button>
    </div>
  `;
}

function renderHomeHabits(state) {
  const el = document.getElementById('home-habit-progress');
  if (!el) return;
  const today = todayStr();
  const doneMap = state.habitCompletions[today] || {};
  const due = getDueHabitsToday(state);
  const total = due.length;

  if (!total) {
    el.innerHTML = `<div class="home-card-title">🔁 今日習慣</div><p class="empty-hint">今天沒有排定的習慣。</p>`;
    return;
  }

  const doneCount = due.filter(h => doneMap[h.id]).length;
  const pct = Math.round((doneCount / total) * 100);
  const undone = due.filter(h => !doneMap[h.id]).slice(0, 3);

  el.innerHTML = `
    <div class="home-card-title">🔁 今日習慣 ${doneCount} / ${total}</div>
    <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:var(--purple)"></div></div>
    ${doneCount === total
      ? '<p class="home-habit-alldone">🎉 今日習慣全部完成！</p>'
      : `<ul class="home-habit-list">${undone.map(h => {
          const domain = DOMAINS.find(d => d.key === h.domain);
          return `
            <li class="task-item home-habit-item">
              <label class="task-check">
                <input type="checkbox" class="home-habit-check" data-id="${h.id}">
                <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
                <span class="task-text">${escapeHtml(h.name)}</span>
              </label>
            </li>
          `;
        }).join('')}</ul>`}
    <div class="home-card-actions">
      <button type="button" class="btn small" id="home-view-all-habits-btn">查看全部習慣</button>
    </div>
  `;
}

function renderHomeCoachTip(state) {
  const el = document.getElementById('home-coach-tip');
  if (!el) return;
  const tip = buildHomeCoachTip(state);
  const meta = COACH_PERSONA_META[state.assistant.style] || COACH_PERSONA_META.warm;

  el.innerHTML = `
    <div class="home-card-title">${escapeHtml(meta.name)}的建議</div>
    <div class="home-coach-tip-row">
      <img class="home-coach-avatar" src="${meta.avatar}" alt="">
      <p class="home-coach-text">${escapeHtml(tip.text)}</p>
    </div>
    <div class="home-card-actions">
      <button type="button" class="btn small home-coach-action-btn"
        data-action-type="${tip.actionType}" data-action-tab="${tip.actionTab || ''}" data-action-id="${tip.actionId || ''}">
        ${escapeHtml(tip.actionLabel)}
      </button>
    </div>
  `;
}

function renderHomeDomains(state) {
  const el = document.getElementById('home-domains');
  if (!el) return;
  el.innerHTML = `
    <div class="home-card-title">🧭 五大領域總覽</div>
    <div class="domain-hex-row">
      ${DOMAINS.map(d => {
        const info = levelFromExp(state.skills[d.key].exp);
        return `
          <div class="domain-hex-item">
            <img class="domain-hex" src="${d.badge}" alt="${d.name}">
            <div class="domain-hex-level">Lv.${info.level}</div>
            <div class="domain-hex-name">${d.name}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderHome(state) {
  renderHomePrimaryTask(state);
  renderHomeProject(state);
  renderHomeHabits(state);
  renderHomeCoachTip(state);
  renderHomeDomains(state);
}
