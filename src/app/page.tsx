
"use client";

import { useState, useContext, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, School, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppDataContext } from "@/context/AppDataContext";
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import { DEFAULT_LOGO_URL } from '@/lib/config';
import type { Student } from '@/lib/types';


export default function LoginPage() {
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [classId, setClassId] = useState('');
  
  const [teacherPassword, setTeacherPassword] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const { classes, students, teachers, platformConfig, isLoading } = useContext(AppDataContext);
  
  const sortedTeachers = useMemo(() => {
    if (!teachers) return [];
    return [...teachers].sort((a, b) => {
        if (a.sortOrder && b.sortOrder) return a.sortOrder - b.sortOrder;
        if (a.sortOrder) return -1;
        if (b.sortOrder) return 1;
        return (a.id || '').localeCompare(b.id || '');
    });
  }, [teachers]);

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'student') {
        router.replace('/dashboard');
    } else if (userRole === 'teacher') {
        router.replace('/teacher/dashboard');
    }
  }, [router]);


  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    if (!classId || !studentIdInput || !studentPassword) {
        toast({ title: "資訊不完整", description: "請填寫所有欄位。", variant: "destructive" });
        setIsLoggingIn(false);
        return;
    }
    
    try {
        const foundStudent = students.find(s => s.classId === classId && s.id === studentIdInput);

        if (foundStudent) {
            const studentWithPassword = foundStudent as Student;
            if (studentWithPassword.password === studentPassword) {
                toast({ title: "登入成功！", description: `歡迎回來，${foundStudent.name}！`});
                localStorage.setItem('userRole', 'student');
                localStorage.setItem('studentClassId', classId);
                localStorage.setItem('studentId', studentIdInput);
                localStorage.setItem('studentPassword', studentPassword);
                router.push('/dashboard');
            } else {
                throw new Error("密碼不正確");
            }
        } else {
             throw new Error("找不到學生資料");
        }
    } catch (error) {
        toast({
            title: "登入失敗",
            description: "您輸入的班級、學號或密碼不正確。",
            variant: "destructive",
        });
        setIsLoggingIn(false);
    }
  };
  
  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    if (!selectedTeacherId || !teacherPassword) {
        toast({ title: "資訊不完整", description: "請選擇帳號並輸入密碼。", variant: "destructive" });
        setIsLoggingIn(false);
        return;
    }

    try {
        const teacher = teachers.find(t => t.id === selectedTeacherId);
        if (!teacher) {
            throw new Error("找不到教師帳號");
        }
        const correctPassword = teacher.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

        if (teacherPassword === correctPassword) {
            toast({ title: "登入成功！", description: `歡迎回來，${teacher.name}！` });
            localStorage.setItem('userRole', 'teacher');
            localStorage.setItem('teacherId', selectedTeacherId);
            localStorage.setItem('teacherName', teacher.name);
            localStorage.setItem('teacherClassIds', JSON.stringify(teacher.classIds || []));
            localStorage.setItem('teacherRole', teacher.role);
            localStorage.setItem('teacherPassword', teacherPassword); 
            router.push('/teacher/dashboard');
        } else {
            throw new Error("帳號或密碼不正確");
        }
    } catch (error) {
         toast({
            title: "登入失敗",
            description: "您輸入的帳號或密碼不正確。",
            variant: "destructive",
        });
        setIsLoggingIn(false);
    }
  };

  const isFormDisabled = isLoggingIn || isLoading;

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            正在連接伺服器...
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 font-body">
      <header className="mb-8 text-center animate-in fade-in slide-in-from-top duration-700">
        <div className="relative h-24 w-48 md:h-32 mx-auto mb-2">
            <Image 
                src={platformConfig?.homeIllustrationUrl || DEFAULT_LOGO_URL}
                alt="Virtual Bank"
                fill
                className="object-contain"
                priority
            />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-wider text-foreground">
          {platformConfig?.homeTitle || '南梓實小虛擬銀行'}
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          {platformConfig?.homeSubtitle || '為每一個努力的你,獻上更值得的未來。'}
        </p>
      </header>
      
      <main className="grid md:grid-cols-2 gap-8 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <form onSubmit={handleStudentLogin}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User /> 學生登入</CardTitle>
              <CardDescription>選擇班級，並使用老師提供的編號和密碼登入。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="class-select">班級</Label>
                  <Select onValueChange={setClassId} value={classId} disabled={isFormDisabled}>
                      <SelectTrigger id="class-select">
                          <SelectValue placeholder="請選擇班級" />
                      </SelectTrigger>
                      <SelectContent>
                          {classes.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-id">學生座號</Label>
                <Input 
                  id="student-id" 
                  placeholder="請輸入您的座號 (例如: S001)" 
                  required 
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  disabled={isFormDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-password">密碼</Label>
                <Input 
                  id="student-password" 
                  type="password" 
                  placeholder="請輸入您的密碼" 
                  required 
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  disabled={isFormDisabled}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full text-base py-6" disabled={isFormDisabled}>
                  {isLoggingIn ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {isLoggingIn ? "登入中..." : "登入"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
           <form onSubmit={handleTeacherLogin}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><School /> 老師/校長入口</CardTitle>
                <CardDescription>選擇您的帳號並輸入密碼以進入管理後台。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="teacher-id-select">教師帳號</Label>
                    <Select onValueChange={setSelectedTeacherId} value={selectedTeacherId} disabled={isFormDisabled}>
                        <SelectTrigger id="teacher-id-select">
                            <SelectValue placeholder="請選擇您的帳號" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedTeachers.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher-password">密碼</Label>
                  <Input 
                    id="teacher-password" 
                    type="password" 
                    placeholder="請輸入您的密碼" 
                    required 
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    disabled={isFormDisabled}
                  />
                </div>
              </CardContent>
              <CardFooter>
                  <Button type="submit" className="w-full text-base py-6" disabled={isFormDisabled}>
                    {isLoggingIn ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    {isLoggingIn ? "以老師身份進入" : "以老師身份進入"}
                </Button>
              </CardFooter>
            </form>
        </Card>
      </main>

      <footer className="text-center mt-12 text-muted-foreground text-sm">
        {platformConfig?.sponsorLogoUrls && platformConfig.sponsorLogoUrls.some(url => url) ? (
            <div className="flex flex-col items-center gap-4">
                <span className="text-xs">贊助單位</span>
                <div className="flex flex-wrap justify-center items-center gap-8">
                    {platformConfig.sponsorLogoUrls.map((url, index) => url && (
                        <div key={index} className="relative h-12 w-32">
                            <Image 
                                src={url}
                                alt={`Sponsor Logo ${index + 1}`}
                                fill
                                className="object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        ) : null}
      </footer>
    </div>
  );
}
