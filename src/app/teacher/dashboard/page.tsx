
"use client";

import { useEffect } from "react";
import { useSchoolStore } from "@/store/useSchoolStore";
import { useSyncAll } from "@/hooks/useSyncAll";

export default function Dashboard() {
  const { loading, config, students, teachers, classes } = useSchoolStore();
  const { syncNow, error } = useSyncAll();

  useEffect(() => {
    // 首次載入就同步一次（或放在按鈕點擊）
    syncNow();
  }, [syncNow]);

  return (
    <main className="p-6 space-y-4">
      <header className="flex items-center gap-3">
        <button
          className="px-3 py-1 rounded border"
          onClick={() => syncNow()}
          disabled={loading}
        >
          {loading ? "同步中…" : "重新同步"}
        </button>
        {error && <span className="text-red-600">錯誤：{error}</span>}
      </header>

      <section>
        <h2 className="text-xl font-bold">Config（config/main）</h2>
        <pre className="text-sm bg-neutral-100 p-3 rounded overflow-auto">
          {config ? JSON.stringify(config, null, 2) : "尚未載入"}
        </pre>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div>
          <h3 className="font-semibold">Students（{students.length}）</h3>
          <ul className="text-sm list-disc pl-5">
            {students.slice(0, 10).map(s => (
              <li key={s.id}>{s.id} — {s.name}（{s.classId}）</li>
            ))}
          </ul>
          {students.length > 10 && <div className="text-xs opacity-60">…還有 {students.length - 10} 筆</div>}
        </div>

        <div>
          <h3 className="font-semibold">Teachers（{teachers.length}）</h3>
          <ul className="text-sm list-disc pl-5">
            {teachers.map(t => (
              <li key={t.id}>{t.id} — {t.name}（{t.role}）</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold">Classes（{classes.length}）</h3>
          <ul className="text-sm list-disc pl-5">
            {classes.map(c => (
              <li key={c.id}>{c.id} — {c.name}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
