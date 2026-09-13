const STORAGE_KEY = 'life_rpg_state_v2';

function defaultState() {
  const skills = {};
  DOMAINS.forEach(d => { skills[d.key] = { exp: 0, lastGain: null }; });
  return {
    character: { name: '我的角色' },
    skills,
    gold: 0,
    tasks: [],           // { id, domain, text, difficulty, date, done }
    books: [],           // { id, title, totalPages, currentPage, done }
    habits: [],          // { id, name, domain, difficulty, streak, lastDoneDate }
    habitCompletions: {}, // { "YYYY-MM-DD": { habitId: true } }
    readingCompletions: {}, // { "YYYY-MM-DD": { bookId: true } }
    rewards: [],          // { id, name, cost }
    achievements: [],      // unlocked achievement ids
    stats: { tasksCompleted: 0, rewardsRedeemed: 0 },
    streak: { count: 0, lastActiveDate: null },
    log: [],              // { date, text } 簡易活動紀錄，最多保留 50 筆
    assistant: { log: [], lastSuggestionDate: null, lastVisitDate: null },
    events: [],           // { id, title, domain, date, time, type: 'event'|'deadline', done, googleEventId }
    googleCalendar: { clientId: '' },
    projects: [],         // { id, title, domain, deadline, granularity, createdDate, subtasks: [{id,title,dueDate,done}] }
    updatedAt: 0,         // 用於雲端同步時比較新舊
  };
}

function normalizeState(parsed) {
  const base = defaultState();
  DOMAINS.forEach(d => {
    parsed.skills = parsed.skills || {};
    if (!parsed.skills[d.key]) parsed.skills[d.key] = { exp: 0, lastGain: null };
    if (parsed.skills[d.key].lastGain === undefined) parsed.skills[d.key].lastGain = null;
  });
  (parsed.tasks || []).forEach(t => { if (t.googleEventId === undefined) t.googleEventId = null; });
  (parsed.habits || []).forEach(h => { if (!h.recurrence) h.recurrence = { freq: 'daily', startDate: h.lastDoneDate || todayStr() }; });
  (parsed.books || []).forEach(b => { if (b.readingPlan === undefined) b.readingPlan = null; });
  const merged = Object.assign({}, base, parsed);
  merged.stats = Object.assign({}, base.stats, parsed.stats);
  merged.streak = Object.assign({}, base.streak, parsed.streak);
  merged.assistant = Object.assign({}, base.assistant, parsed.assistant);
  merged.googleCalendar = Object.assign({}, base.googleCalendar, parsed.googleCalendar);
  return merged;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return migrateOldState(defaultState());
    return normalizeState(JSON.parse(raw));
  } catch (e) {
    console.error('讀取存檔失敗，使用預設狀態', e);
    return defaultState();
  }
}

// 從舊版 (v1) 存檔搬移資料，避免使用者第一版的紀錄憑空消失
function migrateOldState(base) {
  try {
    const raw = localStorage.getItem('life_rpg_state_v1');
    if (!raw) return base;
    const old = JSON.parse(raw);
    if (old.skills) DOMAINS.forEach(d => { if (old.skills[d.key]) base.skills[d.key] = old.skills[d.key]; });
    if (old.character) base.character = old.character;
    if (old.tasks) base.tasks = old.tasks;
    if (old.books) base.books = old.books;
    if (old.streak) base.streak = old.streak;
    if (old.log) base.log = old.log;
    return base;
  } catch (e) {
    return base;
  }
}

function saveState(state) {
  state.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (typeof scheduleCloudSave === 'function') scheduleCloudSave();
}

function addLog(state, text) {
  state.log.unshift({ date: todayStr(), text });
  if (state.log.length > 50) state.log.length = 50;
}

function bumpStreak(state) {
  const today = todayStr();
  if (state.streak.lastActiveDate === today) return;
  if (state.streak.lastActiveDate === yesterdayStr()) {
    state.streak.count += 1;
  } else {
    state.streak.count = 1;
  }
  state.streak.lastActiveDate = today;
}

function gainExp(state, domainKey, amount) {
  state.skills[domainKey].exp = Math.max(0, state.skills[domainKey].exp + amount);
  state.gold = Math.max(0, state.gold + goldFor(amount));
  if (amount > 0) {
    bumpStreak(state);
    state.skills[domainKey].lastGain = todayStr();
  }
}

function overallLevelInfo(state) {
  const totalExp = DOMAINS.reduce((sum, d) => sum + state.skills[d.key].exp, 0);
  return levelFromExp(totalExp);
}

function addAssistantMessage(state, text, mood) {
  state.assistant.log.unshift({ date: todayStr(), time: Date.now(), text, mood: mood || 'tip' });
  if (state.assistant.log.length > 40) state.assistant.log.length = 40;
}

// 回傳新解鎖的成就陣列，並把它們加進 state.achievements
function checkAchievements(state) {
  const unlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!state.achievements.includes(a.id) && a.condition(state)) {
      state.achievements.push(a.id);
      unlocked.push(a);
    }
  });
  return unlocked;
}
