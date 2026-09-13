function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const GREETINGS = {
  morning: [
    '早安！新的一天，準備好迎接挑戰了嗎？☀️',
    '早安，先喝杯水，給今天一個好的開始吧！',
    '早安！今天想先從哪個領域下手呢？',
  ],
  afternoon: [
    '午安，過了一天的一半了，辛苦你了，繼續加油！',
    '午安！休息一下再出發，效率會更好喔。',
  ],
  evening: [
    '晚上好，今天過得如何？花點時間回顧一下吧 🌙',
    '晚上好，睡前留一點時間給自己也不錯。',
  ],
  night: [
    '這麼晚了，早點休息也是對自己的照顧喔 🌛',
    '夜深了，明天再繼續也沒關係，先好好休息。',
  ],
};

const WELCOME_BACK = [
  '好久不見！不管中間發生了什麼，現在回來就是最好的時機 🌱',
  '歡迎回來！生活總有起伏，重新開始永遠不嫌晚。',
  '你回來了，這就是最重要的事，我們慢慢來。',
];

const GENERIC_PRAISE = [
  '做得好！這一步很扎實 👏',
  '又前進一步了，你正在累積屬於自己的故事 ✨',
  '很棒，持續行動就是最強大的力量！',
  '太厲害了，為自己鼓掌一下吧 🎉',
  '這份努力，未來的你會感謝現在的你。',
  '穩穩地走，你已經比昨天更好了。',
];

const DOMAIN_FLAVOR = {
  reading: '知識又累積了一點，你的世界正在變大 📖',
  career:  '工作上又前進一步，專業感又提升了 💼',
  health:  '身體會記得你今天的努力 💪',
  finance: '理財這條路，穩紮穩打就是贏家 💰',
  social:  '願意花時間經營關係，是最溫柔的智慧 ❤️',
};

const STREAK_MILESTONES = [
  { at: 3,   text: '連續 3 天了，習慣正在慢慢成形！' },
  { at: 7,   text: '整整一週了！這就是「習慣」的樣子 🔥' },
  { at: 14,  text: '兩週的堅持，真的很不容易，你做到了！' },
  { at: 30,  text: '一個月的累積，你已經是不一樣的自己了 🌟' },
  { at: 60,  text: '兩個月的堅持，這已經是你生活的一部分了。' },
  { at: 100, text: '100 天！這是傳奇等級的堅持，太了不起了 👑' },
];

const NEGLECT_REMINDERS = [
  '已經有一段時間沒有安排「{domain}」相關的任務了，要不要今天挪一點時間給它？',
  '「{domain}」這個領域最近比較安靜，小小的一步也是進步喔。',
  '想到「{domain}」了嗎？不用多，今天做一點點就好。',
];

const ALL_DONE_MESSAGES = [
  '今天該完成的都完成了，真的辛苦了，好好休息吧 🎉',
  '漂亮，今天的目標都達成了！剩下的時間留給自己。',
];

const MOOD_RESPONSES = {
  good: [
    '太好了！帶著這份好心情，今天可以再多做一件想做的事。',
    '喜歡看到你這樣，保持下去！',
  ],
  tired: [
    '辛苦了，累的時候不用勉強自己全力衝刺，做一件小事就好，或是純粹休息也沒關係。',
    '累是正常的，你已經做得很好了，今天可以對自己溫柔一點。',
  ],
  giveup: [
    '會有這種念頭很正常，代表你在乎。先休息一下，明天再看看，不用今天就決定放棄或繼續。',
    '你已經走了這麼遠，不需要今天就做最終決定，給自己一點空間。',
  ],
  unsure: null, // 由 getDailySuggestion 動態產生
};

function timeOfDayKey() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

// 每天第一次打開時：問候 + 每日建議，寫進助理紀錄
function runDailyCheckIn(state) {
  const today = todayStr();
  const lastVisit = state.assistant.lastVisitDate;
  let greeting;
  if (lastVisit && lastVisit !== today && lastVisit !== yesterdayStr()) {
    greeting = pick(WELCOME_BACK);
  } else {
    greeting = pick(GREETINGS[timeOfDayKey()]);
  }
  state.assistant.lastVisitDate = today;

  if (state.assistant.lastSuggestionDate !== today) {
    addAssistantMessage(state, greeting, 'greeting');
    addAssistantMessage(state, buildDailySuggestion(state), 'suggestion');
    state.assistant.lastSuggestionDate = today;
  }
}

function buildDailySuggestion(state) {
  const today = todayStr();

  const undoneHabits = state.habits.filter(h => !(state.habitCompletions[today] || {})[h.id]);
  if (undoneHabits.length > 0) {
    const h = undoneHabits[0];
    return `今天的習慣「${h.name}」還沒打卡，別忘了給自己一個小小的勝利 ✅`;
  }

  const undoneTasks = state.tasks.filter(t => t.date === today && !t.done);
  if (undoneTasks.length > 0) {
    return `今天還有 ${undoneTasks.length} 個任務等著你，先挑一個最簡單的開始吧！`;
  }

  let neglected = null, oldestDate = today;
  DOMAINS.forEach(d => {
    const last = state.skills[d.key].lastGain;
    if (!last || last < oldestDate) { oldestDate = last || '0000-00-00'; neglected = d; }
  });
  if (neglected && (!state.skills[neglected.key].lastGain)) {
    return `還沒開始安排「${neglected.name}」呢，要不要今天新增第一個任務？`;
  }
  if (neglected) {
    return NEGLECT_REMINDERS[0].replace('{domain}', neglected.name);
  }

  return pick(ALL_DONE_MESSAGES);
}

function onTaskOrHabitComplete(state, domainKey) {
  const d = DOMAINS.find(d => d.key === domainKey);
  const text = Math.random() < 0.5 && DOMAIN_FLAVOR[domainKey]
    ? DOMAIN_FLAVOR[domainKey]
    : pick(GENERIC_PRAISE);
  addAssistantMessage(state, text, 'praise');

  const milestone = STREAK_MILESTONES.find(m => m.at === state.streak.count);
  if (milestone) addAssistantMessage(state, milestone.text, 'milestone');
}

function onBookFinish(state, title) {
  addAssistantMessage(state, `讀完《${title}》了，又多了一份養分收進你的人生 📚`, 'praise');
}

function onRewardRedeem(state, rewardName) {
  addAssistantMessage(state, `兌換了「${rewardName}」，好好享受這份犒賞，這是你應得的！🎁`, 'praise');
}

function onLevelUp(state, level) {
  addAssistantMessage(state, `🎉 恭喜升到 Lv.${level}！這是你腳踏實地換來的成長。`, 'levelup');
}

function onAchievement(state, achievement) {
  addAssistantMessage(state, `解鎖成就「${achievement.name}」了！${achievement.desc}，繼續保持這個節奏。`, 'achievement');
}

function onMoodCheckin(state, mood) {
  const text = mood === 'unsure' ? buildDailySuggestion(state) : pick(MOOD_RESPONSES[mood]);
  addAssistantMessage(state, text, 'chat');
  return text;
}

const MOOD_ICON = { greeting: '👋', suggestion: '💡', praise: '🎉', milestone: '🔥', levelup: '⭐', achievement: '🏆', chat: '💬', tip: '🤖' };

function renderAssistantWidget(state) {
  const latest = state.assistant.log[0];
  const bubble = document.getElementById('assistant-bubble-text');
  if (bubble) bubble.textContent = latest ? latest.text : '嗨，我是你的小助手！開始完成任務後，我會在這裡給你建議與鼓勵。';
}

function renderAssistantLog(state) {
  const list = document.getElementById('assistant-log');
  if (!list) return;
  if (!state.assistant.log.length) {
    list.innerHTML = '<li class="empty-hint">還沒有任何訊息</li>';
    return;
  }
  list.innerHTML = state.assistant.log.map(m => `
    <li class="assistant-msg">
      <span class="assistant-msg-icon">${MOOD_ICON[m.mood] || '🤖'}</span>
      <span class="assistant-msg-text">${escapeHtml(m.text)}</span>
      <span class="assistant-msg-date">${m.date}</span>
    </li>
  `).join('');
}
