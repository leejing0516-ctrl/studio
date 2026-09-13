function renderRewards(state) {
  const list = document.getElementById('reward-list');
  list.innerHTML = '';

  if (state.rewards.length === 0) {
    list.innerHTML = '<li class="empty-hint">還沒有設定任何獎勵，新增一個想犒賞自己的東西吧！</li>';
    return;
  }

  state.rewards.forEach(r => {
    const affordable = state.gold >= r.cost;
    const li = document.createElement('li');
    li.className = 'reward-slot';
    li.innerHTML = `
      <button class="icon-btn del-reward" data-id="${r.id}" title="刪除" style="position:absolute; top:2px; right:2px;">✕</button>
      <span class="reward-icon">🎁</span>
      <span class="reward-name">${escapeHtml(r.name)}</span>
      <span class="reward-cost">${r.cost} 💰</span>
      <span class="reward-actions">
        <button class="btn small redeem-reward" data-id="${r.id}" ${affordable ? '' : 'disabled'}>兌換</button>
      </span>
    `;
    list.appendChild(li);
  });
}

function addReward(state, name, cost) {
  if (!name.trim() || !cost || cost <= 0) return;
  state.rewards.push({
    id: 'r' + Date.now() + Math.random().toString(36).slice(2, 7),
    name: name.trim(), cost: Number(cost),
  });
}

// 回傳是否兌換成功
function redeemReward(state, id) {
  const r = state.rewards.find(r => r.id === id);
  if (!r || state.gold < r.cost) return false;
  state.gold -= r.cost;
  state.stats.rewardsRedeemed += 1;
  addLog(state, `兌換獎勵「${r.name}」，花費 ${r.cost} 金幣`);
  return true;
}

function deleteReward(state, id) {
  state.rewards = state.rewards.filter(r => r.id !== id);
}
