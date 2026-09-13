// 人生領域（技能）設定
const DOMAINS = [
  { key: 'reading',  name: '學業閱讀', icon: '📖', color: '#7dd3fc' },
  { key: 'career',   name: '事業/工作', icon: '💼', color: '#fbbf24' },
  { key: 'health',   name: '健康/體能', icon: '💪', color: '#86efac' },
  { key: 'finance',  name: '財務',     icon: '💰', color: '#fca5a5' },
  { key: 'social',   name: '人際/家庭', icon: '❤️', color: '#c4b5fd' },
];

const TASK_EXP = { easy: 10, normal: 15, hard: 25 };
const EXP_PER_PAGE = 2;
const BOOK_FINISH_BONUS = 100;
const EVENT_EXP = 15;
const GOLD_RATE = 0.5; // 每 1 EXP 換算多少金幣
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const MONTH_NAMES_ZH = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const WEEKDAY_NAMES_ZH = ['日','一','二','三','四','五','六'];

function goldFor(exp) {
  return Math.round(exp * GOLD_RATE);
}

// 成就定義：condition 收到 state，回傳 true/false
const ACHIEVEMENTS = [
  { id: 'first_task',    icon: '🎯', name: '起步',     desc: '完成第一個任務',
    condition: s => s.stats.tasksCompleted >= 1 },
  { id: 'task_master_10', icon: '🏅', name: '行動派',   desc: '累計完成 10 個任務',
    condition: s => s.stats.tasksCompleted >= 10 },
  { id: 'task_master_50', icon: '🏆', name: '執行大師', desc: '累計完成 50 個任務',
    condition: s => s.stats.tasksCompleted >= 50 },
  { id: 'streak_3',  icon: '🔥',  name: '小有恆心', desc: '連續 3 天有行動',
    condition: s => s.streak.count >= 3 },
  { id: 'streak_7',  icon: '🔥🔥', name: '養成習慣', desc: '連續 7 天有行動',
    condition: s => s.streak.count >= 7 },
  { id: 'streak_30', icon: '🔥🔥🔥', name: '意志如鋼', desc: '連續 30 天有行動',
    condition: s => s.streak.count >= 30 },
  { id: 'bookworm_1', icon: '📚', name: '初次完讀', desc: '讀完第一本書',
    condition: s => s.books.filter(b => b.done).length >= 1 },
  { id: 'bookworm_5', icon: '📖', name: '書蟲',     desc: '讀完 5 本書',
    condition: s => s.books.filter(b => b.done).length >= 5 },
  { id: 'skill_lv5',  icon: '⭐', name: '嶄露頭角', desc: '任一技能達到 Lv.5',
    condition: s => DOMAINS.some(d => levelFromExp(s.skills[d.key].exp).level >= 5) },
  { id: 'skill_lv10', icon: '🌟', name: '登峰造極', desc: '任一技能達到 Lv.10',
    condition: s => DOMAINS.some(d => levelFromExp(s.skills[d.key].exp).level >= 10) },
  { id: 'balanced_lv2', icon: '🌈', name: '全能發展', desc: '五項技能都達到 Lv.2',
    condition: s => DOMAINS.every(d => levelFromExp(s.skills[d.key].exp).level >= 2) },
  { id: 'first_reward', icon: '🎁', name: '犒賞自己', desc: '兌換第一個獎勵',
    condition: s => s.stats.rewardsRedeemed >= 1 },
  { id: 'habit_streak_7', icon: '🔁', name: '習慣成自然', desc: '任一習慣連續 7 天完成',
    condition: s => (s.habits || []).some(h => (h.streak || 0) >= 7) },
  { id: 'planner', icon: '🗓️', name: '規劃師', desc: '在行事曆安排第一個活動或截止日',
    condition: s => (s.events || []).length >= 1 },
];

// 每個技能等級所需經驗值（等級 L 需要累積 EXP）
function expForLevel(level) {
  return 100 * level;
}

function levelFromExp(exp) {
  let level = 1;
  while (exp >= expForLevel(level)) {
    exp -= expForLevel(level);
    level++;
  }
  return { level, expIntoLevel: exp, expToNext: expForLevel(level) };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
