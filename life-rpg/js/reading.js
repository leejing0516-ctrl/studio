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
    `;
    list.appendChild(li);
  });
}

function addBook(state, title, totalPages) {
  if (!title.trim() || !totalPages || totalPages <= 0) return;
  state.books.push({
    id: 'b' + Date.now() + Math.random().toString(36).slice(2, 7),
    title: title.trim(), totalPages: Number(totalPages), currentPage: 0, done: false,
  });
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
  addLog(state, `閱讀《${b.title}》${pagesRead} 頁，學業閱讀 +${exp} EXP ／ +${goldFor(exp)} 金幣`);

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
    doneMap[bookId] = true;
    gainExp(state, 'reading', READING_CHECKIN_EXP);
    addLog(state, `今天有閱讀《${book.title}》，學業閱讀 +${READING_CHECKIN_EXP} EXP ／ +${goldFor(READING_CHECKIN_EXP)} 金幣`);
  } else {
    delete doneMap[bookId];
    gainExp(state, 'reading', -READING_CHECKIN_EXP);
  }
}
