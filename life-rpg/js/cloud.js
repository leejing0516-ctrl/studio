// 沿用現有 Firebase 專案（finlit-classroom）的公開用戶端設定，僅用來做帳號登入與資料同步
const CLOUD_FIREBASE_CONFIG = {
  projectId: 'finlit-classroom',
  appId: '1:388933518275:web:9f1e38cb6dca37a8437376',
  apiKey: 'AIzaSyBT3glJaZlpOozoZc9aL0CIJhpyO17uiMI',
  authDomain: 'finlit-classroom.firebaseapp.com',
  messagingSenderId: '388933518275',
};

let _cloudAuth = null;
let _cloudDb = null;
let _cloudUser = null;
let _cloudSaveTimer = null;
let _cloudApplyingRemote = false;
let _cloudUnsub = null;
let _cloudLastSeenAt = 0; // 上一次跟雲端對齊時，雲端資料的 updatedAt

// 把 source 裡「sinceMs 之後才新增」的打卡與活動紀錄補進 target。
// 打卡值本身就是打卡當下的時間戳，所以能分辨「對方之後才新增的」跟「我這邊刻意取消的」，
// 避免手機與網頁兩邊各自用舊資料存檔時，把對方的完成紀錄整個蓋掉
function mergeNewCompletions(target, source, sinceMs) {
  let changed = false;
  ['habitCompletions', 'readingCompletions'].forEach(key => {
    const src = source[key] || {};
    target[key] = target[key] || {};
    Object.keys(src).forEach(date => {
      Object.keys(src[date] || {}).forEach(id => {
        const t = src[date][id];
        if (typeof t === 'number' && t > sinceMs && !(target[key][date] || {})[id]) {
          (target[key][date] = target[key][date] || {})[id] = t;
          changed = true;
        }
      });
    });
  });
  target.log = target.log || [];
  const seen = new Set(target.log.map(l => l.time + '|' + l.text));
  (source.log || []).forEach(l => {
    if (l.time && l.time > sinceMs && !seen.has(l.time + '|' + l.text)) { target.log.push(l); changed = true; }
  });
  if (changed) {
    target.log.sort((a, b) => (b.time || 0) - (a.time || 0));
    if (target.log.length > LOG_LIMIT) target.log.length = LOG_LIMIT;
  }
  return changed;
}

const FIREBASE_SCRIPTS = [
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-compat.js',
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // 動態載入也要照順序執行（app 要先於 auth、firestore）
    el.onload = resolve;
    el.onerror = () => reject(new Error('載入失敗：' + src));
    document.head.appendChild(el);
  });
}

// Firebase 在背景載入：畫面與本機功能先能用，載入成功後才啟用雲端登入與同步；
// 網路不穩載入失敗時，等網路恢復（online 事件）再試一次
function initCloud() {
  if (window.firebase) { startCloud(); return; }
  Promise.all(FIREBASE_SCRIPTS.map(loadScript))
    .then(startCloud)
    .catch(e => {
      console.error('雲端服務載入失敗，等網路恢復後重試', e);
      window.addEventListener('online', initCloud, { once: true });
    });
}

function startCloud() {
  if (_cloudAuth || !window.firebase) return;
  try {
    firebase.initializeApp(CLOUD_FIREBASE_CONFIG);
    _cloudAuth = firebase.auth();
    _cloudDb = firebase.firestore();
  } catch (e) {
    console.error('Firebase 初始化失敗', e);
    return;
  }

  _cloudAuth.onAuthStateChanged(handleAuthChange);
}

const CLOUD_UID_KEY = 'life_rpg_last_uid';

// 這台裝置上的資料屬於別的帳號（換帳號登入，或登出）時，把本機資料清成全新狀態，
// 避免上一個帳號的資料留在畫面上，甚至被推進新帳號的雲端
function resetLocalDataForAccountSwitch() {
  clearTimeout(_cloudSaveTimer);
  if (_cloudUnsub) { _cloudUnsub(); _cloudUnsub = null; }
  _cloudApplyingRemote = true;
  try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('life_rpg_ai_request_at'); } catch (e) {}
  state = defaultState();
  _cloudLastSeenAt = 0;
  if (typeof _gcalAccessToken !== 'undefined') _gcalAccessToken = null;
  if (typeof _aiAdmin !== 'undefined') { _aiAdmin.isAdmin = false; _aiAdmin.pending = []; _aiAdmin.allowed = []; _aiAdmin.envAllowed = []; }
  renderAll();
  if (typeof renderAIAdmin === 'function') renderAIAdmin();
  _cloudApplyingRemote = false;
}

function handleAuthChange(user) {
  const prev = _cloudUser;
  _cloudUser = user;
  updateCloudUI();
  if (user) {
    let lastUid = null;
    try { lastUid = localStorage.getItem(CLOUD_UID_KEY); } catch (e) {}
    if (lastUid && lastUid !== user.uid) resetLocalDataForAccountSwitch();
    try { localStorage.setItem(CLOUD_UID_KEY, user.uid); } catch (e) {}
    syncOnLogin(user);
    attachCloudListener(user);
  } else {
    if (_cloudUnsub) {
      _cloudUnsub();
      _cloudUnsub = null;
    }
    // 從「已登入」變成「登出」才清資料；一開始就沒登入的訪客，本機資料要保留
    if (prev) {
      resetLocalDataForAccountSwitch();
      try { localStorage.removeItem(CLOUD_UID_KEY); } catch (e) {}
    }
  }
}

// 即時監聽雲端文件：只要其他裝置（手機/電腦）推送了更新的資料，這個分頁就會自動套用，
// 不用手動重新整理，也避免自己這邊的舊資料之後不小心把別台裝置的新完成紀錄蓋掉
function attachCloudListener(user) {
  if (_cloudUnsub) { _cloudUnsub(); _cloudUnsub = null; }
  const docRef = _cloudDb.collection('life_rpg_users').doc(user.uid);
  _cloudUnsub = docRef.onSnapshot(snap => {
    if (!snap.exists) return;
    const data = snap.data();
    if (!data || !data.state) return;
    const cloudState = data.state;
    if ((cloudState.updatedAt || 0) > (state.updatedAt || 0)) {
      _cloudApplyingRemote = true;
      const merged = normalizeState(cloudState);
      const keptLocal = mergeNewCompletions(merged, state, cloudState.updatedAt || 0);
      state = merged;
      _cloudLastSeenAt = cloudState.updatedAt || 0;
      renderAll();
      _cloudApplyingRemote = false;
      setSyncStatus('✅ 已同步其他裝置的更新');
      if (keptLocal) saveState(state);
    }
  }, e => {
    console.error('雲端即時同步監聽失敗', e);
  });
}

function updateCloudUI() {
  const loggedOut = document.getElementById('cloud-logged-out');
  const loggedIn = document.getElementById('cloud-logged-in');
  if (!loggedOut || !loggedIn) return;
  if (_cloudUser) {
    loggedOut.style.display = 'none';
    loggedIn.style.display = 'block';
    document.getElementById('cloud-user-email').textContent = _cloudUser.email;
    scheduleCloudPanelAutoClose();
  } else {
    loggedOut.style.display = 'block';
    loggedIn.style.display = 'none';
  }
  const account = document.getElementById('account-section');
  if (account) {
    account.style.display = _cloudUser ? '' : 'none';
    const emailEl = document.getElementById('account-email');
    if (emailEl && _cloudUser) emailEl.textContent = _cloudUser.email;
  }
}

// 已登入的狀態卡片打開後 3 秒自動收起（還沒登入時要輸入帳密，不自動收）
let _cloudPanelTimer = null;
function scheduleCloudPanelAutoClose() {
  clearTimeout(_cloudPanelTimer);
  const panel = document.getElementById('cloud-panel');
  if (!_cloudUser || !panel || !panel.classList.contains('show')) return;
  _cloudPanelTimer = setTimeout(() => panel.classList.remove('show'), 3000);
}

// 修改密碼：Firebase 要求近期驗證過身分，所以先用目前密碼重新驗證再更新
async function cloudChangePassword(currentPassword, newPassword) {
  if (!_cloudUser) throw new Error('請先登入');
  try {
    const cred = firebase.auth.EmailAuthProvider.credential(_cloudUser.email, currentPassword);
    await withTimeout(_cloudUser.reauthenticateWithCredential(cred), 15000, '驗證逾時，請檢查網路連線後再試一次');
    await withTimeout(_cloudUser.updatePassword(newPassword), 15000, '修改逾時，請檢查網路連線後再試一次');
  } catch (e) {
    if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') throw new Error('目前的密碼不正確');
    throw new Error(translateAuthError(e));
  }
}

function setSyncStatus(text) {
  const el = document.getElementById('cloud-sync-status');
  if (el) el.textContent = text;
}

function showCloudError(msg) {
  const el = document.getElementById('cloud-error');
  if (!el) return;
  el.style.color = '#e2685f';
  el.textContent = msg;
  el.style.display = 'block';
}

function hideCloudError() {
  const el = document.getElementById('cloud-error');
  if (el) el.style.display = 'none';
}

function translateAuthError(e) {
  const map = {
    'auth/email-already-in-use': '這個信箱已經註冊過了，改用「登入」',
    'auth/invalid-email': '信箱格式不正確',
    'auth/weak-password': '密碼至少要 6 碼',
    'auth/wrong-password': '密碼錯誤',
    'auth/user-not-found': '找不到這個帳號，先按「註冊新帳號」',
    'auth/invalid-credential': '帳號或密碼錯誤',
    'auth/network-request-failed': '網路連線失敗，請稍後再試',
    'auth/requires-recent-login': '為了安全，請先登出再重新登入後，再修改密碼',
    'auth/too-many-requests': '嘗試次數過多，請稍後再試',
  };
  if (map[e.code]) return map[e.code];
  if (!e.code) return e.message; // 自訂逾時等訊息本身已經是完整的中文句子
  return '發生錯誤：' + e.message;
}

// 手機網路較慢或 Safari 私密瀏覽模式下 Firebase Auth 偶爾會整個卡住不回應，
// 用逾時保護確保使用者一定會看到結果（成功/失敗/逾時），不會卡在按鈕動不了
function withTimeout(promise, ms, timeoutMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject({ message: timeoutMessage }), ms)),
  ]);
}

async function cloudSignUp(email, password) {
  if (!_cloudAuth) { showCloudError('雲端服務尚未準備好，請重新整理頁面後再試一次'); return; }
  try {
    await withTimeout(
      _cloudAuth.createUserWithEmailAndPassword(email, password),
      15000,
      '註冊逾時，請檢查網路連線後再試一次'
    );
    hideCloudError();
  } catch (e) {
    showCloudError(translateAuthError(e));
  }
}

async function cloudSignIn(email, password) {
  if (!_cloudAuth) { showCloudError('雲端服務尚未準備好，請重新整理頁面後再試一次'); return; }
  try {
    await withTimeout(
      _cloudAuth.signInWithEmailAndPassword(email, password),
      15000,
      '登入逾時，請檢查網路連線後再試一次'
    );
    hideCloudError();
  } catch (e) {
    showCloudError(translateAuthError(e));
  }
}

async function cloudSignOut() {
  if (!_cloudAuth) return;
  clearTimeout(_cloudSaveTimer);
  const synced = await pushStateToCloud(); // 登出前先把最後的變更推上雲端
  const msg = synced
    ? '登出後，這台裝置上的資料會清除（資料已備份在雲端，再次登入就會回來）。確定要登出嗎？'
    : '⚠️ 資料還沒有成功同步到雲端，現在登出會遺失這台裝置上尚未同步的資料。確定仍要登出嗎？';
  if (!confirm(msg)) return;
  _cloudAuth.signOut();
}

async function cloudResetPassword(email) {
  if (!_cloudAuth) { showCloudError('雲端服務尚未準備好，請重新整理頁面後再試一次'); return; }
  if (!email) { showCloudError('請先在上面輸入你的信箱'); return; }
  try {
    await _cloudAuth.sendPasswordResetEmail(email);
    hideCloudError();
    const el = document.getElementById('cloud-error');
    if (el) {
      el.style.color = '#4fae7d';
      el.textContent = `如果 ${email} 有註冊過，幾分鐘內會收到重設密碼信（寄件者是 noreply@…firebaseapp.com）。沒看到請檢查垃圾郵件匣，也確認信箱有沒有打錯。`;
      el.style.display = 'block';
    }
  } catch (e) {
    showCloudError(translateAuthError(e));
  }
}

// 登入時：比較雲端與本機哪個較新，決定要拉下來還是推上去
async function syncOnLogin(user) {
  setSyncStatus('同步中…');
  try {
    const docRef = _cloudDb.collection('life_rpg_users').doc(user.uid);
    const snap = await docRef.get();
    if (snap.exists && snap.data().state) {
      const cloudState = snap.data().state;
      if ((cloudState.updatedAt || 0) > (state.updatedAt || 0)) {
        _cloudApplyingRemote = true;
        const merged = normalizeState(cloudState);
        const keptLocal = mergeNewCompletions(merged, state, cloudState.updatedAt || 0);
        state = merged;
        _cloudLastSeenAt = cloudState.updatedAt || 0;
        renderAll();
        _cloudApplyingRemote = false;
        setSyncStatus('✅ 已從雲端同步最新資料');
        if (keptLocal) saveState(state);
        return;
      }
      _cloudLastSeenAt = cloudState.updatedAt || 0;
    }
    await pushStateToCloud();
    setSyncStatus('✅ 已同步');
  } catch (e) {
    console.error('雲端同步失敗', e);
    setSyncStatus('⚠️ 同步失敗，稍後會自動重試');
  }
}

async function pushStateToCloud() {
  if (!_cloudUser || !_cloudDb) return false;
  try {
    const docRef = _cloudDb.collection('life_rpg_users').doc(_cloudUser.uid);
    // 推送前先看雲端有沒有別台裝置在我們上次對齊之後新增的打卡，有的話先合併進來再推，避免蓋掉
    if (_cloudLastSeenAt > 0) {
      const snap = await docRef.get();
      const remote = snap.exists && snap.data().state;
      if (remote && (remote.updatedAt || 0) > _cloudLastSeenAt) {
        if (mergeNewCompletions(state, remote, _cloudLastSeenAt)) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
          renderAll();
        }
      }
    }
    await docRef.set({ state: JSON.parse(JSON.stringify(state)) });
    _cloudLastSeenAt = state.updatedAt || 0;
    return true;
  } catch (e) {
    console.error('推送到雲端失敗', e);
    setSyncStatus('⚠️ 同步失敗');
    return false;
  }
}

// 每次 saveState 都會呼叫這個；未登入時不做事，登入時 debounce 後推送雲端
function scheduleCloudSave() {
  if (!_cloudUser || _cloudApplyingRemote) return;
  setSyncStatus('同步中…');
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(async () => {
    await pushStateToCloud();
    setSyncStatus('✅ 已同步');
  }, 1500);
}
