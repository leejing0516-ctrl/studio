// AI 教練使用者管理：管理者在 app 裡核准／移除誰能用 AI 教練，有待審申請時導覽列會出現紅點
let _aiAdmin = { isAdmin: false, pending: [], allowed: [], envAllowed: [] };
let _aiAdminLastRefresh = 0;

async function callAIService(payload) {
  const endpoint = state.assistant.aiEndpoint;
  if (!endpoint) throw new Error('尚未設定 AI 服務網址');
  if (typeof _cloudUser === 'undefined' || !_cloudUser) throw new Error('尚未登入');
  const idToken = await _cloudUser.getIdToken();
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || ('錯誤 ' + resp.status));
  return data;
}

// 試用者第一次被擋下時自動送出開通申請（同一個 session 只送一次）
let _aiRequestSent = false;
function sendAIAccessRequest() {
  if (_aiRequestSent) return;
  _aiRequestSent = true;
  callAIService({ action: 'request' }).catch(() => { _aiRequestSent = false; });
}

async function refreshAIAdminStatus() {
  _aiAdminLastRefresh = Date.now();
  try {
    const st = await callAIService({ action: 'status' });
    _aiAdmin.isAdmin = !!st.isAdmin;
    if (_aiAdmin.isAdmin) {
      const list = await callAIService({ action: 'admin_list' });
      _aiAdmin.pending = list.pending || [];
      _aiAdmin.allowed = list.allowed || [];
      _aiAdmin.envAllowed = list.envAllowed || [];
    }
  } catch (e) {
    _aiAdmin.isAdmin = false;
  }
  renderAIAdmin();
}

function renderAIAdmin() {
  const section = document.getElementById('ai-admin-section');
  const listEl = document.getElementById('ai-admin-list');
  const showDot = _aiAdmin.isAdmin && _aiAdmin.pending.length > 0;
  document.querySelectorAll('.tab-btn[data-tab="tab-adventure"], .tab-btn[data-tab="tab-platform"]')
    .forEach(b => b.classList.toggle('has-alert', showDot));
  if (!section || !listEl) return;
  section.style.display = _aiAdmin.isAdmin ? '' : 'none';
  if (!_aiAdmin.isAdmin) return;

  const row = (email, buttons) => `<li class="ai-admin-row"><span class="ai-admin-email">${escapeHtml(email)}</span>${buttons}</li>`;
  const btn = (act, email, label, cls) =>
    `<button type="button" class="btn small ${cls || ''}" data-ai-act="${act}" data-email="${escapeHtml(email)}">${label}</button>`;

  listEl.innerHTML = `
    <h4 class="ai-admin-sub">待審申請（${_aiAdmin.pending.length}）</h4>
    <ul class="ai-admin-ul">${_aiAdmin.pending.length
      ? _aiAdmin.pending.map(p => row(p.email, btn('admin_approve', p.email, '核准') + btn('admin_reject', p.email, '拒絕', 'secondary'))).join('')
      : '<li class="empty-hint">目前沒有待審的申請</li>'}</ul>
    <h4 class="ai-admin-sub">已開通（${_aiAdmin.allowed.length + _aiAdmin.envAllowed.length}）</h4>
    <ul class="ai-admin-ul">${(_aiAdmin.allowed.length || _aiAdmin.envAllowed.length)
      ? _aiAdmin.allowed.map(p => row(p.email, btn('admin_remove', p.email, '移除', 'secondary'))).join('')
        + _aiAdmin.envAllowed.map(e => row(e, '<span class="tab-hint">固定名單（在 Cloudflare 設定）</span>')).join('')
      : '<li class="empty-hint">還沒有開通任何人</li>'}</ul>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('ai-admin-list');
  if (listEl) {
    listEl.addEventListener('click', async e => {
      const b = e.target.closest('[data-ai-act]');
      if (!b) return;
      b.disabled = true;
      try {
        await callAIService({ action: b.dataset.aiAct, email: b.dataset.email });
      } catch (err) {
        alert('操作失敗：' + err.message);
      }
      await refreshAIAdminStatus();
    });
  }
  // 登入狀態就緒後檢查一次；之後回到 app 或打開平台設定頁時，距離上次超過 30 秒就再檢查
  setTimeout(refreshAIAdminStatus, 3000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - _aiAdminLastRefresh > 30000) refreshAIAdminStatus();
  });
  document.querySelectorAll('.tab-btn[data-tab="tab-platform"]').forEach(b =>
    b.addEventListener('click', () => { if (Date.now() - _aiAdminLastRefresh > 30000) refreshAIAdminStatus(); }));
});
