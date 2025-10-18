"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./login-form";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { type Class, type Teacher } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { getStudentByName } from "@/lib/firestore-actions";

export default function Home() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // Defer Firestore queries until Firebase Auth is ready.
  const shouldFetchData = !isUserLoading;

  const classesQuery = useMemoFirebase(() => shouldFetchData && firestore ? collection(firestore, 'classes') : null, [firestore, shouldFetchData]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const teachersQuery = useMemoFirebase(() => shouldFetchData && firestore ? collection(firestore, 'teachers') : null, [firestore, shouldFetchData]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const handleStudentLogin = async (loginDetails: { classId: string; name: string; pass: string }) => {
    if (!firestore) {
        toast({ title: "錯誤", description: "資料庫尚未初始化，請稍後再試。", variant: "destructive" });
        return;
    }
    if (!loginDetails.classId || !loginDetails.name || !loginDetails.pass) {
      toast({ title: "登入失敗", description: "所有欄位均為必填項。", variant: "destructive" });
      return;
    }
    
    if (loginDetails.pass !== 'password') {
      toast({ title: "登入失敗", description: "密碼錯誤。", variant: "destructive" });
      return;
    }

    const student = await getStudentByName(firestore, loginDetails.name);

    if (student && student.classId === loginDetails.classId) {
        sessionStorage.setItem('userType', 'student');
        sessionStorage.setItem('userId', student.id);
        sessionStorage.setItem('userName', student.name);
        toast({ title: "學生登入成功", description: "正在將您導向..." });
        router.push("/student-dashboard");
    } else {
        toast({ title: "登入失敗", description: "找不到該學生或班級不正確。", variant: "destructive" });
    }
  };

  const handleTeacherLogin = async (loginDetails: { teacherId: string; pass: string }) => {
    if (!loginDetails.teacherId || !loginDetails.pass) {
      toast({ title: "登入失敗", description: "請選擇您的帳號並輸入密碼。", variant: "destructive" });
      return;
    }
    
    if (loginDetails.pass === "password") {
        const teacher = teachers?.find(t => t.id === loginDetails.teacherId);
        if (teacher) {
            sessionStorage.setItem('userType', 'teacher');
            sessionStorage.setItem('teacherId', teacher.id);
            sessionStorage.setItem('userName', teacher.name);
            toast({ title: "老師登入成功", description: "正在將您導向..." });
            router.push("/teacher-dashboard");
        }
    } else {
        toast({ title: "登入失敗", description: "密碼錯誤。", variant: "destructive" });
    }
  };

  const isLoading = isUserLoading || classesLoading || teachersLoading;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-primary">歡迎來到南梓實小虛擬銀行</h1>
          <p className="text-lg text-foreground/80 mt-2">您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！</p>
      </div>
      
      {isLoading ? (
         <div className="text-primary">載入教室資料中...</div>
      ) : (
        <LoginForm 
            classes={classes || []} 
            teachers={teachers || []} 
            onStudentLogin={handleStudentLogin}
            onTeacherLogin={handleTeacherLogin}
            isAuthLoading={isUserLoading}
        />
      )}

      <footer className="mt-12 text-center text-sm text-foreground/60">
        <p>© 2025 南梓實小虛擬銀行, 版權所有。</p>
      </footer>
    </main>
  );
}
