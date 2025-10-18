"use client";

import { LoginForm } from "./login-form";
import { type Class, type Teacher } from "@/lib/mock-data";

// This is now a mock, static component.
const MOCK_CLASSES: Class[] = [
    { id: '1', name: '一年甲班' },
    { id: '2', name: '二年乙班' },
];

const MOCK_TEACHERS: Teacher[] = [
    { id: '1', name: '王老師' },
    { id: '2', name: '林校長' },
];


export default function Home() {

  const handleStudentLogin = () => {
    alert("登入功能正在重建中。");
  };

  const handleTeacherLogin = () => {
    alert("登入功能正在重建中。");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-primary">歡迎來到南梓實小虛擬銀行</h1>
          <p className="text-lg text-foreground/80 mt-2">您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！</p>
      </div>
      
      <LoginForm 
          classes={MOCK_CLASSES}
          teachers={MOCK_TEACHERS}
          onStudentLogin={handleStudentLogin}
          onTeacherLogin={handleTeacherLogin}
          isAuthLoading={false}
      />

      <footer className="mt-12 text-center text-sm text-foreground/60">
        <p>© 2025 南梓實小虛擬銀行, 版權所有。</p>
      </footer>
    </main>
  );
}
