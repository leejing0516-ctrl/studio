
"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from '@/store/useSchoolStore';
import { Loader2, User, Building } from 'lucide-react';

export default function LoginPage() {
  const [classId, setClassId] = useState("");
  const [studentSeatNumber, setStudentSeatNumber] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [teacherId, setTeacherId] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  
  const { handleLogin, isLoading } = useAuth();
  const { classes, students, teachers, config } = useSchoolStore();

  const handleStudentLogin = () => {
    const student = students.find(s => s.classId === classId && s.seatNumber === parseInt(studentSeatNumber, 10));
    if (student) {
        handleLogin({ role: 'student', studentId: student.id, password: studentPassword });
    } else {
        alert("找不到學生資料或座號錯誤");
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
  
  const pageStyle = {
    '--background': `hsl(${config?.theme.background || '0 0% 100%'})`,
    '--foreground': `hsl(${config?.theme.foreground || '0 0% 3.9%'})`,
    '--primary': `hsl(${config?.theme.primary || '0 0% 9%'})`,
    '--primary-foreground': `hsl(${config?.theme.primaryForeground || '0 0% 98%'})`,
    '--card': `hsl(${config?.theme.card || '0 0% 100%'})`,
    '--card-foreground': `hsl(${config?.theme.cardForeground || '0 0% 3.9%'})`,
    '--popover': `hsl(${config?.theme.popover || '0 0% 100%'})`,
    '--popover-foreground': `hsl(${config?.theme.popoverForeground || '0 0% 3.9%'})`,
    '--secondary': `hsl(${config?.theme.secondary || '0 0% 96.1%'})`,
    '--secondary-foreground': `hsl(${config?.theme.secondaryForeground || '0 0% 9%'})`,
    '--muted': `hsl(${config?.theme.muted || '0 0% 96.1%'})`,
    '--muted-foreground': `hsl(${config?.theme.mutedForeground || '0 0% 45.1%'})`,
    '--accent': `hsl(${config?.theme.accent || '0 0% 96.1%'})`,
    '--accent-foreground': `hsl(${config?.theme.accentForeground || '0 0% 9%'})`,
    '--destructive': `hsl(${config?.theme.destructive || '0 84.2% 60.2%'})`,
    '--destructive-foreground': `hsl(${config?.theme.destructiveForeground || '0 0% 98%'})`,
    '--border': `hsl(${config?.theme.border || '0 0% 89.8%'})`,
    '--input': `hsl(${config?.theme.input || '0 0% 89.8%'})`,
    '--ring': `hsl(${config?.theme.ring || '0 0% 3.9%'})`,
    '--radius': config?.theme.radius || '0.5rem'
  } as React.CSSProperties;


  return (
    <div style={pageStyle} className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">{config?.platformName || "南梓實小虛擬銀行"}</h1>
        <p className="text-muted-foreground mt-2">為每一個努力的你,獻上更值得的未來。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Student Login */}
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <User />
              學生登入
            </CardTitle>
            <CardDescription>選擇您的班級,並使用老師提供的編號和密碼登入。</CardDescription>
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
              <Input id="student-seat" placeholder="請輸入您的座號 (例如: 1)" value={studentSeatNumber} onChange={e => setStudentSeatNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">密碼</Label>
              <Input id="student-password" type="password" placeholder="目前登入不需密碼" value={studentPassword} onChange={e => setStudentPassword(e.target.value)} disabled/>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-primary text-primary-foreground" onClick={handleStudentLogin} disabled={isStudentLoginDisabled()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登入
            </Button>
          </CardFooter>
        </Card>

        {/* Teacher Login */}
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Building />
              老師/校長入口
            </CardTitle>
            <CardDescription>管理您的教室、獎勵學生點數、為獎勵商店補貨以及管理學生名單。</CardDescription>
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
            <Button className="w-full" variant="secondary" onClick={handleTeacherLogin} disabled={isTeacherLoginDisabled()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              → 以老師身份進入
            </Button>
          </CardFooter>
        </Card>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>贊助單位</p>
        <div className="flex items-center justify-center gap-4 mt-2">
            <p>玉山銀行 E.SUN BANK</p>
            <p>親子天下</p>
            <p>KIST</p>
            <p>臺南市政府教育局</p>
        </div>
        {config?.footerText && <p className="mt-4">{config.footerText}</p>}
      </footer>
    </div>
  );
}
