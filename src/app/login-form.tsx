"use client";

import { useState } from "react";
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
import { type Class, type Teacher, useSchoolStore } from "@/store/school-store";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Building } from "lucide-react";
import { useUserStore } from "@/store/user-store";

export function LoginForm({
  classes,
  teachers,
}: {
  classes: Class[];
  teachers: Teacher[];
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  const router = useRouter();
  const { toast } = useToast();
  const login = useUserStore((state) => state.login);
  const { getStudentById } = useSchoolStore.getState();


  const handleStudentLogin = async () => {
    if (!selectedClass || !studentId || !studentPassword) {
      toast({ title: "登入失敗", description: "所有欄位均為必填項。", variant: "destructive" });
      return;
    }
    
    // Demo logic: any student ID with 'password' works for the selected class
    const student = getStudentById(studentId);
    if (student && studentPassword === 'password' && student.classId === selectedClass) {
        login({ id: student.id, name: student.name, type: 'student' });
        toast({ title: "學生登入成功", description: "正在將您導向..." });
        router.push("/student-dashboard");
    } else {
        toast({ title: "登入失敗", description: "學生座號、密碼或班級不正確。", variant: "destructive" });
    }
  };

  const handleTeacherLogin = async () => {
    if (!selectedTeacher || !teacherPassword) {
      toast({ title: "登入失敗", description: "請選擇您的帳號並輸入密碼。", variant: "destructive" });
      return;
    }
    
    // Demo logic: any selected teacher with 'password' works
    if (teacherPassword === "password") {
        const teacher = teachers.find(t => t.id === selectedTeacher);
        if (teacher) {
            login({ id: teacher.id, name: teacher.name, type: 'teacher' });
            toast({ title: "老師登入成功", description: "正在將您導向..." });
            router.push("/teacher-dashboard");
        } else {
             toast({ title: "登入失敗", description: "找不到教師帳號。", variant: "destructive" });
        }
    } else {
        toast({ title: "登入失敗", description: "密碼錯誤。", variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
      {/* Student Login Card */}
      <Card>
        <CardHeader className="items-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold mt-2">學生登入</CardTitle>
          <CardDescription>選擇您的班級，並使用老師提供的編號和密碼登入。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="class">班級</Label>
            <Select onValueChange={setSelectedClass} value={selectedClass}>
              <SelectTrigger id="class">
                <SelectValue placeholder="請選擇班級" />
              </SelectTrigger>
              <SelectContent>
                {(classes || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="student-id">學生座號</Label>
            <Input
              id="student-id"
              placeholder="請輸入您的座號 (例如: S001)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
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
          <Button onClick={handleStudentLogin} className="w-full mt-2">
            → 登入
          </Button>
        </CardContent>
      </Card>

      {/* Teacher Login Card */}
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
                {(teachers || []).map((t) => (
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
