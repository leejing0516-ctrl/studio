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
// 9. 複製這個 Worker 的網址（長得像 https://life-rpg-ai.你的帳號.workers.dev），
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
    return { email: k.name.slice(prefix.length), at: info.at || 0 };
  }));
}

// 非聊天的管理類請求：查詢自己狀態、申請開通、管理者審核名單
async function handleAction(action, body, env, email, isAdmin, json) {
  if (!env.AI_KV) return json({ code: 'SERVER_CONFIG', error: '伺服器尚未設定 AI_KV' }, 500);

  if (action === 'status') {
    return json({ isAdmin, allowed: isAdmin || await isAllowedEmail(env, email) });
  }
  if (action === 'request') {
    if (isAdmin || await isAllowedEmail(env, email)) return json({ ok: true, already: true });
    await env.AI_KV.put('req:' + email, JSON.stringify({ at: Date.now() }));
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
    await env.AI_KV.put('allow:' + target, JSON.stringify({ at: Date.now() }));
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
      return handleAction(body.action, body, env, email, isAdmin, json);
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
