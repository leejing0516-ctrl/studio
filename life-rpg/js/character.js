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
      canvas.width = AVATAR_CARD_WIDTH;
      canvas.height = AVATAR_CARD_HEIGHT;
      const ctx = canvas.getContext('2d');
      // 裁成 3:4 直式卡片比例，適合半身照；來源偏高時從上方往下取一點，避免臉被裁到下面去
      const targetRatio = AVATAR_CARD_WIDTH / AVATAR_CARD_HEIGHT;
      const srcRatio = img.width / img.height;
      let sx, sy, sw, sh;
      if (srcRatio > targetRatio) {
        sh = img.height;
        sw = sh * targetRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        sw = img.width;
        sh = sw / targetRatio;
        sx = 0;
        sy = (img.height - sh) * 0.3;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, AVATAR_CARD_WIDTH, AVATAR_CARD_HEIGHT);
      try {
        // 用 PNG 保留透明背景（例如已去背的半身照）
        callback(canvas.toDataURL('image/png'));
      } catch (err) {
        fail('圖片處理失敗：' + err.message);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 年齡/特質只有填了才顯示成小標籤，沒填就完全不出現，不在首頁露出空白輸入框
// （職稱改由 renderCharacterTitlePlaque 顯示在簡介欄的牌匾上，這裡不重複顯示）
function renderStatusRoleplayDisplay(state) {
  const el = document.getElementById('status-roleplay-display');
  if (!el) return;
  const c = state.character;
  const chips = [];
  if (c.age) chips.push(`🎂 ${escapeHtml(c.age)}`);
  if (c.traits) chips.push(`✨ ${escapeHtml(c.traits)}`);
  el.innerHTML = chips.map(t => `<span class="status-roleplay-chip">${t}</span>`).join('');
}

function renderCharacterTitlePlaque(state) {
  const wrap = document.getElementById('char-title-plaque');
  const text = document.getElementById('char-title-display');
  if (!wrap || !text) return;
  const title = state.character.title;
  wrap.style.display = title ? '' : 'none';
  if (title) text.textContent = title;
}

// 角色簡介：沒填時顯示引導文字，帶使用者去設定頁寫（跟首頁其他卡片的空狀態邏輯一致）
function renderCharacterBio(state) {
  const el = document.getElementById('char-bio-display');
  if (!el) return;
  const bio = state.character.bio;
  if (bio) {
    el.textContent = bio;
    el.classList.remove('character-bio-empty');
  } else {
    el.textContent = '到「設定」頁寫一段屬於你的角色簡介吧！';
    el.classList.add('character-bio-empty');
  }
}

function renderCharacter(state) {
  const info = overallLevelInfo(state);
  const nameInput = document.getElementById('char-name');
  if (nameInput) nameInput.value = state.character.name;
  const nameDisplay = document.getElementById('char-name-display');
  if (nameDisplay) nameDisplay.textContent = state.character.name;
  const avatarSrc = state.character.avatar || DEFAULT_AVATAR_SRC;
  const avatarImg = document.getElementById('char-avatar-img');
  if (avatarImg) avatarImg.src = avatarSrc;
  const avatarImgSettings = document.getElementById('char-avatar-img-settings');
  if (avatarImgSettings) avatarImgSettings.src = avatarSrc;
  ['title', 'age', 'traits', 'bio'].forEach(field => {
    const el = document.getElementById('char-' + field);
    if (el && document.activeElement !== el) el.value = state.character[field] || '';
  });
  renderStatusRoleplayDisplay(state);
  renderCharacterTitlePlaque(state);
  renderCharacterBio(state);
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
  const container = document.getElementById('status-skill-bars');
  if (!container) return;
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

// 把 "#rrggbb" 轉成指定透明度的 rgba() 字串
function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawRadar(state) {
  const canvas = document.getElementById('radarCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) / 2 - 46;
  const n = DOMAINS.length;
  const maxLevel = Math.max(5, ...DOMAINS.map(d => levelFromExp(state.skills[d.key].exp).level));

  ctx.clearRect(0, 0, w, h);

  // 淡色底板，維持明亮活潑的整體風格
  ctx.fillStyle = '#fffaf1';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, w, h, 18);
  } else {
    ctx.rect(0, 0, w, h);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(227, 171, 92, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 外圈虛線刻度環，營造科技儀表的感覺
  ctx.save();
  ctx.strokeStyle = 'rgba(169, 154, 134, 0.35)';
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 每個領域的扇形色塊背景，用該領域自己的顏色淡淡標示範圍
  const half = Math.PI / n;
  DOMAINS.forEach((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle - half, angle + half);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(d.color, 0.16);
    ctx.fill();
  });

  // 圓形格線環
  ctx.strokeStyle = 'rgba(169, 154, 134, 0.28)';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (radius * ring) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 輻射線與標籤（深色文字，在淡色底板上清楚可讀）
  ctx.fillStyle = '#4a3f35';
  ctx.font = '600 13px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  DOMAINS.forEach((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.strokeStyle = hexToRgba(d.color, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
    const lx = cx + (radius + 24) * Math.cos(angle);
    const ly = cy + (radius + 24) * Math.sin(angle);
    ctx.fillText(`${d.icon}${d.name}`, lx, ly);
  });

  // 依等級畫出的數值多邊形
  const points = DOMAINS.map((d, i) => {
    const level = levelFromExp(state.skills[d.key].exp).level;
    const r = (radius * Math.min(level, maxLevel)) / maxLevel;
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), color: d.color };
  });

  ctx.beginPath();
  points.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.closePath();
  ctx.fillStyle = 'rgba(227, 171, 92, 0.25)';
  ctx.strokeStyle = '#e3ab5c';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  // 各頂點加上帶白邊的圓形節點，顏色對應該領域
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  });

  // 中心節點
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#e3ab5c';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}
