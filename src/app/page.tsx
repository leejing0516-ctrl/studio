
"use client";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from '@/store/useSchoolStore';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/logo';

export default function LoginPage() {
  const [userType, setUserType] = useState("student");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [password, setPassword] = useState("");
  const { handleLogin, isLoading } = useAuth();
  const { classes, students, teachers, config } = useSchoolStore();

  const handleUserTypeChange = (value: string) => {
    setUserType(value);
    // Reset fields
    setClassId("");
    setStudentId("");
    setTeacherId("");
    setPassword("");
  };

  const filteredStudents = classId ? students.filter(s => s.classId === classId) : [];

  const onLogin = () => {
    if (userType === 'student') {
        handleLogin({ role: 'student', classId, studentId });
    } else {
        handleLogin({ role: 'teacher', teacherId, password });
    }
  }

  const isLoginDisabled = () => {
    if (isLoading) return true;
    if (userType === 'student') {
        return !classId || !studentId;
    }
    if (userType === 'teacher') {
        return !teacherId || !password;
    }
    return true;
  }
  
  const pageStyle = {
    '--background': config?.theme.background || '0 0% 100%',
    '--foreground': config?.theme.foreground || '0 0% 3.9%',
    '--primary': config?.theme.primary || '0 0% 9%',
    '--primary-foreground': config?.theme.primaryForeground || '0 0% 98%',
    '--card': config?.theme.card || '0 0% 100%',
    '--card-foreground': config?.theme.cardForeground || '0 0% 3.9%',
    '--popover': config?.theme.popover || '0 0% 100%',
    '--popover-foreground': config?.theme.popoverForeground || '0 0% 3.9%',
    '--secondary': config?.theme.secondary || '0 0% 96.1%',
    '--secondary-foreground': config?.theme.secondaryForeground || '0 0% 9%',
    '--muted': config?.theme.muted || '0 0% 96.1%',
    '--muted-foreground': config?.theme.mutedForeground || '0 0% 45.1%',
    '--accent': config?.theme.accent || '0 0% 96.1%',
    '--accent-foreground': config?.theme.accentForeground || '0 0% 9%',
    '--destructive': config?.theme.destructive || '0 84.2% 60.2%',
    '--destructive-foreground': config?.theme.destructiveForeground || '0 0% 98%',
    '--border': config?.theme.border || '0 0% 89.8%',
    '--input': config?.theme.input || '0 0% 89.8%',
    '--ring': config?.theme.ring || '0 0% 3.9%',
    '--radius': config?.theme.radius || '0.5rem'
  } as React.CSSProperties;


  return (
    <div style={pageStyle} className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-4 mb-6">
        <Logo className="h-12 w-12" />
        <h1 className="text-3xl font-bold text-foreground">{config?.platformName || "南梓實小虛擬銀行"}</h1>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>登入</CardTitle>
          <CardDescription>請選擇您的身分以繼續</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-type">您的身分</Label>
            <Select value={userType} onValueChange={handleUserTypeChange}>
              <SelectTrigger id="user-type">
                <SelectValue placeholder="選擇身分" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">學生</SelectItem>
                <SelectItem value="teacher">教師</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userType === 'student' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="class">班級</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="選擇班級" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student">姓名</Label>
                <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
                  <SelectTrigger id="student">
                    <SelectValue placeholder="選擇姓名" />
                  </SelectTrigger>
                  <SelectContent>
                     {filteredStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.seatNumber}號 {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {userType === 'teacher' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="teacher">教師</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="選擇教師" />
                  </SelectTrigger>
                  <SelectContent>
                     {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <Input id="password" type="password" placeholder="輸入密碼" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={onLogin} disabled={isLoginDisabled()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            登入
          </Button>
        </CardFooter>
      </Card>
      {config?.footerText && (
        <footer className="mt-8 text-center text-sm text-muted-foreground">
            <p>{config.footerText}</p>
        </footer>
      )}
    </div>
  );
}
