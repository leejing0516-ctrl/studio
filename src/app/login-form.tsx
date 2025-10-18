"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Class, type Teacher } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Building } from "lucide-react";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { initiateAnonymousSignIn } from "@/firebase/auth";
import { getStudentByName } from "@/lib/firestore-actions";

export function LoginForm({
  classes,
  teachers,
}: {
  classes: Class[];
  teachers: Teacher[];
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [auth, user, isUserLoading]);

  const handleStudentLogin = async () => {
    if (!firestore) {
        toast({ title: "錯誤", description: "資料庫尚未初始化，請稍後再試。", variant: "destructive" });
        return;
    }
    if (!selectedClass || !studentName || !studentPassword) {
      toast({ title: "登入失敗", description: "所有欄位均為必填項。", variant: "destructive" });
      return;
    }
    
    if (studentPassword !== 'password') {
      toast({ title: "登入失敗", description: "密碼錯誤。", variant: "destructive" });
      return;
    }

    const student = await getStudentByName(firestore, studentName);

    if (student && student.classId === selectedClass) {
        sessionStorage.setItem('userType', 'student');
        sessionStorage.setItem('userId', student.id);
        sessionStorage.setItem('userName', student.name);
        toast({ title: "學生登入成功", description: "正在將您導向..." });
        router.push("/student-dashboard");
    } else {
        toast({ title: "登入失敗", description: "找不到該學生或班級不正確。", variant: "destructive" });
    }
  };

  const handleTeacherLogin = async () => {
    if (!selectedTeacher || !teacherPassword) {
      toast({ title: "登入失敗", description: "請選擇您的帳號並輸入密碼。", variant: "destructive" });
      return;
    }
    
    if (teacherPassword === "password") {
        const teacher = teachers.find(t => t.id === selectedTeacher);
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

  // Final safety check. If for any reason the props are not ready, render nothing.
  if (!classes || !teachers || classes.length === 0 || teachers.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
      <Card>
        <CardHeader className="items-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold mt-2">學生登入</CardTitle>
          <CardDescription>選擇您的班級，並使用老師提供的姓名和密碼登入。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="class">班級</Label>
            <Select onValueChange={setSelectedClass} value={selectedClass}>
              <SelectTrigger id="class">
                <SelectValue placeholder="請選擇班級" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="student-name">學生姓名</Label>
            <Input
              id="student-name"
              placeholder="請輸入您的姓名 (例如: 陳小明)"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="student-password">密碼</Label>
            <Input
              id="student-password"
              type="password"
              placeholder="請輸入您的密碼"
              value={studentPassword}
              onChange={(e) => setStudentPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleStudentLogin} className="w-full mt-2" disabled={isUserLoading}>
            → 登入
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold mt-2">老師/校長入口</CardTitle>
          <CardDescription>管理您的教室、獎勵學生點數、為獎勵商店補貨以及管理學生名單。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="teacher">教師帳號</Label>
            <Select onValueChange={setSelectedTeacher} value={selectedTeacher}>
              <SelectTrigger id="teacher">
                <SelectValue placeholder="請選擇您的帳號" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="teacher-password">密碼</Label>
            <Input
              id="teacher-password"
              type="password"
              placeholder="請輸入您的密碼"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleTeacherLogin} variant="outline" className="w-full mt-2">
             → 以老師身份進入
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
