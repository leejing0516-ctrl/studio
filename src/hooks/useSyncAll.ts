
import { useCallback, useState } from "react";
import { syncAll } from "@/lib/firestoreFetchers";
import { useSchoolStore } from "@/store/useSchoolStore";

/** 一鍵抓遠端 → 放進本地 store */
export function useSyncAll() {
  const [error, setError] = useState<string | null>(null);
  const {
    setLoading, setConfig, setStudents, setTeachers, setClasses,
  } = useSchoolStore();

  const run = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { config, students, teachers, classes } = await syncAll();
      setConfig(config);
      setStudents(students);
      setTeachers(teachers);
      setClasses(classes);
    } catch (e: any) {
      setError(e?.message ?? "同步失敗");
    } finally {
      setLoading(false);
    }
  }, [setLoading, setConfig, setStudents, setTeachers, setClasses]);

  return { syncNow: run, error };
}
