
"use client";

import { useState, useContext, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, School, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppDataContext } from '@/context/AppDataContext';

export default function HomePage() {
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const appData = useContext(AppDataContext);
  const { classes, teachers, platformConfig, isLoading } = appData;

  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => {
        const orderA = a.sortOrder || 99;
        const orderB = b.sortOrder || 99;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.id.localeCompare(b.id);
    });
  }, [teachers]);

  // Redirect if already logged in
  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'student') {
        router.replace('/dashboard');
    } else if (userRole === 'teacher') {
        router.replace('/teacher/dashboard');
    }
  }, [router]);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    if (!classId || !studentId || !studentPassword) {
        toast({
            title: "資訊不完整",
            description: "請填寫所有欄位。",
            variant: "destructive",
        });
        setIsLoggingIn(false);
        return;
    }
    
    // Store credentials and role, then redirect. Validation will happen in the layout.
    localStorage.setItem('userRole', 'student');
    localStorage.setItem('studentClassId', classId);
    localStorage.setItem('studentId', studentId);
    localStorage.setItem('studentPassword', studentPassword);
    
    router.push('/dashboard');
  };
  
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    if (!teacherId || !teacherPassword) {
        toast({
            title: "資訊不完整",
            description: "請選擇帳號並輸入密碼。",
            variant: "destructive",
        });
        setIsLoggingIn(false);
        return;
    }

    // Store credentials and role, then redirect. Validation will happen in the layout.
    localStorage.setItem('userRole', 'teacher');
    localStorage.setItem('teacherId', teacherId);
    localStorage.setItem('teacherPassword', teacherPassword);

    router.push('/teacher/dashboard');
  };

  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">正在從雲端同步資料...</p>
        </div>
      );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <header className="mb-8 text-center animate-in fade-in slide-in-from-top duration-700">
        {platformConfig?.homeIllustrationUrl && (
            <div className="relative h-48 w-full max-w-md mx-auto mb-4">
                <Image 
                    src={platformConfig.homeIllustrationUrl}
                    alt="首頁插圖"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
        )}
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground">
          {platformConfig?.homeTitle || '歡迎來到南梓實小虛擬銀行'}
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          {platformConfig?.homeSubtitle || '您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！'}
        </p>
      </header>

      <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <div className="grid md:grid-cols-2 gap-8">
            {/* Student Login Card */}
            <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
            <form onSubmit={handleStudentLogin}>
                <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                    <User className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">學生登入</CardTitle>
                </div>
                <CardDescription>
                    選擇您的班級，並使用老師提供的編號和密碼登入。
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="class-select">班級</Label>
                    <Select onValueChange={(value) => setClassId(value)} value={classId} disabled={isLoggingIn}>
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
                    <Label htmlFor="student-id">學生編號</Label>
                    <Input 
                    id="student-id" 
                    placeholder="請輸入您的編號" 
                    required 
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    disabled={isLoggingIn}
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
                    disabled={isLoggingIn}
                    />
                </div>
                </CardContent>
                <CardFooter>
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? <Loader2 className="animate-spin" /> : "登入"}
                    {!isLoggingIn && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                </CardFooter>
            </form>
            </Card>
            
            {/* Teacher Login Card */}
            <Card className="hover:shadow-lg hover:border-accent transition-all duration-300 transform hover:-translate-y-1">
            <form onSubmit={handleTeacherLogin}>
                <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                    <div className="p-3 bg-accent/10 rounded-full">
                    <School className="h-8 w-8 text-accent" />
                    </div>
                    <CardTitle className="text-2xl">老師/校長入口</CardTitle>
                </div>
                <CardDescription>
                    管理您的教室、獎勵學生點數、為獎勵商店補貨以及管理學生名單。
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="teacher-id">教師帳號</Label>
                    <Select onValueChange={(value) => setTeacherId(value)} value={teacherId} disabled={isLoggingIn}>
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
                        disabled={isLoggingIn}
                    />
                    </div>
                </CardContent>
                <CardFooter>
                <Button type="submit" className="w-full" variant="outline" disabled={isLoggingIn}>
                    {isLoggingIn ? <Loader2 className="animate-spin" /> : "以老師身份進入"}
                    {!isLoggingIn && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                </CardFooter>
            </form>
            </Card>
        </div>
      </div>
      <footer className="text-center mt-8 text-muted-foreground text-sm">
        {platformConfig?.sponsorLogoUrls && platformConfig.sponsorLogoUrls.some(url => url) ? (
            <div className="flex flex-col items-center gap-4">
                <span className="text-xs">贊助單位</span>
                <div className="flex flex-wrap justify-center items-center gap-8">
                    {platformConfig.sponsorLogoUrls.map((url, index) => url && (
                        <div key={index} className="relative h-12 w-36">
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
        ) : (
            <p>&copy; {new Date().getFullYear()} 南梓實小虛擬銀行. 版權所有。</p>
        )}
      </footer>
    </div>
  );
}
