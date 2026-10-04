// 主畫面圖示右上角的紅色數字：顯示今天還沒完成的項目數量
// 靠瀏覽器的 Badging API（iOS 16.4 以上、「加入主畫面」的 App 才支援，且需要先允許通知權限）。
// 純網頁沒有背景執行能力，數字只會在 app 開著、或離開 app 的當下更新。
function getUndoneTodayCount(state) {
  return getTodayChecklist(state).filter(it => !it.done).length;
}

function badgeSupported() {
  return 'setAppBadge' in navigator;
}

function updateAppBadge(state) {
  if (!badgeSupported()) return;
  const count = getUndoneTodayCount(state);
  try {
    if (count > 0) navigator.setAppBadge(count).catch(() => {});
    else navigator.clearAppBadge().catch(() => {});
  } catch (e) {}
}

function renderBadgeSettings() {
  const statusEl = document.getElementById('badge-status');
  const btn = document.getElementById('badge-enable');
  if (!statusEl || !btn) return;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (!badgeSupported()) {
    statusEl.textContent = '這個瀏覽器不支援圖示數字（iPhone 需要 iOS 16.4 以上，並用「加入主畫面」的圖示開啟）。';
    btn.style.display = 'none';
  } else if (!standalone) {
    statusEl.textContent = '請先把 app「加入主畫面」，並從桌面圖示開啟，才能設定圖示數字。';
    btn.style.display = 'none';
  } else if (!('Notification' in window)) {
    statusEl.textContent = '這個環境不支援通知權限，無法顯示圖示數字。';
    btn.style.display = 'none';
  } else if (Notification.permission === 'granted') {
    statusEl.textContent = `✅ 已開啟。目前還有 ${getUndoneTodayCount(state)} 項今日待辦，數字會在你開啟或離開 app 時更新。`;
    btn.style.display = 'none';
  } else if (Notification.permission === 'denied') {
    statusEl.textContent = '你先前拒絕了通知權限。請到 iPhone「設定」→「通知」→ 找到這個 app → 開啟「允許通知」與「標章」。';
    btn.style.display = 'none';
  } else {
    statusEl.textContent = '尚未開啟。按下按鈕後，請在跳出的視窗選「允許」。這個 app 只用權限來顯示數字，不會發通知打擾你。';
    btn.style.display = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('badge-enable');
  if (btn) btn.addEventListener('click', async () => {
    try { await Notification.requestPermission(); } catch (e) {}
    updateAppBadge(state);
    renderBadgeSettings();
  });
  // 離開 app 的當下更新一次，這樣回到主畫面時數字是最新的
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) updateAppBadge(state);
  });
  window.addEventListener('pagehide', () => updateAppBadge(state));
});
