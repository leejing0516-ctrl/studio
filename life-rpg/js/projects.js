function genSubtaskId(i) {
  return 'st' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 5);
}

// 「AI 拆解」：把專案依照 granularity 拆成一系列有到期日的子任務
function generateBreakdown(title, startDateStr, deadlineStr, granularity) {
  const subtasks = [];
  const start = parseDateStr(startDateStr);
  const end = parseDateStr(deadlineStr);
  if (end <= start) return subtasks;

  const totalDays = daysBetween(startDateStr, deadlineStr);
  const MAX_SUBTASKS = 60;

  if (granularity === 'daily') {
    const n = Math.min(totalDays, MAX_SUBTASKS);
    for (let i = 1; i <= n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + Math.round((i * totalDays) / n));
      subtasks.push({ id: genSubtaskId(i), title: `第 ${i} 天：朝「${title}」前進一步`, dueDate: formatDate(d), done: false });
    }
  } else if (granularity === 'weekly') {
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
    const n = Math.min(totalWeeks, MAX_SUBTASKS);
    for (let i = 1; i <= n; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + Math.min(totalDays, i * 7));
      subtasks.push({ id: genSubtaskId(i), title: `第 ${i} 週檢核點`, dueDate: formatDate(d), done: false });
    }
  } else {
    const totalMonths = Math.max(1, Math.round(totalDays / 30));
    const n = Math.min(totalMonths, MAX_SUBTASKS);
    for (let i = 1; i <= n; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      if (d > end) d.setTime(end.getTime());
      subtasks.push({ id: genSubtaskId(i), title: `第 ${i} 個月檢核點`, dueDate: formatDate(d), done: false });
    }
  }

  if (subtasks.length) subtasks[subtasks.length - 1].dueDate = deadlineStr;
  return subtasks;
}

function addProject(state, title, domain, deadline, granularity) {
  if (!title.trim() || !deadline) return;
  const today = todayStr();
  const subtasks = generateBreakdown(title.trim(), today, deadline, granularity);
  state.projects.push({
    id: 'p' + Date.now() + Math.random().toString(36).slice(2, 7),
    title: title.trim(), domain, deadline, granularity,
    createdDate: today, subtasks,
  });
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

function deleteSubtaskItem(state, subtaskId) {
  const found = findSubtask(state, subtaskId);
  if (!found) return;
  found.project.subtasks = found.project.subtasks.filter(st => st.id !== subtaskId);
}

function deleteProject(state, projectId) {
  state.projects = state.projects.filter(p => p.id !== projectId);
}

function renderProjects(state) {
  const list = document.getElementById('project-list');
  if (!list) return;

  if (!state.projects.length) {
    list.innerHTML = '<li class="empty-hint">還沒有任何專案，設定一個長期目標，讓小助手幫你拆解成小任務！</li>';
    return;
  }

  list.innerHTML = state.projects.map(p => {
    const domain = DOMAINS.find(d => d.key === p.domain);
    const doneCount = p.subtasks.filter(st => st.done).length;
    const total = p.subtasks.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const finished = total > 0 && doneCount === total;
    return `
      <li class="project-item">
        <div class="project-header">
          <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
          <span class="project-title">🎯 ${escapeHtml(p.title)}</span>
          <span class="project-deadline">期限 ${p.deadline}</span>
          <button class="icon-btn del-project" data-id="${p.id}" title="刪除整個專案">✕</button>
        </div>
        <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:${domain.color}"></div></div>
        <div class="project-meta">${doneCount} / ${total} 個子任務完成（${pct}%）${finished ? ' ✅ 已完成' : ''}</div>
        <ul class="project-subtasks">
          ${p.subtasks.map(st => `
            <li class="subtask-item ${st.done ? 'done' : ''}">
              <label>
                <input type="checkbox" ${st.done ? 'checked' : ''} data-subtask="${st.id}" class="subtask-check">
                <span class="subtask-title">${escapeHtml(st.title)}</span>
                <span class="subtask-date">${st.dueDate}</span>
              </label>
            </li>
          `).join('')}
        </ul>
      </li>
    `;
  }).join('');
}
