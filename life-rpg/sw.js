// Service Worker：負責在每天早上收到推播時，用手機裡存好的今日待辦摘要組出通知文字，並更新圖示數字。
// 推播本身不帶內容，所以待辦資料不會經過任何伺服器。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

function idbGet(key) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('life_rpg_push', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = open.result.transaction('kv').objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let summaries = {};
    try { summaries = (await idbGet('summaries')) || {}; } catch (e) {}
    const s = summaries[localDateStr()];

    let title, body, count = null;
    if (s) {
      count = s.count;
      if (count > 0) {
        title = `📋 今天有 ${count} 項待辦`;
        const titles = s.titles || [];
        body = titles.join('、') + (count > titles.length ? `…等 ${count} 項` : '');
      } else {
        title = '🎉 今天沒有待辦事項';
        body = '輕鬆過一天，或替自己安排一件小事吧。';
      }
    } else {
      title = '📋 早安，來看看今天的任務';
      body = '點開「我的人生 RPG」查看今天要做的事。';
    }

    try {
      if (count !== null && self.navigator && self.navigator.setAppBadge) {
        if (count > 0) await self.navigator.setAppBadge(count);
        else await self.navigator.clearAppBadge();
      }
    } catch (e) {}

    await self.registration.showNotification(title, {
      body,
      tag: 'daily-summary',
      icon: 'assets/icon-192.png',
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (all.length) { await all[0].focus(); return; }
    await self.clients.openWindow('./');
  })());
});
