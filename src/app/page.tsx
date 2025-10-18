"use client";
import { LoginForm } from "./login-form";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { type Class, type Teacher } from "@/lib/mock-data";

export default function Home() {
  const firestore = useFirestore();

  const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const teachersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'teachers') : null, [firestore]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const isDataReady = !classesLoading && !teachersLoading && !!classes && !!teachers;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-primary">歡迎來到南梓實小虛擬銀行</h1>
          <p className="text-lg text-foreground/80 mt-2">您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！</p>
      </div>
      
      {isDataReady ? (
        <LoginForm classes={classes} teachers={teachers} />
      ) : (
        <div className="text-primary">載入教室資料中...</div>
      )}

      <footer className="mt-12 text-center text-sm text-foreground/60">
        <p>© 2025 南梓實小虛擬銀行, 版權所有。</p>
      </footer>
    </main>
  );
}
