let _lastOverallLevel = null;

function renderCharacter(state) {
  const info = overallLevelInfo(state);
  document.getElementById('char-name').value = state.character.name;
  document.getElementById('char-level').textContent = `Lv. ${info.level}`;
  const pct = Math.min(100, Math.round((info.expIntoLevel / info.expToNext) * 100));
  document.getElementById('char-exp-bar').style.width = pct + '%';
  document.getElementById('char-exp-text').textContent = `${info.expIntoLevel} / ${info.expToNext} EXP`;
  document.getElementById('streak-count').textContent = state.streak.count;
  document.getElementById('gold-count').textContent = state.gold;

  if (_lastOverallLevel !== null && info.level > _lastOverallLevel) {
    showLevelUp(state, info.level);
  }
  _lastOverallLevel = info.level;

  renderSkillBars(state);
  drawRadar(state);
}

function showLevelUp(state, level) {
  sound.playLevelUp();
  onLevelUp(state, level);
  const modal = document.getElementById('levelup-modal');
  document.getElementById('levelup-text').textContent = `Lv. ${level}`;
  modal.classList.add('show');
  clearTimeout(modal._timer);
  modal._timer = setTimeout(() => modal.classList.remove('show'), 2200);
}

function renderSkillBars(state) {
  const container = document.getElementById('skill-bars');
  container.innerHTML = '';
  DOMAINS.forEach(d => {
    const info = levelFromExp(state.skills[d.key].exp);
    const pct = Math.min(100, Math.round((info.expIntoLevel / info.expToNext) * 100));
    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = `
      <div class="skill-label">${d.icon} ${d.name} <span class="skill-lv">Lv.${info.level}</span></div>
      <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:linear-gradient(90deg, ${d.color}99, ${d.color})"></div></div>
    `;
    container.appendChild(row);
  });
}

function drawRadar(state) {
  const canvas = document.getElementById('radarCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) / 2 - 34;
  const n = DOMAINS.length;
  const maxLevel = Math.max(5, ...DOMAINS.map(d => levelFromExp(state.skills[d.key].exp).level));

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(232, 209, 156, 0.18)';
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (radius * ring) / 4;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = '#e9e2f5';
  ctx.font = '600 13px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  DOMAINS.forEach((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.strokeStyle = 'rgba(232, 209, 156, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    const lx = cx + (radius + 22) * Math.cos(angle);
    const ly = cy + (radius + 22) * Math.sin(angle);
    ctx.fillText(`${d.icon}${d.name}`, lx, ly);
  });

  ctx.beginPath();
  DOMAINS.forEach((d, i) => {
    const level = levelFromExp(state.skills[d.key].exp).level;
    const r = (radius * Math.min(level, maxLevel)) / maxLevel;
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, 'rgba(232, 180, 90, 0.55)');
  grad.addColorStop(1, 'rgba(168, 109, 224, 0.35)');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(232, 180, 90, 0.6)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#e8b45a';
  ctx.lineWidth = 2.5;
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}
