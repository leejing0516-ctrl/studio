// 故事模式：使用者描述自己正在經歷的困境，AI 把它拆解成一段有劇情、有每日行動的故事

function buildStorySystemPrompt() {
  return [
    '你是「我的人生RPG」App裡負責把使用者的真實人生困境轉化成RPG故事任務的敘事設計師。',
    '使用者會用自己的話描述一段正在經歷的困境、挑戰或想突破的課題。',
    '請你：',
    '1. 幫這段經歷想一個貼切、有力量感的故事標題（不要出現「任務」兩個字，可以有詩意或RPG風格，15字以內）。',
    '2. 把這段旅程拆解成循序漸進的「章節」，每章節都要對應使用者描述的具體情境，設計「質性」的行動（例如：一次對話、一段書寫、一個小小的嘗試、一次反思），不要用可量化的數字指標（例如公里數、頁數、公斤），那種不適合這裡。',
    `3. 章節數量請依內容深度自行決定，最少 3 章，最多 ${MAX_STORY_CHAPTERS} 章，不要為了湊數硬拆，也不要省略關鍵轉折。`,
    '4. 每一章包含兩個欄位：',
    '   - narrative：一段第二人稱、溫暖但不濫情的引導旁白（約 100-200 字），延續故事脈絡，幫使用者理解今天這個行動為什麼重要。',
    '   - taskTitle：一個明確、當天就能完成的具體行動，20 字以內，不要用「第X天」開頭，直接描述行動本身。',
    '5. 最後一章的 narrative 要帶有階段性完結、鼓勵使用者的收尾感。',
    '請務必「只」回傳純 JSON，不要加任何說明文字、不要用 markdown code fence 包起來，格式必須是：',
    '{"storyTitle": "...", "chapters": [{"narrative": "...", "taskTitle": "..."}]}',
  ].join('\n');
}

function parseStoryReply(reply) {
  let text = String(reply).trim();
  text = text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('故事內容格式錯誤，請重新生成一次');
  let parsed;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    throw new Error('故事內容格式錯誤，請重新生成一次');
  }
  if (!parsed.storyTitle || !Array.isArray(parsed.chapters) || !parsed.chapters.length) {
    throw new Error('故事內容不完整，請重新生成一次');
  }
  const chapters = parsed.chapters
    .map(ch => ({
      narrative: String(ch.narrative || '').trim().slice(0, 600),
      taskTitle: String(ch.taskTitle || '').trim().slice(0, 60),
    }))
    .filter(ch => ch.taskTitle)
    .slice(0, MAX_STORY_CHAPTERS);
  if (!chapters.length) throw new Error('故事內容不完整，請重新生成一次');
  return { storyTitle: String(parsed.storyTitle).trim().slice(0, 60), chapters };
}

async function callStoryAI(state, description) {
  if (!state.assistant.aiEndpoint) throw new Error('尚未設定 AI 服務網址，請先到「教練對話」分頁的教練設定啟用並填寫');
  const system = buildStorySystemPrompt();
  const message = `使用者描述的困境或想突破的課題：\n${description}`;
  // 故事最多可能有 12 章，每章都有旁白＋任務標題的 JSON，需要比一般聊天回覆多很多 token
  const reply = await fetchAIReply(state.assistant.aiEndpoint, system, message, 45000, 4096);
  return parseStoryReply(reply);
}

// 故事全部章節完成後，把每章的旁白＋使用者自己寫下的心情/過程紀錄，交給 AI 彙整成一篇短篇小說
function buildStoryCompileSystemPrompt() {
  return [
    '你是「我的人生RPG」App裡的敘事作家。使用者剛完成了一段故事模式的旅程，請你把整段故事寫成一篇有角色、有情節脈絡的短篇小說。',
    '你會收到每一章原本的引導旁白，以及使用者自己在那一天寫下的心情、處理過程、策略或感受（有些章節使用者可能沒有留下文字，就依旁白與前後脈絡合理想像銜接，不要留空隙）。',
    '請把這些素材真正寫成一篇完整、有起承轉合的短篇小說（繁體中文，約 800-1500 字），語氣溫暖真摯，不要寫成條列式摘要或心得報告。',
    '第一行請給一個貼切的篇名，接著空一行再開始正文，除此之外不要加上任何其他說明文字或 markdown 符號。',
  ].join('\n');
}

async function callStoryCompileAI(state, quest) {
  const material = quest.chapters.map((ch, i) =>
    `第 ${i + 1} 章｜當天任務：${ch.taskTitle}\n引導旁白：${ch.narrative}\n使用者的書寫：${ch.journal ? ch.journal : '（這一章使用者沒有留下書寫）'}`
  ).join('\n\n');
  const message = `故事標題：${quest.title}\n\n${material}`;
  const system = buildStoryCompileSystemPrompt();
  return fetchAIReply(state.assistant.aiEndpoint, system, message, 60000, 4096);
}

// 章節打勾後檢查：如果整段故事剛好完成，且還沒生成過短篇小說，就自動生成一次
async function maybeCompileStory(state, chapterId) {
  const found = findStoryChapter(state, chapterId);
  if (!found) return;
  const q = found.quest;
  if (!q.chapters.length || !q.chapters.every(c => c.done)) return;
  if (q.compiledStory || q.compileStatus === 'pending') return;
  await runStoryCompile(state, q);
}

async function runStoryCompile(state, quest) {
  quest.compileStatus = 'pending';
  quest.compileError = null;
  renderAll();
  try {
    const text = await callStoryCompileAI(state, quest);
    quest.compiledStory = { text, generatedAt: Date.now() };
  } catch (e) {
    quest.compileError = e.message;
  }
  quest.compileStatus = null;
  renderAll();
}

function regenerateCompiledStory(state, questId) {
  const q = (state.storyQuests || []).find(q => q.id === questId);
  if (!q) return;
  q.compiledStory = null;
  runStoryCompile(state, q);
}

function genChapterId(i) {
  return 'sc' + Date.now() + '_' + i + Math.random().toString(36).slice(2, 5);
}

let _pendingStory = null;

async function generateStoryPreview(state, description, domain) {
  const result = await callStoryAI(state, description);
  const chapters = result.chapters.map((ch, i) => ({
    id: genChapterId(i),
    narrative: ch.narrative,
    taskTitle: ch.taskTitle,
    dueDate: addDays(todayStr(), i),
    done: false,
    doneAt: null,
    journal: '',
  }));
  _pendingStory = { title: result.storyTitle, domain, description, chapters };
}

async function regeneratePendingStory(state) {
  if (!_pendingStory) return;
  const { description, domain } = _pendingStory;
  await generateStoryPreview(state, description, domain);
}

function cancelPendingStory() {
  _pendingStory = null;
}

function removePendingChapter(chapterId) {
  if (!_pendingStory) return;
  _pendingStory.chapters = _pendingStory.chapters.filter(ch => ch.id !== chapterId);
}

function confirmPendingStory(state) {
  if (!_pendingStory || !_pendingStory.chapters.length) return;
  const id = 'sq' + Date.now() + Math.random().toString(36).slice(2, 7);
  state.storyQuests.push(Object.assign({ id, createdDate: todayStr() }, _pendingStory));
  _pendingStory = null;
}

function findStoryChapter(state, chapterId) {
  for (const q of state.storyQuests || []) {
    const ch = q.chapters.find(c => c.id === chapterId);
    if (ch) return { quest: q, chapter: ch };
  }
  return null;
}

function toggleStoryChapter(state, chapterId) {
  const found = findStoryChapter(state, chapterId);
  if (!found) return;
  const { quest: q, chapter: ch } = found;
  ch.done = !ch.done;
  ch.doneAt = ch.done ? Date.now() : null;
  if (ch.done) {
    gainExp(state, q.domain, STORY_CHAPTER_EXP);
    addLog(state, `完成故事「${q.title}」章節「${ch.taskTitle}」，+${STORY_CHAPTER_EXP} EXP ／ +${goldFor(STORY_CHAPTER_EXP)} 金幣`);
    if (q.chapters.every(c => c.done)) {
      gainExp(state, q.domain, STORY_FINISH_BONUS);
      addLog(state, `🎉 完成整段故事「${q.title}」！額外獲得 +${STORY_FINISH_BONUS} EXP ／ +${goldFor(STORY_FINISH_BONUS)} 金幣`);
    }
  } else {
    gainExp(state, q.domain, -STORY_CHAPTER_EXP);
  }
}

function updateStoryChapter(state, chapterId, fields) {
  const found = findStoryChapter(state, chapterId);
  if (!found) return;
  Object.assign(found.chapter, fields);
}

function deleteStoryChapter(state, chapterId) {
  const found = findStoryChapter(state, chapterId);
  if (!found) return;
  found.quest.chapters = found.quest.chapters.filter(c => c.id !== chapterId);
}

function deleteStoryQuest(state, questId) {
  state.storyQuests = (state.storyQuests || []).filter(q => q.id !== questId);
}

// 把故事裡「還沒完成」的章節整批往後移，讓過期最久的那章回到今天，其餘保持原本的間距
function postponeStoryQuest(state, questId) {
  const q = (state.storyQuests || []).find(q => q.id === questId);
  if (!q) return;
  const today = todayStr();
  const overdue = q.chapters.filter(ch => !ch.done && ch.dueDate < today);
  if (!overdue.length) return;
  const earliest = overdue.reduce((min, ch) => (ch.dueDate < min ? ch.dueDate : min), overdue[0].dueDate);
  shiftUnfinishedDates(q.chapters, daysBetween(earliest, today));
}

function renderStoryPreview() {
  const el = document.getElementById('story-preview');
  if (!el) return;
  if (!_pendingStory) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = 'block';
  const domain = DOMAINS.find(d => d.key === _pendingStory.domain);
  el.innerHTML = `
    <div class="project-item project-preview-card">
      <div class="project-header">
        <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
        <span class="project-title">🗺️ 預覽：${escapeHtml(_pendingStory.title)}</span>
      </div>
      <p class="tab-hint">先看看每章的行動，劇情旁白會在完成當天的行動後解鎖。不滿意可以「重新生成」，或刪掉個別章節後再確認。</p>
      <ul class="project-subtasks">
        ${_pendingStory.chapters.map((ch, i) => `
          <li class="subtask-item">
            <label><span class="subtask-title">第 ${i + 1} 章：${escapeHtml(ch.taskTitle)}</span><span class="subtask-date">${ch.dueDate}</span></label>
            <button class="icon-btn preview-del-chapter" data-id="${ch.id}" title="移除這一章">✕</button>
          </li>
        `).join('')}
      </ul>
      <div class="modal-actions" style="justify-content:flex-start; flex-wrap:wrap;">
        <button type="button" id="story-preview-regenerate" class="btn small">🔄 重新生成</button>
        <button type="button" id="story-preview-cancel" class="btn small">取消</button>
        <button type="button" id="story-preview-confirm" class="btn">✅ 確認儲存，開始故事</button>
      </div>
    </div>
  `;
}

// 故事全部完成後，顯示彙整中／失敗重試／已完成的短篇小說三種狀態之一
function renderCompiledStorySection(quest) {
  if (quest.compileStatus === 'pending') {
    return `<div class="story-compiled pending">🖋️ 教練正在把這段故事寫成短篇小說中…</div>`;
  }
  if (quest.compileError) {
    return `
      <div class="story-compiled error">
        <p>小說生成失敗：${escapeHtml(quest.compileError)}</p>
        <button type="button" class="btn small story-recompile" data-id="${quest.id}">🔄 重新生成小說</button>
      </div>
    `;
  }
  if (quest.compiledStory) {
    return `
      <details class="story-compiled done">
        <summary>📖 完整短篇小說（點開回顧）</summary>
        <div class="story-compiled-text">${escapeHtml(quest.compiledStory.text)}</div>
        <button type="button" class="btn small story-recompile" data-id="${quest.id}">🔄 重新生成小說</button>
      </details>
    `;
  }
  return '';
}

function renderStoryTab(state) {
  renderStoryPreview();
  const list = document.getElementById('story-list');
  if (!list) return;
  const quests = state.storyQuests || [];
  if (!quests.length) {
    list.innerHTML = '<li class="empty-hint">還沒有開始任何故事，寫下你正在經歷的課題，讓故事開始吧！</li>';
    return;
  }
  list.innerHTML = quests.map(q => {
    const domain = DOMAINS.find(d => d.key === q.domain);
    const doneCount = q.chapters.filter(ch => ch.done).length;
    const total = q.chapters.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const finished = total > 0 && doneCount === total;
    return `
      <li class="project-item story-quest">
        <div class="project-header">
          <span class="task-tag" style="background:${domain.color}">${domain.icon} ${domain.name}</span>
          <span class="project-title">🗺️ ${escapeHtml(q.title)}</span>
          <button class="icon-btn del-story" data-id="${q.id}" title="刪除整段故事">✕</button>
        </div>
        <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${pct}%; background:${domain.color}"></div></div>
        <p class="tab-hint" style="margin:4px 0 10px;">進度：${doneCount} / ${total} 章${finished ? ' ✅ 故事完結' : ''}</p>
        <ul class="story-chapter-list">
          ${q.chapters.map((ch, i) => `
            <li class="story-chapter ${ch.done ? 'done' : 'locked'}">
              <div class="story-chapter-head">
                <label class="task-check">
                  <input type="checkbox" ${ch.done ? 'checked' : ''} data-id="${ch.id}" class="story-chapter-check">
                  <span class="story-chapter-num">第 ${i + 1} 章</span>
                  <span class="task-text">${escapeHtml(ch.taskTitle)}</span>
                  <span class="task-time">🕐 ${ch.dueDate}</span>
                  ${ch.done && ch.doneAt ? `<span class="task-donetime">✅ ${formatTimeOfDay(ch.doneAt)} 打卡</span>` : ''}
                </label>
                <button class="icon-btn edit-item" data-kind="story" data-id="${ch.id}" title="編輯">✎</button>
              </div>
              <p class="story-chapter-narrative">${ch.done ? escapeHtml(ch.narrative) : `🔒 完成「${escapeHtml(ch.taskTitle)}」後解鎖這段故事`}</p>
              <textarea class="story-journal-input" data-id="${ch.id}" placeholder="寫下這天的狀況、你怎麼處理、用了什麼策略、當下的感受…（會用來寫進故事完結後的短篇小說）">${escapeHtml(ch.journal || '')}</textarea>
            </li>
          `).join('')}
        </ul>
        ${finished ? renderCompiledStorySection(q) : ''}
      </li>
    `;
  }).join('');
}
