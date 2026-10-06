// 每天早上 6 點推播提醒：
// 1. app 會把「未來 8 天每天的待辦摘要」存在手機的 IndexedDB 裡（Service Worker 收到推播時讀它）
// 2. 開啟提醒＝取得通知權限＋建立推播訂閱，並把訂閱登記到 Worker（Worker 每天早上 6 點對所有訂閱發推播）
const VAPID_PUBLIC_KEY = 'BBVOJ0c6MfS-B8mQlUKP7KV0pvP0EK1COch4gew1U201hnA-h05gueF5kTY_nJEfnKOXSvVI-Hp0OMyaoxkR-9M';
const PUSH_SUMMARY_DAYS = 8;

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function pushIdbPut(key, value) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('life_rpg_push', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// 未來幾天「還沒完成」的項目數與前三項標題
function buildPushSummaries(state) {
  const out = {};
  const d = new Date();
  for (let i = 0; i < PUSH_SUMMARY_DAYS; i++) {
    const ds = formatDate(d);
    const undone = getChecklistForDate(state, ds).filter(it => !it.done);
    out[ds] = { count: undone.length, titles: undone.slice(0, 3).map(it => it.title) };
    d.setDate(d.getDate() + 1);
  }
  return out;
}

let _pushSummaryTimer = null;
function flushPushSummaries(state) {
  clearTimeout(_pushSummaryTimer);
  if (!('indexedDB' in window)) return Promise.resolve();
  return pushIdbPut('summaries', buildPushSummaries(state)).catch(() => {});
}
function schedulePushSummarySync(state) {
  clearTimeout(_pushSummaryTimer);
  _pushSummaryTimer = setTimeout(() => flushPushSummaries(state), 1500);
}

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function getPushRegistration() {
  return navigator.serviceWorker.ready;
}

async function enableDailyPush() {
  if (!_cloudUser) throw new Error('請先登入雲端帳號（右上角 ☁️），推播才能綁定到你的裝置');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('尚未允許通知權限。請到 iPhone「設定」→「通知」→ 這個 app 開啟「允許通知」');
  const reg = await getPushRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
  }
  await flushPushSummaries(state);
  await callAIService({ action: 'push_subscribe', subscription: sub.toJSON() });
}

async function disableDailyPush() {
  const reg = await getPushRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  try { await callAIService({ action: 'push_unsubscribe', endpoint }); } catch (e) {}
}

function fmtDateTime(ms) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 顯示伺服器端最後一次排程與你這台裝置的推播結果，沒收到通知時可以對照；同時把這台裝置的訂閱重新登記一次，
// 避免伺服器上的紀錄因為暫時性錯誤遺失
async function refreshPushDiagnostics() {
  const el = document.getElementById('push-diag');
  if (!el || !_cloudUser) return;
  try {
    const reg = await getPushRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) await callAIService({ action: 'push_subscribe', subscription: sub.toJSON() });
    const r = await callAIService({ action: 'push_status' });
    const lines = [];
    lines.push(r.lastCron
      ? `伺服器上次排程：${fmtDateTime(r.lastCron.at)}（成功 ${r.lastCron.ok}、失敗 ${r.lastCron.fail}、失效 ${r.lastCron.gone}${r.lastCron.error ? '，錯誤：' + r.lastCron.error : ''}）`
      : '伺服器還沒有執行過排程（Cron Trigger 可能沒設定好，或還沒到早上 6 點）');
    if (!r.mine.length) lines.push('伺服器上找不到你這台裝置的訂閱，請按「關閉推播」再重新開啟');
    r.mine.forEach(m => lines.push(m.lastAt
      ? `你的裝置最後一次推播：${fmtDateTime(m.lastAt)}，蘋果回應 ${m.lastStatus}（${m.lastStatus >= 200 && m.lastStatus < 300 ? '已送達蘋果' : '送出失敗'}）`
      : '你的裝置還沒有收過推播'));
    el.textContent = lines.join('\n');
    el.style.display = 'block';
  } catch (e) {
    el.style.display = 'none';
  }
}

async function renderPushSettings() {
  const statusEl = document.getElementById('push-status');
  const enableBtn = document.getElementById('push-enable');
  const testBtn = document.getElementById('push-test');
  const offBtn = document.getElementById('push-disable');
  if (!statusEl) return;
  [enableBtn, testBtn, offBtn].forEach(b => { b.style.display = 'none'; });

  if (!pushSupported()) {
    statusEl.textContent = '這個瀏覽器不支援推播（iPhone 需要 iOS 16.4 以上，並用「加入主畫面」的圖示開啟）。';
    return;
  }
  if (!isStandaloneApp()) {
    statusEl.textContent = '請先把 app「加入主畫面」，並從桌面圖示開啟，才能開啟推播提醒。';
    return;
  }
  let subscribed = false;
  try { subscribed = !!(await (await getPushRegistration()).pushManager.getSubscription()) && Notification.permission === 'granted'; } catch (e) {}
  if (subscribed) {
    statusEl.textContent = '✅ 已開啟：每天早上 6 點左右會推播今天的待辦。';
    testBtn.style.display = '';
    offBtn.style.display = '';
    refreshPushDiagnostics();
  } else if (Notification.permission === 'denied') {
    statusEl.textContent = '你先前拒絕了通知權限。請到 iPhone「設定」→「通知」→ 找到這個 app → 開啟「允許通知」。';
  } else {
    statusEl.textContent = '尚未開啟。按下按鈕後請選「允許」。需要先登入雲端帳號。';
    enableBtn.style.display = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  const withBusy = async (btn, busyText, fn) => {
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = busyText;
    try { await fn(); } catch (e) { alert(e.message); }
    btn.disabled = false;
    btn.textContent = old;
    renderPushSettings();
  };
  document.getElementById('push-enable').addEventListener('click', e =>
    withBusy(e.currentTarget, '開啟中…', async () => { await enableDailyPush(); alert('已開啟！可以按「立即測試推播」確認有沒有收到。'); }));
  document.getElementById('push-disable').addEventListener('click', e =>
    withBusy(e.currentTarget, '關閉中…', disableDailyPush));
  document.getElementById('push-test').addEventListener('click', e =>
    withBusy(e.currentTarget, '發送中…', async () => {
      await flushPushSummaries(state);
      const r = await callAIService({ action: 'push_test' });
      if (!r.total) throw new Error('伺服器上找不到你的推播訂閱，請先關閉再重新開啟提醒');
      alert(r.sent ? '已送出測試推播，幾秒內應該會在手機上看到通知。' : '推播送出失敗，請稍後再試，或先關閉再重新開啟提醒。');
    }));

  renderPushSettings();
  document.querySelectorAll('.tab-btn[data-tab="tab-platform"]').forEach(b => b.addEventListener('click', renderPushSettings));
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushPushSummaries(state); });
});
