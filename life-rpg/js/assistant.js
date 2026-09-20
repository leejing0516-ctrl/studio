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

const MOOD_ICON = { greeting: '👋', suggestion: '💡', praise: '🎉', milestone: '🔥', levelup: '⭐', achievement: '🏆', chat: '💬', tip: '🤖', user: '🙋' };

// AI 常常會回傳 **粗體** 這種 markdown 語法，但這裡只是純文字顯示區，
// 不會被瀏覽器解析成粗體，使用者只會看到一堆星號。這裡手動轉成有顏色的粗體文字，
// 並且一定要先跳脫 HTML 再處理星號，避免把使用者輸入當成 HTML 執行
function formatAssistantText(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong class="assistant-emphasis">$1</strong>');
}

function renderAssistantWidget(state) {
  const latest = state.assistant.log[0];
  const bubble = document.getElementById('assistant-bubble-text');
  if (bubble) bubble.innerHTML = latest ? formatAssistantText(latest.text) : '嗨，我是你的教練！開始完成任務後，我會在這裡給你建議與鼓勵。';

  const meta = COACH_PERSONA_META[state.assistant.style] || COACH_PERSONA_META.warm;
  const avatarImg = document.getElementById('coach-avatar-img');
  if (avatarImg && avatarImg.getAttribute('src') !== meta.avatar) avatarImg.src = meta.avatar;
  const label = document.getElementById('coach-label');
  if (label) label.textContent = meta.name;

  const hint = document.getElementById('assistant-chat-hint');
  if (hint) hint.textContent = `跟${meta.name}說說現在的心情，或看看過去的鼓勵訊息。`;
}

// 聊天紀錄改成類似 LINE 的對話泡泡：教練訊息靠左（帶頭像），
// 使用者自己輸入的訊息靠右。但保留原本「越新的在越上面」的排序，不像 LINE 由上到下越聊越新
function renderAssistantLog(state) {
  const list = document.getElementById('assistant-log');
  if (!list) return;
  if (!state.assistant.log.length) {
    list.innerHTML = '<li class="empty-hint">還沒有任何訊息</li>';
    return;
  }
  const coachAvatar = (COACH_PERSONA_META[state.assistant.style] || COACH_PERSONA_META.warm).avatar;
  list.innerHTML = state.assistant.log.map(m => {
    const text = formatAssistantText(m.text);
    if (m.mood === 'user') {
      return `
        <li class="chat-row chat-row-user">
          <div class="chat-col chat-col-end">
            <div class="chat-bubble chat-bubble-user">${text}</div>
            <span class="chat-meta">${m.date}${m.time ? ' ' + formatTimeOfDay(m.time) : ''}</span>
          </div>
        </li>
      `;
    }
    return `
      <li class="chat-row chat-row-coach">
        <img class="chat-avatar" src="${coachAvatar}" alt="">
        <div class="chat-col chat-col-start">
          <div class="chat-bubble chat-bubble-coach">${text}</div>
          <span class="chat-meta">${MOOD_ICON[m.mood] || '🤖'} ${m.date}${m.time ? ' ' + formatTimeOfDay(m.time) : ''}</span>
        </div>
      </li>
    `;
  }).join('');
}

/* ── 教練設定（人選、天賦、想要的協助）───────────── */

function renderAssistantSettings(state) {
  const a = state.assistant;
  const enabledEl = document.getElementById('assistant-ai-enabled');
  if (enabledEl) enabledEl.checked = !!a.aiEnabled;

  const endpointEl = document.getElementById('assistant-ai-endpoint');
  if (endpointEl && document.activeElement !== endpointEl) endpointEl.value = a.aiEndpoint || '';

  const styleEl = document.getElementById('assistant-style');
  if (styleEl && !styleEl.options.length) {
    COACH_PERSONA_OPTIONS.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      styleEl.appendChild(opt);
    });
  }
  if (styleEl) styleEl.value = a.style || 'warm';

  const customStyleEl = document.getElementById('assistant-custom-style');
  if (customStyleEl) {
    customStyleEl.style.display = (a.style === 'custom') ? '' : 'none';
    if (document.activeElement !== customStyleEl) customStyleEl.value = a.customStyle || '';
  }

  const strengthsEl = document.getElementById('assistant-strengths');
  if (strengthsEl && document.activeElement !== strengthsEl) strengthsEl.value = a.strengths || '';

  const notesEl = document.getElementById('assistant-notes');
  if (notesEl && document.activeElement !== notesEl) notesEl.value = a.notes || '';

  const wantAnalysisEl = document.getElementById('assistant-want-analysis');
  if (wantAnalysisEl) wantAnalysisEl.checked = !!a.wantsProgressAnalysis;
  const wantSuggestionsEl = document.getElementById('assistant-want-suggestions');
  if (wantSuggestionsEl) wantSuggestionsEl.checked = !!a.wantsTaskSuggestions;
  const wantEncouragementEl = document.getElementById('assistant-want-encouragement');
  if (wantEncouragementEl) wantEncouragementEl.checked = !!a.wantsEncouragement;

  const statusEl = document.getElementById('assistant-ai-status');
  if (statusEl) {
    statusEl.textContent = a.aiEnabled
      ? (a.aiEndpoint ? '✅ AI 教練已啟用' : '⚠️ 已勾選啟用，但還沒填服務網址')
      : '目前使用免費規則型回覆';
  }
}

function saveAssistantSettings(state) {
  const a = state.assistant;
  a.aiEnabled = document.getElementById('assistant-ai-enabled').checked;
  a.aiEndpoint = document.getElementById('assistant-ai-endpoint').value.trim();
  a.style = document.getElementById('assistant-style').value;
  a.customStyle = document.getElementById('assistant-custom-style').value.trim();
  a.strengths = document.getElementById('assistant-strengths').value.trim();
  a.notes = document.getElementById('assistant-notes').value.trim();
  a.wantsProgressAnalysis = document.getElementById('assistant-want-analysis').checked;
  a.wantsTaskSuggestions = document.getElementById('assistant-want-suggestions').checked;
  a.wantsEncouragement = document.getElementById('assistant-want-encouragement').checked;
}

// 組合給 AI 的系統提示詞：教練人選 + 天賦 + 背景 + 希望的協助方向
function buildAssistantSystemPrompt(state) {
  const a = state.assistant;
  const styleText = (a.style === 'custom' && a.customStyle)
    ? a.customStyle
    : (COACH_PERSONA_PROMPTS[a.style] || COACH_PERSONA_PROMPTS.warm);

  const wants = [];
  if (a.wantsProgressAnalysis) wants.push('進度分析（點出哪裡做得好、哪裡卡住）');
  if (a.wantsTaskSuggestions) wants.push('具體的任務推進建議（下一步該做什麼）');
  if (a.wantsEncouragement) wants.push('情緒鼓勵與陪伴');

  let prompt = `你是使用者的人生管理 app「我的人生RPG」裡的教練。${styleText}\n\n`;
  prompt += `請優先用你所模擬的這個角色本身的信念、哲學觀、思維方式來回應，讓使用者感受到是在跟這個角色本人對話，而不是講一般通用的心靈雞湯。\n`;
  prompt += `請留意訊息裡附上的今天是平日還是假日：假日、週末不要用上班日的節奏與標準要求使用者，語氣可以更放鬆、鼓勵休息與恢復，不用逼進度；平日才適合聚焦在任務推進與紀律。\n`;
  if (a.strengths) prompt += `參考資訊（只有在真的相關、能讓建議更精準時才提一次，不要每則回覆都提）：使用者的蓋洛普天賦測驗前五大特質是 ${a.strengths}。\n`;
  if (a.notes) prompt += `使用者想讓你知道的其他背景：${a.notes}\n`;
  if (wants.length) prompt += `使用者希望你能提供：${wants.join('、')}\n`;
  prompt += `\n請根據訊息裡附上的使用者目前進度資料來回應，用繁體中文回覆，簡潔但有溫度，避免陳腔濫調的空話，盡量具體。不要每則回覆都重複搬出蓋洛普天賦測驗這類固定資料，多用你角色本身的思維與信念來回應。回覆不要太長，大約 2-5 句話。`;
  return prompt;
}

// 把目前的任務/習慣/專案進度整理成簡短摘要，餵給 AI 當作上下文
function buildStateSummaryForAI(state) {
  const today = todayStr();
  const lines = [];
  lines.push(`今天日期：${today}（${weekdayNameZh(today)}，${isWeekendStr(today) ? '假日' : '平日'}）`);
  lines.push(`角色：${state.character.name}，總等級 Lv.${overallLevelInfo(state).level}`);
  DOMAINS.forEach(d => {
    const info = levelFromExp(state.skills[d.key].exp);
    lines.push(`- ${d.name}：Lv.${info.level}`);
  });
  lines.push(`連續行動天數：${state.streak.count} 天`);

  const todayItems = getTodayItems(state);
  const doneToday = todayItems.filter(it => it.done);
  const undoneToday = todayItems.filter(it => !it.done);
  lines.push(`今天已完成 ${doneToday.length} 項，未完成 ${undoneToday.length} 項`);
  if (undoneToday.length) lines.push('今天未完成項目：' + undoneToday.map(it => it.title).join('、'));

  const tomorrow = addDays(today, 1);
  const tomorrowItems = getCalendarItems(state).filter(it => it.date === tomorrow);
  if (tomorrowItems.length) lines.push('明天的項目：' + tomorrowItems.map(it => it.title).join('、'));

  const overdue = getCalendarItems(state).filter(it => !it.done && it.date < today);
  if (overdue.length) lines.push('逾期未完成：' + overdue.map(it => `${it.title}(${it.date})`).join('、'));

  return lines.join('\n');
}

function withAITimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('教練回覆逾時，請稍後再試一次')), ms)),
  ]);
}

// 共用的 AI 呼叫函式：發一次請求，回傳文字內容為空時自動重試一次
// （中間人服務偶爾會因為上游 Claude API 暫時性問題回傳空內容，重試一次通常就會成功；
// 但如果是 max_tokens 不夠導致的空內容，重試同樣的請求不會有幫助，所以呼叫端要給足夠的 maxTokens）
async function fetchAIReply(endpoint, system, message, timeoutMs, maxTokens) {
  const attempt = async () => {
    const resp = await withAITimeout(fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, message, max_tokens: maxTokens }),
    }), timeoutMs);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error('AI 服務回應錯誤：' + (text || resp.status));
    }
    const data = await resp.json();
    return data.reply || '';
  };

  let reply = await attempt();
  if (!reply) reply = await attempt(); // 空內容時重試一次
  if (!reply) throw new Error('AI 沒有回應內容，請稍後再試一次');
  return reply;
}

// 呼叫使用者自己架設的中間人服務（例如 Cloudflare Worker），由它去問 Claude
async function callAssistantAI(state, userMessage) {
  if (!state.assistant.aiEndpoint) throw new Error('尚未設定教練的 AI 服務網址');
  const system = buildAssistantSystemPrompt(state);
  const context = buildStateSummaryForAI(state);
  const message = `以下是使用者目前的資料：\n${context}\n\n使用者說：${userMessage}`;
  return fetchAIReply(state.assistant.aiEndpoint, system, message, 20000, 800);
}

async function generateDailySummary(state) {
  try {
    const reply = await callAssistantAI(
      state,
      '請幫我做今天的總結：今天完成了什麼、還有什麼沒做完、明天有什麼要注意的事，用簡短溫暖的方式跟我說。'
    );
    addAssistantMessage(state, reply, 'chat');
  } catch (e) {
    console.error('每日總結失敗', e);
    addAssistantMessage(state, `（教練今天的總結產生失敗了：${e.message}，明天會再試一次）`, 'tip');
  }
}

// 晚上十點後，如果今天還沒做過總結，打開 app 時自動請 AI 產生一則
// （純前端網頁沒有背景執行能力，沒辦法「準時」推播，只能在下次打開時補做）
async function checkDailySummary(state) {
  if (!state.assistant.aiEnabled || !state.assistant.aiEndpoint) return false;
  if (new Date().getHours() < 22) return false;
  const today = todayStr();
  if (state.assistant.lastDailySummaryDate === today) return false;

  state.assistant.lastDailySummaryDate = today; // 先標記，避免失敗時每次打開都重試洗版
  await generateDailySummary(state);
  return true;
}

// 手動立即產生一次今日總結（方便測試，或不想等到十點才看）
async function generateDailySummaryNow(state) {
  if (!state.assistant.aiEnabled || !state.assistant.aiEndpoint) {
    throw new Error('請先啟用 AI 並填好服務網址');
  }
  await generateDailySummary(state);
  state.assistant.lastDailySummaryDate = todayStr();
}
