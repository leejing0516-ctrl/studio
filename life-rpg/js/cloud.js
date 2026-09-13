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

function initCloud() {
  if (!window.firebase) return;
  try {
    firebase.initializeApp(CLOUD_FIREBASE_CONFIG);
    _cloudAuth = firebase.auth();
    _cloudDb = firebase.firestore();
  } catch (e) {
    console.error('Firebase 初始化失敗', e);
    return;
  }

  _cloudAuth.onAuthStateChanged(user => {
    _cloudUser = user;
    updateCloudUI();
    if (user) syncOnLogin(user);
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
  } else {
    loggedOut.style.display = 'block';
    loggedIn.style.display = 'none';
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
  };
  return map[e.code] || ('發生錯誤：' + e.message);
}

async function cloudSignUp(email, password) {
  if (!_cloudAuth) return;
  try {
    await _cloudAuth.createUserWithEmailAndPassword(email, password);
    hideCloudError();
  } catch (e) {
    showCloudError(translateAuthError(e));
  }
}

async function cloudSignIn(email, password) {
  if (!_cloudAuth) return;
  try {
    await _cloudAuth.signInWithEmailAndPassword(email, password);
    hideCloudError();
  } catch (e) {
    showCloudError(translateAuthError(e));
  }
}

function cloudSignOut() {
  if (_cloudAuth) _cloudAuth.signOut();
}

async function cloudResetPassword(email) {
  if (!_cloudAuth) return;
  if (!email) { showCloudError('請先在上面輸入你的信箱'); return; }
  try {
    await _cloudAuth.sendPasswordResetEmail(email);
    hideCloudError();
    const el = document.getElementById('cloud-error');
    if (el) {
      el.style.color = '#4fae7d';
      el.textContent = `已寄出重設密碼信到 ${email}，請到信箱點連結重設`;
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
        state = normalizeState(cloudState);
        renderAll();
        _cloudApplyingRemote = false;
        setSyncStatus('✅ 已從雲端同步最新資料');
        return;
      }
    }
    await pushStateToCloud();
    setSyncStatus('✅ 已同步');
  } catch (e) {
    console.error('雲端同步失敗', e);
    setSyncStatus('⚠️ 同步失敗，稍後會自動重試');
  }
}

async function pushStateToCloud() {
  if (!_cloudUser || !_cloudDb) return;
  try {
    await _cloudDb.collection('life_rpg_users').doc(_cloudUser.uid).set({ state: JSON.parse(JSON.stringify(state)) });
  } catch (e) {
    console.error('推送到雲端失敗', e);
    setSyncStatus('⚠️ 同步失敗');
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
