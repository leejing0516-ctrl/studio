"use client";

import { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, School, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, Teacher, Class, PlatformConfig } from '@/lib/types';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';
import { AppDataContext } from '@/context/AppDataContext';


function LoginPageContent() {
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [classId, setClassId] = useState('');
  
  const [teacherPassword, setTeacherPassword] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [localClasses, setLocalClasses] = useState<Class[]>([]);
  const [localTeachers, setLocalTeachers] = useState<Teacher[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sortedTeachers = useMemo(() => {
    return [...localTeachers].sort((a, b) => {
        if (a.sortOrder && b.sortOrder) return a.sortOrder - b.sortOrder;
        if (a.sortOrder) return -1;
        if (b.sortOrder) return 1;
        return (a.id || '').localeCompare(b.id || '');
    });
  }, [localTeachers]);

  useEffect(() => {
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'student') {
        router.replace('/dashboard');
        return;
    } else if (userRole === 'teacher') {
        router.replace('/teacher/dashboard');
        return;
    }

    const fetchLoginData = async () => {
        setIsLoading(true);
        try {
            const [classesSnap, teachersSnap, configDoc] = await Promise.all([
                getDocs(collection(db, "classes")),
                getDocs(collection(db, "teachers")),
                getDoc(doc(db, 'config', 'main'))
            ]);
            setLocalClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Class[]);
            setLocalTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Teacher[]);
            if (configDoc.exists()) {
                setPlatformConfig(configDoc.data() as PlatformConfig);
            }
        } catch (e) {
            console.error("Failed to fetch login data", e);
            toast({ title: "錯誤", description: "無法載入班級與教師資料，請重新整理頁面。", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    fetchLoginData();
  }, [router, toast]);

  const handleStudentLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);

    if (!classId || !studentIdInput || !studentPassword) {
        toast({ title: "資訊不完整", description: "請填寫所有欄位。", variant: "destructive" });
        setIsLoggingIn(false);
        return;
    }
    
    try {
        const studentRef = doc(db, 'students', `${classId}-${studentIdInput}`);
        const studentDoc = await getDoc(studentRef);

        if (studentDoc.exists()) {
            const foundStudent = studentDoc.data() as Student;
            if (foundStudent.password === studentPassword) {
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
  }, [classId, studentIdInput, studentPassword, router, toast]);
  
  const handleTeacherLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    if (!selectedTeacherId || !teacherPassword) {
        toast({ title: "資訊不完整", description: "請選擇帳號並輸入密碼。", variant: "destructive" });
        setIsLoggingIn(false);
        return;
    }

    try {
        const teacher = localTeachers.find(t => t.id === selectedTeacherId);
        if (!teacher) {
            throw new Error("找不到教師帳號");
        }
        const correctPassword = teacher.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

        if (teacherPassword === correctPassword) {
            toast({ title: "登入成功！", description: `歡迎回來，${teacher.name}！` });
            localStorage.setItem('userRole', 'teacher');
            localStorage.setItem('teacherId', selectedTeacherId);
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
  }, [selectedTeacherId, teacherPassword, localTeachers, platformConfig, router, toast]);

  const isFormDisabled = isLoggingIn || isLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <header className="mb-8 text-center animate-in fade-in slide-in-from-top duration-700">
        {platformConfig?.homeIllustrationUrl && (
            <div className="relative h-48 w-1/2 max-w-md mx-auto mb-4">
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
                    <Select onValueChange={(value) => setClassId(value)} value={classId} disabled={isFormDisabled}>
                        <SelectTrigger id="class-select">
                            <SelectValue placeholder="請選擇班級" />
                        </SelectTrigger>
                        <SelectContent>
                            {localClasses.map(c => (
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
                <Button type="submit" className="w-full" disabled={isFormDisabled}>
                    {isLoggingIn ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    {isLoggingIn ? "登入中..." : "登入"}
                </Button>
                </CardFooter>
            </form>
            </Card>
            
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
                    <Label htmlFor="teacher-id-select">教師帳號</Label>
                    <Select onValueChange={(value) => setSelectedTeacherId(value)} value={selectedTeacherId} disabled={isFormDisabled}>
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
                <Button type="submit" className="w-full" variant="outline" disabled={isFormDisabled}>
                    {isLoggingIn ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    {isLoggingIn ? "登入中..." : "以老師身份進入"}
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

export default function HomePage() {
  // This outer component now does nothing but render the content.
  // No providers are wrapped here.
  return <LoginPageContent />;
}
