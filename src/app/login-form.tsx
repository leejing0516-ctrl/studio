"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from '@/store/useSchoolStore';
import { Loader2, ArrowRight } from 'lucide-react';

export default function LoginForm() {
  const [classId, setClassId] = useState("");
  const [studentSeatNumber, setStudentSeatNumber] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [teacherId, setTeacherId] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  
  const { handleLogin, isLoading } = useAuth();
  const { classes, students, teachers } = useSchoolStore();

  const handleStudentLogin = () => {
    // In a real app, you'd likely want to find the student by seat number and class,
    // then verify the password. For now, we find by ID which is seat number.
    const student = students.find(s => s.classId === classId && s.id.toLowerCase() === studentSeatNumber.toLowerCase());
    
    // Placeholder for password check. In a real app, this would be a hashed password check.
    const isPasswordCorrect = true; // Replace with actual password logic

    if (student && isPasswordCorrect) {
        handleLogin({ role: 'student', studentId: student.id });
    } else {
        alert("找不到學生資料或座號/密碼錯誤");
    }
  }

  const handleTeacherLogin = () => {
    handleLogin({ role: 'teacher', teacherId, password: teacherPassword });
  }
  
  const handleClassChange = (value: string) => {
    setClassId(value);
    setStudentSeatNumber("");
  }

  const isStudentLoginDisabled = () => {
    return isLoading || !classId || !studentSeatNumber;
  }

  const isTeacherLoginDisabled = () => {
    return isLoading || !teacherId || !teacherPassword;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
      {/* Student Login */}
      <Card className="bg-card">
        <CardHeader>
           <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              學生登入
          </CardTitle>
          <CardDescription className="pt-2">選擇您的班級,並使用老師提供的編號和密碼登入。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class">班級</Label>
            <Select value={classId} onValueChange={handleClassChange}>
              <SelectTrigger id="class">
                <SelectValue placeholder="請選擇班級" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-seat">學生座號</Label>
            <Input id="student-seat" placeholder="請輸入您的座號 (例如: S001)" value={studentSeatNumber} onChange={e => setStudentSeatNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-password">密碼</Label>
            <Input id="student-password" type="password" placeholder="請輸入您的密碼" value={studentPassword} onChange={e => setStudentPassword(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleStudentLogin} disabled={isStudentLoginDisabled()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            登入
          </Button>
        </CardFooter>
      </Card>

      {/* Teacher Login */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              老師/校長入口
          </CardTitle>
          <CardDescription className="pt-2">管理您的教室、獎勵學生點數、為獎勵商店補貨以及管理學生名單。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher">教師帳號</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger id="teacher">
                <SelectValue placeholder="請選擇您的帳號" />
              </SelectTrigger>
              <SelectContent>
                 {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teacher-password">密碼</Label>
            <Input id="teacher-password" type="password" placeholder="請輸入您的密碼" value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)} />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={handleTeacherLogin} disabled={isTeacherLoginDisabled()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            → 以老師身份進入
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
