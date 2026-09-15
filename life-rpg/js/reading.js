let _expandedReadingPlans = new Set();

function renderBooks(state) {
  const list = document.getElementById('book-list');
  list.innerHTML = '';

  if (state.books.length === 0) {
    list.innerHTML = '<li class="empty-hint">還沒有加入任何書籍，新增一本開始追蹤閱讀進度！</li>';
    return;
  }

  state.books.forEach(b => {
    const pct = Math.min(100, Math.round((b.currentPage / b.totalPages) * 100));
    const li = document.createElement('li');
    li.className = 'book-item' + (b.done ? ' done' : '');

    let planHtml = '';
    if (b.readingPlan) {
      const doneCount = b.readingPlan.subtasks.filter(s => s.done).length;
      const total = b.readingPlan.subtasks.length;
      const expanded = _expandedReadingPlans.has(b.id);
      planHtml = `
        <div class="reading-plan">
          <button class="project-toggle reading-plan-toggle" data-id="${b.id}">${expanded ? '▾ 收合' : '▸ 展開'} 閱讀計畫（${b.readingPlan.startDate || ''} ~ ${b.readingPlan.deadline}）：${doneCount} / ${total} 天完成</button>
          ${expanded ? `<ul class="project-subtasks">${b.readingPlan.subtasks.map(st => `
            <li class="subtask-item ${st.done ? 'done' : ''}">
              <label>
                <input type="checkbox" ${st.done ? 'checked' : ''} data-subtask="${st.id}" class="readingplan-check">
                <span class="subtask-title">${escapeHtml(st.title)}</span>
                <span class="subtask-date">${st.dueDate}</span>
                ${st.googleEventId ? '<span class="gcal-badge" title="已同步到 Google 日曆">🔗</span>' : ''}
              </label>
              <button class="icon-btn edit-item" data-kind="readingplan" data-id="${st.id}" title="編輯">✎</button>
              <button class="icon-btn del-readingplan" data-id="${st.id}" title="刪除">✕</button>
            </li>
          `).join('')}</ul>` : ''}
        </div>
      `;
    } else if (!b.done) {
      planHtml = `
        <div class="reading-plan-setup inline-form">
          <input type="date" class="plan-start" data-id="${b.id}" title="開始日期" value="${todayStr()}">
          <input type="date" class="plan-deadline" data-id="${b.id}" title="目標完成日期">
          <select class="plan-granularity" data-id="${b.id}">
            <option value="daily">拆成每日進度</option>
            <option value="weekly">拆成每週進度</option>
          </select>
          <button type="button" class="btn small gen-reading-plan" data-id="${b.id}">🤖 AI 拆解進度</button>
        </div>
      `;
    }

    li.innerHTML = `
      <div class="book-header">
        <span class="book-title">📖 ${escapeHtml(b.title)}</span>
        <button class="icon-btn del-book" data-id="${b.id}" title="刪除">✕</button>
      </div>
      <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:#7dd3fc"></div></div>
      <div class="book-meta">
        <span>第 ${b.currentPage} / ${b.totalPages} 頁（${pct}%）</span>
        ${b.done
          ? '<span class="badge-done">✅ 已完成</span>'
          : `<span class="book-log">
              <input type="number" min="0" placeholder="今天讀到第幾頁" class="page-input" data-id="${b.id}">
              <button class="btn small log-page" data-id="${b.id}">紀錄</button>
             </span>`
        }
      </div>
      ${planHtml}
    `;
    list.appendChild(li);
  });
}

function addBook(state, title, totalPages) {
  if (!title.trim() || !totalPages || totalPages <= 0) return;
  state.books.push({
    id: 'b' + Date.now() + Math.random().toString(36).slice(2, 7),
    title: title.trim(), totalPages: Number(totalPages), currentPage: 0, done: false, readingPlan: null,
  });
}

function genReadingPlanId(i) {
  return 'rp' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 5);
}

// 「AI 拆解」：把剩餘頁數依起訖日期平均分配成每日/每週的頁數區間
function generateReadingPlan(book, startDateStr, deadlineStr, granularity) {
  const start = parseDateStr(startDateStr);
  const end = parseDateStr(deadlineStr);
  const remainingPages = book.totalPages - book.currentPage;
  if (end <= start || remainingPages <= 0) return [];

  const totalDays = daysBetween(startDateStr, deadlineStr);
  const MAX = 60;
  const n = granularity === 'daily'
    ? Math.min(totalDays, MAX)
    : Math.min(Math.max(1, Math.ceil(totalDays / 7)), MAX);
  const subtasks = [];
  let pagesAssigned = 0;

  const pushChunk = (i, label, dueDate) => {
    const targetOffset = Math.round((remainingPages * i) / n);
    const startPage = book.currentPage + pagesAssigned + 1;
    const endPage = Math.min(book.currentPage + targetOffset, book.totalPages);
    if (endPage < startPage) return;
    subtasks.push({ id: genReadingPlanId(i), title: `${label}：閱讀第 ${startPage}-${endPage} 頁`, startPage, endPage, dueDate, done: false, googleEventId: null });
    pagesAssigned = endPage - book.currentPage;
  };

  if (granularity === 'daily') {
    for (let i = 1; i <= n; i++) {
      const d = new Date(start); d.setDate(d.getDate() + Math.round((i * totalDays) / n));
      pushChunk(i, `第 ${i} 天`, formatDate(d));
    }
  } else {
    for (let i = 1; i <= n; i++) {
      const d = new Date(start); d.setDate(d.getDate() + Math.min(totalDays, i * 7));
      pushChunk(i, `第 ${i} 週`, formatDate(d));
    }
  }

  if (subtasks.length) {
    subtasks[subtasks.length - 1].dueDate = deadlineStr;
    subtasks[subtasks.length - 1].endPage = book.totalPages;
  }
  return subtasks;
}

function addReadingPlan(state, bookId, startDate, deadline, granularity) {
  const book = state.books.find(b => b.id === bookId);
  if (!book || !deadline) return;
  const subtasks = generateReadingPlan(book, startDate, deadline, granularity);
  if (!subtasks.length) return;
  book.readingPlan = { startDate, deadline, granularity, subtasks };
}

function findReadingPlanItem(state, subtaskId) {
  for (const b of state.books) {
    if (!b.readingPlan) continue;
    const st = b.readingPlan.subtasks.find(s => s.id === subtaskId);
    if (st) return { book: b, subtask: st };
  }
  return null;
}

function toggleReadingPlanItem(state, subtaskId) {
  const found = findReadingPlanItem(state, subtaskId);
  if (!found) return;
  const { book, subtask } = found;
  subtask.done = !subtask.done;
  subtask.doneAt = subtask.done ? Date.now() : null;
  const exp = (subtask.endPage - subtask.startPage + 1) * EXP_PER_PAGE;

  if (subtask.done) {
    gainExp(state, 'reading', exp);
    book.currentPage = Math.max(book.currentPage, subtask.endPage);
    addLog(state, `完成《${book.title}》閱讀計畫「${subtask.title}」，+${exp} EXP ／ +${goldFor(exp)} 金幣`);
    if (book.currentPage >= book.totalPages && !book.done) {
      book.done = true;
      gainExp(state, 'reading', BOOK_FINISH_BONUS);
      addLog(state, `讀完《${book.title}》！額外獲得 +${BOOK_FINISH_BONUS} EXP ／ +${goldFor(BOOK_FINISH_BONUS)} 金幣`);
    }
  } else {
    gainExp(state, 'reading', -exp);
    book.done = false;
    const doneMax = book.readingPlan.subtasks.filter(s => s.done).reduce((m, s) => Math.max(m, s.endPage), 0);
    book.currentPage = doneMax;
  }
}

function updateReadingPlanItem(state, subtaskId, fields) {
  const found = findReadingPlanItem(state, subtaskId);
  if (!found) return;
  Object.assign(found.subtask, fields);
}

function deleteReadingPlanItem(state, subtaskId) {
  const found = findReadingPlanItem(state, subtaskId);
  if (!found) return;
  found.book.readingPlan.subtasks = found.book.readingPlan.subtasks.filter(s => s.id !== subtaskId);
}

function logPage(state, id, newPage) {
  const b = state.books.find(b => b.id === id);
  if (!b || b.done) return;
  newPage = Math.max(0, Math.min(Number(newPage), b.totalPages));
  const pagesRead = newPage - b.currentPage;
  if (pagesRead <= 0) return;
  b.currentPage = newPage;
  const exp = pagesRead * EXP_PER_PAGE;
  gainExp(state, 'reading', exp);
  addLog(state, `閱讀《${b.title}》${pagesRead} 頁，學業/閱讀 +${exp} EXP ／ +${goldFor(exp)} 金幣`);

  if (b.currentPage >= b.totalPages) {
    b.done = true;
    gainExp(state, 'reading', BOOK_FINISH_BONUS);
    addLog(state, `讀完《${b.title}》！額外獲得 +${BOOK_FINISH_BONUS} EXP ／ +${goldFor(BOOK_FINISH_BONUS)} 金幣`);
  }
}

function deleteBook(state, id) {
  state.books = state.books.filter(b => b.id !== id);
}

function todaysReadingCheckins(state) {
  const today = todayStr();
  if (!state.readingCompletions[today]) state.readingCompletions[today] = {};
  return state.readingCompletions[today];
}

function toggleReadingCheckin(state, bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;
  const doneMap = todaysReadingCheckins(state);
  if (!doneMap[bookId]) {
    doneMap[bookId] = Date.now();
    gainExp(state, 'reading', READING_CHECKIN_EXP);
    addLog(state, `今天有閱讀《${book.title}》，學業/閱讀 +${READING_CHECKIN_EXP} EXP ／ +${goldFor(READING_CHECKIN_EXP)} 金幣`);
  } else {
    delete doneMap[bookId];
    gainExp(state, 'reading', -READING_CHECKIN_EXP);
  }
}
