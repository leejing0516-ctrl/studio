let _lastOverallLevel = null;

// 讀取使用者上傳的圖片，置中裁切成正方形並縮小，轉成 JPEG data URL 存進 state
// 有些圖片格式（例如 iPhone 的 HEIC）瀏覽器無法解碼，這裡用 onerror + 逾時保護，
// 確保失敗時一定會呼叫 onError，不會悄悄什麼都沒發生
function processAvatarFile(file, callback, onError) {
  const fail = (msg) => { if (onError) onError(msg); };
  const reader = new FileReader();
  reader.onerror = () => fail('讀取檔案失敗');
  reader.onload = e => {
    const img = new Image();
    let settled = false;
    const timeout = setTimeout(() => { if (!settled) { settled = true; fail('圖片載入逾時，格式可能不支援'); } }, 8000);
    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      fail('圖片格式不支援（例如 iPhone 的 HEIC 格式）');
    };
    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      try {
        callback(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        fail('圖片處理失敗：' + err.message);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderCharacter(state) {
  const info = overallLevelInfo(state);
  document.getElementById('char-name').value = state.character.name;
  const avatarImg = document.getElementById('char-avatar-img');
  if (avatarImg) avatarImg.src = state.character.avatar || DEFAULT_AVATAR_SRC;
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
