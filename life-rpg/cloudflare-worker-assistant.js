// 這個檔案不是給網頁用的，是要貼到 Cloudflare Workers 後台的程式碼。
// 它的工作：接住網頁送來的請求 → 用你存在 Cloudflare 的密鑰去問 Claude → 把回覆傳回網頁。
// 這樣 Claude 的 API 金鑰只存在 Cloudflare 那邊，不會出現在網頁原始碼裡。
//
// 部署步驟：
// 1. 前往 https://dash.cloudflare.com 註冊/登入（免費，不需要信用卡）
// 2. 左側選單「Workers & Pages」→「Create」→「Create Worker」
// 3. 取個名字（例如 life-rpg-ai），建立後點「Edit code」
// 4. 把這整個檔案的內容貼進去，取代原本的預設程式碼
// 5. 點右上角「Deploy」部署
// 6. 回到 Worker 頁面 →「Settings」→「Variables and Secrets」→ 新增一個：
//    名稱：ANTHROPIC_API_KEY
//    值：貼上你在 console.anthropic.com 申請到的 API 金鑰
//    類型記得選「Secret」（不是一般 Text），這樣才不會被任何人看到
// 7. 開通「使用次數紀錄」（這版新增，必做）：
//    Cloudflare 左側「Storage & Databases」→「KV」→「Create」，名稱隨意（例如 life-rpg-usage）
//    回到 Worker →「Settings」→「Bindings」→「Add」→「KV namespace」，
//    Variable name 一定要填 AI_KV，選剛剛建立的那個 KV，儲存後重新 Deploy
// 8. 設定誰可以用 AI 教練（同樣在「Variables and Secrets」，類型選 Text）：
//    ADMIN_EMAILS   = 你自己的信箱（可多個，用逗號隔開；永遠可用、不限次數）
//    ALLOWED_EMAILS = （選填）固定開通的信箱，多個用逗號隔開。一般試用者改在 app「平台設定」裡核准，不用改這裡
//    DAILY_LIMIT    = 每人每天最多可問幾次（不填預設 30；以台灣時間 0 點重新計算）
// 9. 每天早上 6 點推播提醒（這版新增）：
//    a. Variables and Secrets 新增 VAPID_PRIVATE_JWK，類型選 Secret，值貼上你拿到的那一整行 JSON
//    b. Settings →「Trigger Events」（或 Triggers）→ Cron Triggers →「Add」→ 填入 0 22 * * *
//       （這是 UTC 時間 22:00，等於台灣早上 6:00）
// 10. 複製這個 Worker 的網址（長得像 https://life-rpg-ai.你的帳號.workers.dev），
//    貼到「我的人生RPG」app 裡「小助手 → ⚙️ 小助手設定 → 中間人服務網址」欄位

const ALLOWED_ORIGIN = 'https://leejing0516-ctrl.github.io';
const FIREBASE_PROJECT_ID = 'finlit-classroom';
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

function b64urlToBytes(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// 驗證網頁送來的 Firebase 登入憑證（簽章、發行者、對象、有效期限），通過才回傳裡面的資料
async function verifyFirebaseToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const dec = new TextDecoder();
  const header = JSON.parse(dec.decode(b64urlToBytes(parts[0])));
  const payload = JSON.parse(dec.decode(b64urlToBytes(parts[1])));
  if (header.alg !== 'RS256') throw new Error('bad alg');

  const jwks = await fetch(JWK_URL, { cf: { cacheTtl: 3600, cacheEverything: true } }).then(r => r.json());
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1])
  );
  if (!ok) throw new Error('bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('bad aud');
  if (payload.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID) throw new Error('bad iss');
  if (!payload.sub || !payload.exp || payload.exp < now) throw new Error('expired');
  return payload;
}

const parseList = (v) => (v || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

// 台灣時間（UTC+8）的今天日期，用來每天重新計算使用次數
function taipeiDate() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

const normEmail = (e) => String(e || '').trim().toLowerCase();

// 已開通 = 寫在環境變數 ALLOWED_EMAILS，或被管理者在 app 裡核准（存在 KV 的 allow:信箱）
async function isAllowedEmail(env, email) {
  if (parseList(env.ALLOWED_EMAILS).includes(email)) return true;
  if (!env.AI_KV) return false;
  return (await env.AI_KV.get('allow:' + email)) !== null;
}

async function listKV(env, prefix) {
  const r = await env.AI_KV.list({ prefix });
  return Promise.all(r.keys.map(async (k) => {
    let info = {};
    try { info = JSON.parse(await env.AI_KV.get(k.name)) || {}; } catch (e) {}
    return { email: k.name.slice(prefix.length), at: info.at || 0, note: info.note || '' };
  }));
}


// ── 每日推播（Web Push）──
// 推播本身不帶內容：app 會把「未來幾天的待辦摘要」存在手機裡，收到推播時由手機自己組出通知文字，
// 所以待辦內容不會經過或存在這個 Worker，這裡只保存「哪些裝置要收推播」。
const VAPID_PUBLIC_KEY = 'BBVOJ0c6MfS-B8mQlUKP7KV0pvP0EK1COch4gew1U201hnA-h05gueF5kTY_nJEfnKOXSvVI-Hp0OMyaoxkR-9M';
const PUSH_HOST_OK = [/(^|\.)push\.apple\.com$/, /(^|\.)googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];

function b64urlEncode(bytes) {
  let s = '';
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

async function vapidHeaders(env, endpoint) {
  const enc = (o) => b64urlEncode(new TextEncoder().encode(JSON.stringify(o)));
  const admin = parseList(env.ADMIN_EMAILS)[0] || 'admin@example.com';
  const unsigned = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:' + admin,
  });
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned)));
  return {
    Authorization: `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${VAPID_PUBLIC_KEY}`,
    TTL: '43200',
    Urgency: 'high',
  };
}

// 對 KV 裡某個 push: 開頭的紀錄發一則推播；訂閱已失效（404/410）就刪掉
async function sendOnePush(env, kvKey) {
  let info;
  try { info = JSON.parse(await env.AI_KV.get(kvKey)); } catch (e) { return 'bad'; }
  if (!info || !info.endpoint) return 'bad';
  let status = 0, outcome = 'fail';
  try {
    const resp = await fetch(info.endpoint, { method: 'POST', headers: await vapidHeaders(env, info.endpoint) });
    status = resp.status;
    if (status === 404 || status === 410) outcome = 'gone';
    else if (resp.ok) outcome = 'ok';
  } catch (e) {
    status = -1;
  }
  console.log(`push ${kvKey.slice(0, 20)}… → ${status} (${outcome})`);
  if (outcome === 'gone') { await env.AI_KV.delete(kvKey); return outcome; }
  // 記下這個裝置最後一次推播的結果，方便在 app 裡診斷「為什麼沒收到」
  await env.AI_KV.put(kvKey, JSON.stringify({ ...info, lastAt: Date.now(), lastStatus: status }));
  return outcome;
}

async function sendAllPush(env) {
  const result = { ok: 0, fail: 0, gone: 0, at: Date.now() };
  try {
    if (!env.AI_KV || !env.VAPID_PRIVATE_JWK) { result.error = '缺少 AI_KV 或 VAPID_PRIVATE_JWK'; return result; }
    let cursor;
    do {
      const r = await env.AI_KV.list({ prefix: 'push:', cursor });
      for (const k of r.keys) {
        const res = await sendOnePush(env, k.name);
        if (res === 'ok') result.ok++; else if (res === 'gone') result.gone++; else result.fail++;
      }
      cursor = r.list_complete ? undefined : r.cursor;
    } while (cursor);
  } catch (e) {
    result.error = String(e);
  } finally {
    console.log('cron push result', JSON.stringify(result));
    try { if (env.AI_KV) await env.AI_KV.put('meta:lastCron', JSON.stringify(result)); } catch (e) {}
  }
  return result;
}

async function handlePushAction(action, body, env, uid, email, json) {
  if (action === 'push_subscribe') {
    const sub = body.subscription || {};
    let host = '';
    try { host = new URL(sub.endpoint).hostname; } catch (e) {}
    if (!sub.endpoint || !PUSH_HOST_OK.some(re => re.test(host))) return json({ code: 'BAD_SUB', error: '推播訂閱格式不正確' }, 400);
    const key = `push:${uid}:${await sha256Hex(sub.endpoint)}`;
    const existing = await env.AI_KV.list({ prefix: `push:${uid}:` });
    if (!existing.keys.some(k => k.name === key) && existing.keys.length >= 5) {
      return json({ code: 'TOO_MANY', error: '同一個帳號最多綁定 5 個裝置的推播' }, 400);
    }
    await env.AI_KV.put(key, JSON.stringify({ endpoint: sub.endpoint, email, at: Date.now() }));
    return json({ ok: true });
  }
  if (action === 'push_unsubscribe') {
    if (body.endpoint) await env.AI_KV.delete(`push:${uid}:${await sha256Hex(String(body.endpoint))}`);
    return json({ ok: true });
  }
  if (action === 'push_test') {
    if (!env.VAPID_PRIVATE_JWK) return json({ code: 'SERVER_CONFIG', error: '伺服器尚未設定推播金鑰（VAPID_PRIVATE_JWK）' }, 500);
    const limitKey = `pt:${uid}`;
    if (await env.AI_KV.get(limitKey)) return json({ code: 'SLOW_DOWN', error: '請等一分鐘後再測試' }, 429);
    await env.AI_KV.put(limitKey, '1', { expirationTtl: 60 });
    const keys = (await env.AI_KV.list({ prefix: `push:${uid}:` })).keys;
    const res = await Promise.all(keys.map(k => sendOnePush(env, k.name)));
    return json({ sent: res.filter(r => r === 'ok').length, total: keys.length });
  }
  if (action === 'push_status') {
    let lastCron = null;
    try { lastCron = JSON.parse(await env.AI_KV.get('meta:lastCron')); } catch (e) {}
    const keys = (await env.AI_KV.list({ prefix: `push:${uid}:` })).keys;
    const mine = [];
    for (const k of keys) {
      try { const v = JSON.parse(await env.AI_KV.get(k.name)); mine.push({ at: v.at, lastAt: v.lastAt || null, lastStatus: v.lastStatus ?? null }); } catch (e) {}
    }
    return json({ lastCron, mine });
  }
  return json({ code: 'BAD_ACTION', error: '不支援的操作' }, 400);
}

// 非聊天的管理類請求：查詢自己狀態、申請開通、管理者審核名單
async function handleAction(action, body, env, email, isAdmin, json, uid) {
  if (!env.AI_KV) return json({ code: 'SERVER_CONFIG', error: '伺服器尚未設定 AI_KV' }, 500);
  if (action.startsWith('push_')) return handlePushAction(action, body, env, uid, email, json);

  if (action === 'status') {
    return json({ isAdmin, allowed: isAdmin || await isAllowedEmail(env, email) });
  }
  if (action === 'request') {
    if (isAdmin || await isAllowedEmail(env, email)) return json({ ok: true, already: true });
    const note = String(body.note || '').trim().slice(0, 60);
    await env.AI_KV.put('req:' + email, JSON.stringify({ at: Date.now(), note }));
    return json({ ok: true });
  }

  if (!isAdmin) return json({ code: 'NOT_ADMIN', error: '需要管理者權限' }, 403);

  if (action === 'admin_list') {
    const [pending, allowed] = await Promise.all([listKV(env, 'req:'), listKV(env, 'allow:')]);
    pending.sort((a, b) => b.at - a.at);
    return json({ pending, allowed, envAllowed: parseList(env.ALLOWED_EMAILS) });
  }

  const target = normEmail(body.email);
  if (!target.includes('@')) return json({ code: 'BAD_EMAIL', error: '信箱格式不正確' }, 400);
  if (action === 'admin_approve') {
    let note = '';
    try { note = (JSON.parse(await env.AI_KV.get('req:' + target)) || {}).note || ''; } catch (e) {}
    await env.AI_KV.put('allow:' + target, JSON.stringify({ at: Date.now(), note }));
    await env.AI_KV.delete('req:' + target);
    return json({ ok: true });
  }
  if (action === 'admin_reject') {
    await env.AI_KV.delete('req:' + target);
    return json({ ok: true });
  }
  if (action === 'admin_remove') {
    await env.AI_KV.delete('allow:' + target);
    return json({ ok: true });
  }
  return json({ code: 'BAD_ACTION', error: '不支援的操作' }, 400);
}

export default {
  // Cron Trigger：每天台灣早上 6 點（UTC 22:00）對所有已訂閱的裝置發推播
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendAllPush(env));
  },

  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // 簡單檢查請求來源，減少被其他網站盜用（真正的把關是下面的登入身分驗證）
    const origin = request.headers.get('Origin') || '';
    if (origin !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    // ── 身分驗證：一定要帶登入憑證 ──
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return json({ code: 'NO_LOGIN', error: '請先登入' }, 401);
    let user;
    try {
      user = await verifyFirebaseToken(token);
    } catch (e) {
      return json({ code: 'BAD_LOGIN', error: '登入憑證無效或已過期，請重新登入' }, 401);
    }

    const email = normEmail(user.email);
    const isAdmin = parseList(env.ADMIN_EMAILS).includes(email);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }

    if (body.action && body.action !== 'chat') {
      return handleAction(body.action, body, env, email, isAdmin, json, user.sub);
    }

    // ── 名單檢查：管理者或已開通的信箱才能用 ──
    if (!isAdmin && !(await isAllowedEmail(env, email))) {
      return json({ code: 'NOT_ALLOWED', error: '這個帳號尚未開通 AI 教練' }, 403);
    }

    // ── 每日次數限制（管理者不限）──
    if (!isAdmin) {
      if (!env.AI_KV) return json({ code: 'SERVER_CONFIG', error: '伺服器尚未設定使用次數紀錄（AI_KV）' }, 500);
      const limit = Number(env.DAILY_LIMIT) || 30;
      const usageKey = `use:${user.sub}:${taipeiDate()}`;
      const used = Number(await env.AI_KV.get(usageKey)) || 0;
      if (used >= limit) {
        return json({ code: 'RATE_LIMIT', error: `今天的 AI 使用次數（${limit} 次）已用完，明天再來`, limit }, 429);
      }
      await env.AI_KV.put(usageKey, String(used + 1), { expirationTtl: 172800 });
    }

    const { system, message } = body;
    if (!message) {
      return new Response('Missing message', { status: 400, headers: corsHeaders });
    }
    // 網頁端會依用途（聊天 vs 故事拆解，需要的長度差很多）指定 max_tokens，這裡夾在合理範圍內避免濫用
    const requestedMaxTokens = Number(body.max_tokens) || 600;
    const maxTokens = Math.min(Math.max(requestedMaxTokens, 200), 4096);

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: maxTokens,
          system: system || '',
          messages: [{ role: 'user', content: message }],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: errText }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await resp.json();
      // 把回傳內容裡所有文字區塊都接起來，避免只取第一個區塊、萬一它不是文字（例如思考過程區塊）就漏接
      const reply = (data.content || [])
        .filter(block => block && block.type === 'text' && block.text)
        .map(block => block.text)
        .join('\n')
        .trim();

      if (!reply) {
        // 明確回傳錯誤，而不是安靜地給空字串——這樣下次再發生時，網頁上會顯示真正的原因（例如 stop_reason）
        return new Response(JSON.stringify({ error: 'Claude 沒有回傳文字內容，stop_reason=' + (data.stop_reason || '未知') }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
