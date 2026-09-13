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

/* ── 小助手設定（AI 風格、天賦、想要的協助）───────────── */

function renderAssistantSettings(state) {
  const a = state.assistant;
  const enabledEl = document.getElementById('assistant-ai-enabled');
  if (enabledEl) enabledEl.checked = !!a.aiEnabled;

  const endpointEl = document.getElementById('assistant-ai-endpoint');
  if (endpointEl && document.activeElement !== endpointEl) endpointEl.value = a.aiEndpoint || '';

  const styleEl = document.getElementById('assistant-style');
  if (styleEl && !styleEl.options.length) {
    ASSISTANT_STYLE_OPTIONS.forEach(o => {
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
      ? (a.aiEndpoint ? '✅ AI 回覆已啟用' : '⚠️ 已勾選啟用，但還沒填服務網址')
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

// 組合給 AI 的系統提示詞：風格 + 天賦 + 背景 + 希望的協助方向
function buildAssistantSystemPrompt(state) {
  const a = state.assistant;
  const styleText = (a.style === 'custom' && a.customStyle)
    ? a.customStyle
    : (ASSISTANT_STYLE_PROMPTS[a.style] || ASSISTANT_STYLE_PROMPTS.warm);

  const wants = [];
  if (a.wantsProgressAnalysis) wants.push('進度分析（點出哪裡做得好、哪裡卡住）');
  if (a.wantsTaskSuggestions) wants.push('具體的任務推進建議（下一步該做什麼）');
  if (a.wantsEncouragement) wants.push('情緒鼓勵與陪伴');

  let prompt = `你是使用者的人生管理 app「我的人生RPG」裡的小助手。${styleText}\n\n`;
  if (a.strengths) prompt += `使用者的蓋洛普天賦測驗前五大特質：${a.strengths}\n`;
  if (a.notes) prompt += `使用者想讓你知道的其他背景：${a.notes}\n`;
  if (wants.length) prompt += `使用者希望你能提供：${wants.join('、')}\n`;
  prompt += `\n請根據訊息裡附上的使用者目前進度資料來回應，用繁體中文回覆，簡潔但有溫度，避免陳腔濫調的空話，盡量具體。回覆不要太長，大約 2-5 句話。`;
  return prompt;
}

// 把目前的任務/習慣/專案進度整理成簡短摘要，餵給 AI 當作上下文
function buildStateSummaryForAI(state) {
  const today = todayStr();
  const lines = [];
  lines.push(`今天日期：${today}`);
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
    new Promise((_, reject) => setTimeout(() => reject(new Error('小助手回覆逾時，請稍後再試一次')), ms)),
  ]);
}

// 呼叫使用者自己架設的中間人服務（例如 Cloudflare Worker），由它去問 Claude
async function callAssistantAI(state, userMessage) {
  if (!state.assistant.aiEndpoint) throw new Error('尚未設定小助手的 AI 服務網址');
  const system = buildAssistantSystemPrompt(state);
  const context = buildStateSummaryForAI(state);
  const message = `以下是使用者目前的資料：\n${context}\n\n使用者說：${userMessage}`;

  const resp = await withAITimeout(fetch(state.assistant.aiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, message }),
  }), 20000);

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error('小助手服務回應錯誤：' + (text || resp.status));
  }
  const data = await resp.json();
  if (!data.reply) throw new Error('小助手沒有回應內容');
  return data.reply;
}

// 晚上十點後，如果今天還沒做過總結，打開 app 時自動請 AI 產生一則
// （純前端網頁沒有背景執行能力，沒辦法「準時」推播，只能在下次打開時補做）
async function checkDailySummary(state) {
  if (!state.assistant.aiEnabled || !state.assistant.aiEndpoint) return false;
  if (new Date().getHours() < 22) return false;
  const today = todayStr();
  if (state.assistant.lastDailySummaryDate === today) return false;

  state.assistant.lastDailySummaryDate = today; // 先標記，避免失敗時每次打開都重試洗版
  try {
    const reply = await callAssistantAI(
      state,
      '請幫我做今天的總結：今天完成了什麼、還有什麼沒做完、明天有什麼要注意的事，用簡短溫暖的方式跟我說。'
    );
    addAssistantMessage(state, reply, 'chat');
  } catch (e) {
    console.error('每日總結失敗', e);
    addAssistantMessage(state, `（小助手今天的總結產生失敗了：${e.message}，明天會再試一次）`, 'tip');
  }
  return true;
}

/* ── 語音新增任務 ───────────────────────────── */

let _voiceRecognition = null;

// 用瀏覽器內建的語音辨識（不用另外接服務），辨識完的文字再交給 AI 解析
// onEnd 不論成功、失敗、或完全沒偵測到語音都一定會被呼叫，用來保證畫面一定會恢復、不會卡住
function startVoiceInput(onResult, onError, onEnd) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('這個瀏覽器不支援語音輸入，建議用 iPhone/Android 上的 Safari 或 Chrome 試試看');
    if (onEnd) onEnd();
    return;
  }
  if (_voiceRecognition) return; // 已經在聽了，避免重複啟動

  let settled = false;
  const rec = new SpeechRecognition();
  rec.lang = 'zh-TW';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = e => { settled = true; onResult(e.results[0][0].transcript); };
  rec.onerror = e => {
    settled = true;
    const NO_SPEECH_ERRORS = ['no-speech', 'aborted'];
    if (!NO_SPEECH_ERRORS.includes(e.error)) onError('語音辨識失敗：' + e.error);
  };
  rec.onend = () => {
    _voiceRecognition = null;
    if (onEnd) onEnd();
  };
  _voiceRecognition = rec;
  try {
    rec.start();
  } catch (e) {
    _voiceRecognition = null;
    onError('語音辨識無法啟動：' + e.message);
    if (onEnd) onEnd();
  }
}

// 讓使用者可以主動按一下取消聆聽（例如講錯話、或辨識卡住時）
function stopVoiceInput() {
  if (!_voiceRecognition) return;
  try {
    _voiceRecognition.abort();
  } catch (e) {
    // 忽略
  }
  _voiceRecognition = null;
}

function buildVoiceTaskSystemPrompt() {
  const today = todayStr();
  const weekday = WEEKDAY_NAMES_ZH[(new Date().getDay() + 6) % 7];
  return `你是一個任務建立小幫手。使用者會用語音描述一件事情，你要把它解析成結構化資料。
今天日期是 ${today}（星期${weekday}）。
domain 只能是以下其中之一：reading（學業/閱讀）、career（事業/工作）、health（健康/體能）、finance（消費/財務）、social（人際/家庭），請依內容選最貼切的一個。
請「只」回傳一個 JSON 物件，不要有其他文字、不要用 markdown code block、不要加任何說明，格式如下：
{"kind": "task 或 event", "title": "事情的簡短標題", "domain": "上面五選一", "date": "YYYY-MM-DD", "time": "HH:MM 或空字串"}
如果是有明確時間點的約會、看診、會議，kind 用 "event"；如果是沒有強烈時間點、今天要做的一般任務，kind 用 "task"。
使用者若說「明天」「下週三」等相對日期，請依今天日期換算成正確的 YYYY-MM-DD。若完全沒提到日期，用今天的日期。若沒提到時間，time 留空字串。時間請換算成 24 小時制的 HH:MM，並把分鐘無條件捨去或進位到最接近的 10 分鐘（例如 15:07 要變成 15:10）。`;
}

// 把語音辨識出的文字送給 AI，解析成 { kind, title, domain, date, time }
async function parseVoiceInput(state, transcript) {
  if (!state.assistant.aiEndpoint) throw new Error('尚未設定小助手的 AI 服務網址，請先到「⚙️ 小助手設定」填好');

  const resp = await withAITimeout(fetch(state.assistant.aiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: buildVoiceTaskSystemPrompt(), message: transcript }),
  }), 20000);

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error('小助手服務回應錯誤：' + (text || resp.status));
  }
  const data = await resp.json();
  let text = (data.reply || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('AI 回傳的格式看不懂：' + text.slice(0, 80));
  }
  if (!parsed.title) throw new Error('AI 沒有解析出標題，請再說一次試試看');
  if (!DOMAINS.some(d => d.key === parsed.domain)) parsed.domain = 'career';
  if (!parsed.date) parsed.date = todayStr();
  return parsed;
}
