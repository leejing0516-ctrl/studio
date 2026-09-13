function sumExpenses(state, fromDateStr, toDateStrExclusive) {
  return state.expenses
    .filter(e => e.date >= fromDateStr && e.date < toDateStrExclusive)
    .reduce((sum, e) => sum + e.amount, 0);
}

function addExpense(state, amount, category, note) {
  amount = Number(amount);
  if (!amount || amount <= 0) return;
  state.expenses.push({
    id: 'ex' + Date.now() + Math.random().toString(36).slice(2, 7),
    amount, category, note: (note || '').trim(), date: todayStr(),
  });
  gainExp(state, 'finance', EXPENSE_LOG_EXP);
  addLog(state, `記帳：${category} $${amount}${note ? '（' + note + '）' : ''}，消費/財務 +${EXPENSE_LOG_EXP} EXP ／ +${goldFor(EXPENSE_LOG_EXP)} 金幣`);
}

function deleteExpense(state, id) {
  const idx = state.expenses.findIndex(e => e.id === id);
  if (idx === -1) return;
  gainExp(state, 'finance', -EXPENSE_LOG_EXP);
  state.expenses.splice(idx, 1);
}

function saveBudget(state, weekly, monthly) {
  state.budget.weekly = weekly ? Number(weekly) : null;
  state.budget.monthly = monthly ? Number(monthly) : null;
}

// 每天檢查一次：上一週／上個月是否守住預算，守住的話給獎勵 EXP（只會給一次）
function checkBudgetBonuses(state) {
  const today = todayStr();
  const currentWeekStart = getWeekStart(today);
  const currentMonthKey = getMonthKey(today);

  if (state.budget.weekly) {
    const lastWeekStart = addDays(currentWeekStart, -7);
    if (lastWeekStart < currentWeekStart && state.budget.lastWeeklyBonusWeek !== lastWeekStart) {
      const spent = sumExpenses(state, lastWeekStart, currentWeekStart);
      if (spent <= state.budget.weekly) {
        gainExp(state, 'finance', WEEKLY_BUDGET_BONUS_EXP);
        state.stats.budgetBonusesEarned = (state.stats.budgetBonusesEarned || 0) + 1;
        addLog(state, `上週消費 $${spent} 沒有超過預算 $${state.budget.weekly}，消費/財務 +${WEEKLY_BUDGET_BONUS_EXP} EXP ／ +${goldFor(WEEKLY_BUDGET_BONUS_EXP)} 金幣`);
        addAssistantMessage(state, `上週守住了消費預算（$${spent} / $${state.budget.weekly}），這份自律很值得肯定！`, 'praise');
      }
      state.budget.lastWeeklyBonusWeek = lastWeekStart;
    }
  }

  if (state.budget.monthly) {
    const thisMonthStart = getMonthStart(today);
    const lastMonthStart = getMonthStart(addDays(thisMonthStart, -1));
    const lastMonthKey = getMonthKey(lastMonthStart);
    if (lastMonthKey !== currentMonthKey && state.budget.lastMonthlyBonusMonth !== lastMonthKey) {
      const spent = sumExpenses(state, lastMonthStart, thisMonthStart);
      if (spent <= state.budget.monthly) {
        gainExp(state, 'finance', MONTHLY_BUDGET_BONUS_EXP);
        state.stats.budgetBonusesEarned = (state.stats.budgetBonusesEarned || 0) + 1;
        addLog(state, `上個月消費 $${spent} 沒有超過預算 $${state.budget.monthly}，消費/財務 +${MONTHLY_BUDGET_BONUS_EXP} EXP ／ +${goldFor(MONTHLY_BUDGET_BONUS_EXP)} 金幣`);
        addAssistantMessage(state, `上個月守住了消費預算（$${spent} / $${state.budget.monthly}），理財這條路你走得很穩！`, 'praise');
      }
      state.budget.lastMonthlyBonusMonth = lastMonthKey;
    }
  }
}

function renderBudgetInputs(state) {
  const w = document.getElementById('budget-weekly');
  const m = document.getElementById('budget-monthly');
  if (document.activeElement !== w) w.value = state.budget.weekly || '';
  if (document.activeElement !== m) m.value = state.budget.monthly || '';
}

function renderBudgetStatus(state) {
  const el = document.getElementById('budget-status');
  if (!el) return;
  const today = todayStr();
  const weekStart = getWeekStart(today);
  const weekSpent = sumExpenses(state, weekStart, addDays(weekStart, 7));
  const monthStart = getMonthStart(today);
  const monthSpent = sumExpenses(state, monthStart, getNextMonthStart(today));

  const rows = [];
  if (state.budget.weekly) {
    const pct = Math.min(100, Math.round((weekSpent / state.budget.weekly) * 100));
    const over = weekSpent > state.budget.weekly;
    rows.push(`
      <div class="skill-row">
        <div class="skill-label">本週消費 <span>$${weekSpent} / $${state.budget.weekly}</span></div>
        <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:${over ? '#e2685f' : '#fca5a5'}"></div></div>
      </div>
    `);
  }
  if (state.budget.monthly) {
    const pct = Math.min(100, Math.round((monthSpent / state.budget.monthly) * 100));
    const over = monthSpent > state.budget.monthly;
    rows.push(`
      <div class="skill-row">
        <div class="skill-label">本月消費 <span>$${monthSpent} / $${state.budget.monthly}</span></div>
        <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:${over ? '#e2685f' : '#fca5a5'}"></div></div>
      </div>
    `);
  }
  el.innerHTML = rows.length ? rows.join('') : '<p class="tab-hint">還沒設定預算，設定後這裡會顯示本週／本月的花費進度。</p>';
}

function renderExpenses(state) {
  const list = document.getElementById('expense-list');
  if (!list) return;
  if (!state.expenses.length) {
    list.innerHTML = '<li class="empty-hint">還沒有任何記帳紀錄，記一筆開始追蹤消費吧！</li>';
    return;
  }
  const sorted = state.expenses.slice().sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  list.innerHTML = sorted.slice(0, 50).map(e => `
    <li class="expense-item">
      <span class="task-tag" style="background:#fca5a5">${escapeHtml(e.category)}</span>
      <span class="expense-amount">$${e.amount}</span>
      <span class="expense-note">${escapeHtml(e.note || '')}</span>
      <span class="expense-date">${e.date}</span>
      <button class="icon-btn del-expense" data-id="${e.id}" title="刪除">✕</button>
    </li>
  `).join('');
}

function renderFinance(state) {
  renderBudgetInputs(state);
  renderBudgetStatus(state);
  renderExpenses(state);
}
