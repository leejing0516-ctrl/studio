function genSubtaskId(i) {
  return 'st' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 5);
}

// 依專案標題關鍵字比對，給出具體、循環式的行動任務範本，而非泛泛的重複句子
const PROJECT_TEMPLATES = [
  {
    match: /半馬|全馬|馬拉松|路跑|鐵人三項|長跑|跑步比賽/,
    daily: (i) => {
      const week = Math.floor(i / 7) + 1;
      const longRun = Math.min(3 + week, 18);
      const cycle = [
        '休息與動態伸展',
        '輕鬆跑 3 公里',
        '間歇訓練（400M x 6 組）',
        '交叉訓練（游泳／騎車）30 分鐘',
        '輕鬆跑 4 公里',
        `長距離跑 ${longRun} 公里`,
        '恢復慢走 20 分鐘',
      ];
      return cycle[i % 7];
    },
    weekly: (i) => `2 次輕鬆跑 + 1 次間歇訓練 + 1 次長距離跑（約 ${Math.min(3 + i, 18)} 公里）`,
    monthly: (i) => `檢視配速與月里程數，逐步拉長訓練距離`,
  },
  {
    match: /減肥|減重|瘦身|體重|公斤|體脂/,
    daily: (i) => {
      const cycle = [
        '記錄今天的飲食內容',
        '有氧運動 30 分鐘',
        '重量訓練 20 分鐘',
        '喝水 2000ml、睡滿 7 小時',
        '秤重並記錄變化',
        '準備健康餐盒、減少外食',
        '休息日：伸展 + 檢視這週飲食紀錄',
      ];
      return cycle[i % 7];
    },
    weekly: (i) => '量體重、檢視這週飲食紀錄、調整下週運動強度',
    monthly: (i) => '檢視整體減重進度，調整飲食與運動計畫',
  },
  {
    match: /考試|檢定|證照|考照|國考|面試|讀書計畫|學測|統測/,
    daily: (i) => {
      const cycle = [
        '複習前一天內容 15 分鐘',
        '精讀新進度',
        '做練習題／考古題 1 回',
        '整理錯題筆記',
        '加強弱項章節',
        '模擬考／自我測驗',
        '休息與睡眠',
      ];
      return cycle[i % 7];
    },
    weekly: (i) => '完整複習本週進度 + 一回模擬考',
    monthly: (i) => '全範圍複習與弱點補強',
  },
  {
    match: /存錢|存款|理財|儲蓄|財務目標/,
    daily: (i) => {
      const cycle = [
        '記帳：記錄今天的花費',
        '檢視是否有不必要的支出',
        '轉一筆錢到儲蓄帳戶',
        '檢視這週預算執行狀況',
      ];
      return cycle[i % 4];
    },
    weekly: (i) => '檢討本週花費、確認儲蓄進度是否達標',
    monthly: (i) => '檢視整體財務目標達成率，必要時調整存款金額',
  },
  {
    match: /學會|學習|練習|技能|語言|英文|日文|程式|考駕照|彈|樂器/,
    daily: (i) => {
      const cycle = [
        '學習新內容 30 分鐘',
        '複習昨天學的內容',
        '動手實作練習',
        '找機會實際應用一次',
      ];
      return cycle[i % 4];
    },
    weekly: (i) => '統整本週所學、找一個實際應用場景練習',
    monthly: (i) => '檢視學習進度，必要時調整學習方法',
  },
];

function pickTemplate(title) {
  return PROJECT_TEMPLATES.find(t => t.match.test(title)) || null;
}

const GENERIC_DAILY = (i, title) => {
  const cycle = [
    `針對「${title}」採取一項具體小行動`,
    `檢視「${title}」目前的進度`,
    `排除一個卡住「${title}」的障礙`,
  ];
  return cycle[i % cycle.length];
};

function buildSubtaskTitle(tpl, granularity, i, title) {
  if (granularity === 'daily') {
    const phrase = tpl ? tpl.daily(i) : GENERIC_DAILY(i, title);
    return `第 ${i + 1} 天：${phrase}`;
  }
  if (granularity === 'weekly') {
    const phrase = tpl ? tpl.weekly(i) : `檢視「${title}」的進度並調整下週計畫`;
    return `第 ${i} 週：${phrase}`;
  }
  const phrase = tpl ? tpl.monthly(i) : `檢視「${title}」整體進度`;
  return `第 ${i} 個月：${phrase}`;
}

// 「AI 拆解」：依專案性質比對範本，把專案拆成一系列有到期日、具體的子任務
function generateBreakdown(title, startDateStr, deadlineStr, granularity) {
  const subtasks = [];
  const start = parseDateStr(startDateStr);
  const end = parseDateStr(deadlineStr);
  if (end <= start) return subtasks;

  const totalDays = daysBetween(startDateStr, deadlineStr);
  const MAX_SUBTASKS = 60;
  const tpl = pickTemplate(title);

  if (granularity === 'daily') {
    const n = Math.min(totalDays, MAX_SUBTASKS);
    for (let i = 1; i <= n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + Math.round((i * totalDays) / n));
      subtasks.push({ id: genSubtaskId(i), title: buildSubtaskTitle(tpl, 'daily', i - 1, title), dueDate: formatDate(d), done: false, googleEventId: null });
    }
  } else if (granularity === 'weekly') {
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
    const n = Math.min(totalWeeks, MAX_SUBTASKS);
    for (let i = 1; i <= n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + Math.min(totalDays, i * 7));
      subtasks.push({ id: genSubtaskId(i), title: buildSubtaskTitle(tpl, 'weekly', i, title), dueDate: formatDate(d), done: false, googleEventId: null });
    }
  } else {
    const totalMonths = Math.max(1, Math.round(totalDays / 30));
    const n = Math.min(totalMonths, MAX_SUBTASKS);
    for (let i = 1; i <= n; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      if (d > end) d.setTime(end.getTime());
      subtasks.push({ id: genSubtaskId(i), title: buildSubtaskTitle(tpl, 'monthly', i, title), dueDate: formatDate(d), done: false, googleEventId: null });
    }
  }

  if (subtasks.length) subtasks[subtasks.length - 1].dueDate = deadlineStr;
  return subtasks;
}

let _pendingProject = null;
let _expandedProjects = new Set();

// 先產生預覽，讓使用者看過、刪掉不要的子任務後再確認儲存
function previewProject(title, domain, startDate, deadline, granularity) {
  if (!title.trim() || !deadline) return;
  _pendingProject = {
    title: title.trim(), domain, startDate, deadline, granularity,
    subtasks: generateBreakdown(title.trim(), startDate, deadline, granularity),
  };
}

function regeneratePendingProject() {
  if (!_pendingProject) return;
  const { title, startDate, deadline, granularity } = _pendingProject;
  _pendingProject.subtasks = generateBreakdown(title, startDate, deadline, granularity);
}

function removePendingSubtask(subtaskId) {
  if (!_pendingProject) return;
  _pendingProject.subtasks = _pendingProject.subtasks.filter(st => st.id !== subtaskId);
}

function cancelPendingProject() {
  _pendingProject = null;
}

function confirmPendingProject(state) {
  if (!_pendingProject) return;
  const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 7);
  state.projects.push(Object.assign({ id, createdDate: todayStr() }, _pendingProject));
  _expandedProjects.delete(id);
  _pendingProject = null;
}

function findSubtask(state, subtaskId) {
  for (const p of state.projects) {
    const st = p.subtasks.find(st => st.id === subtaskId);
    if (st) return { project: p, subtask: st };
  }
  return null;
}

function toggleProjectSubtask(state, subtaskId) {
  const found = findSubtask(state, subtaskId);
  if (!found) return;
  const { project: p, subtask: st } = found;
  st.done = !st.done;
  if (st.done) {
    gainExp(state, p.domain, PROJECT_SUBTASK_EXP);
    addLog(state, `完成專案「${p.title}」子任務「${st.title}」，+${PROJECT_SUBTASK_EXP} EXP ／ +${goldFor(PROJECT_SUBTASK_EXP)} 金幣`);
    if (p.subtasks.every(s => s.done)) {
      gainExp(state, p.domain, PROJECT_FINISH_BONUS);
      addLog(state, `🎉 完成整個專案「${p.title}」！額外獲得 +${PROJECT_FINISH_BONUS} EXP ／ +${goldFor(PROJECT_FINISH_BONUS)} 金幣`);
    }
  } else {
    gainExp(state, p.domain, -PROJECT_SUBTASK_EXP);
  }
}

function updateSubtask(state, subtaskId, fields) {
  const found = findSubtask(state, subtaskId);
  if (!found) return;
  Object.assign(found.subtask, fields);
}

function deleteSubtaskItem(state, subtaskId) {
  const found = findSubtask(state, subtaskId);
  if (!found) return;
  found.project.subtasks = found.project.subtasks.filter(st => st.id !== subtaskId);
}

function deleteProject(state, projectId) {
  state.projects = state.projects.filter(p => p.id !== projectId);
}

// 把專案裡「還沒完成」的子任務整批往後移，讓過期最久的那個回到今天，其餘保持原本的間距
function postponeProject(state, projectId) {
  const p = state.projects.find(p => p.id === projectId);
  if (!p) return;
  const today = todayStr();
  const overdue = p.subtasks.filter(st => !st.done && st.dueDate < today);
  if (!overdue.length) return;
  const earliest = overdue.reduce((min, st) => (st.dueDate < min ? st.dueDate : min), overdue[0].dueDate);
  shiftUnfinishedDates(p.subtasks, daysBetween(earliest, today));
}

function renderProjectPreview() {
  const el = document.getElementById('project-preview');
  if (!el) return;
  if (!_pendingProject) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = 'block';
  const domain = DOMAINS.find(d => d.key === _pendingProject.domain);
  el.innerHTML = `
    <div class="project-item project-preview-card">
      <div class="project-header">
        <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
        <span class="project-title">🤖 預覽：${escapeHtml(_pendingProject.title)}</span>
        <span class="project-deadline">${_pendingProject.startDate} ~ ${_pendingProject.deadline}</span>
      </div>
      <p class="tab-hint">看看教練拆解得如何，不滿意可以「重新生成」，或刪掉個別項目後再確認。</p>
      <ul class="project-subtasks">
        ${_pendingProject.subtasks.map(st => `
          <li class="subtask-item">
            <label><span class="subtask-title">${escapeHtml(st.title)}</span><span class="subtask-date">${st.dueDate}</span></label>
            <button class="icon-btn preview-del-subtask" data-id="${st.id}" title="移除這一項">✕</button>
          </li>
        `).join('')}
      </ul>
      <div class="modal-actions" style="justify-content:flex-start; flex-wrap:wrap;">
        <button type="button" id="preview-regenerate" class="btn small">🔄 重新生成</button>
        <button type="button" id="preview-cancel" class="btn small">取消</button>
        <button type="button" id="preview-confirm" class="btn">✅ 確認儲存</button>
      </div>
    </div>
  `;
}

function renderProjects(state) {
  renderProjectPreview();
  const list = document.getElementById('project-list');
  if (!list) return;

  if (!state.projects.length) {
    list.innerHTML = '<li class="empty-hint">還沒有任何專案，設定一個長期目標，讓教練幫你拆解成小任務！</li>';
    return;
  }

  list.innerHTML = state.projects.map(p => {
    const domain = DOMAINS.find(d => d.key === p.domain);
    const doneCount = p.subtasks.filter(st => st.done).length;
    const total = p.subtasks.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const finished = total > 0 && doneCount === total;
    const expanded = _expandedProjects.has(p.id);
    return `
      <li class="project-item">
        <div class="project-header">
          <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
          <span class="project-title">🎯 ${escapeHtml(p.title)}</span>
          <span class="project-deadline">${p.startDate || p.createdDate} ~ ${p.deadline}</span>
          <button class="icon-btn del-project" data-id="${p.id}" title="刪除整個專案">✕</button>
        </div>
        <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:${domain.color}"></div></div>
        <button class="project-toggle" data-id="${p.id}">${expanded ? '▾ 收合' : '▸ 展開'} 子任務：${doneCount} / ${total} 完成（${pct}%）${finished ? ' ✅ 已完成' : ''}</button>
        ${expanded ? `<ul class="project-subtasks">
          ${p.subtasks.map(st => `
            <li class="subtask-item ${st.done ? 'done' : ''}">
              <label>
                <input type="checkbox" ${st.done ? 'checked' : ''} data-subtask="${st.id}" class="subtask-check">
                <span class="subtask-title">${escapeHtml(st.title)}</span>
                <span class="subtask-date">${st.dueDate}</span>
                ${st.googleEventId ? '<span class="gcal-badge" title="已同步到 Google 日曆">🔗</span>' : ''}
              </label>
              <button class="icon-btn edit-item" data-kind="project" data-id="${st.id}" title="編輯">✎</button>
            </li>
          `).join('')}
        </ul>` : ''}
      </li>
    `;
  }).join('');
}
