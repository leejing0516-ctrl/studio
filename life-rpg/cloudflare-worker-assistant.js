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
// 7. 複製這個 Worker 的網址（長得像 https://life-rpg-ai.你的帳號.workers.dev），
//    貼到「我的人生RPG」app 裡「小助手 → ⚙️ 小助手設定 → 中間人服務網址」欄位

const ALLOWED_ORIGIN = 'https://leejing0516-ctrl.github.io';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // 簡單檢查請求來源，減少被其他網站盜用（不是完全防呆，但可以擋掉大部分濫用）
    const origin = request.headers.get('Origin') || '';
    if (origin !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }

    const { system, message } = body;
    if (!message) {
      return new Response('Missing message', { status: 400, headers: corsHeaders });
    }

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
          max_tokens: 600,
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
      const reply = (data.content && data.content[0] && data.content[0].text) || '';
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
