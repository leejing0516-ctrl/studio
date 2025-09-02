
"use client";

import { useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, School, ArrowRight } from "lucide-react";
import Logo from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { StudentDataContext } from '@/context/StudentDataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppDataContext } from '@/context/AppDataContext';
import { TEACHER_PASSWORD } from '@/lib/placeholder-data';


export default function HomePage() {
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const { students, classes, teachers } = useContext(AppDataContext);
  const { setStudentData } = useContext(StudentDataContext);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId) {
        toast({
            title: "登入失敗",
            description: "請選擇您的班級。",
            variant: "destructive",
        });
        return;
    }
    const student = students.find(s => s.classId === classId && s.id === studentId && s.password === password);
    if (student) {
      toast({
        title: "登入成功！",
        description: `歡迎回來，${student.name}！`,
      });
      setStudentData({
          student: student,
          points: student.points,
          portfolio: student.portfolio || [],
          redeemedRewards: student.redeemedRewards || [],
          loans: student.loans || [],
      });
      router.push('/dashboard');
    } else {
      toast({
        title: "登入失敗",
        description: "您輸入的班級、編號或密碼不正確。",
        variant: "destructive",
      });
    }
  };
  
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.id === teacherId);

    // Using a shared password for simplicity as requested
    if (teacher && password === TEACHER_PASSWORD) {
        toast({
            title: "教師登入成功",
            description: `歡迎，${teacher.name}！`,
        });
        // Store teacher role for access control
        localStorage.setItem('teacherRole', teacher.role);
        localStorage.setItem('teacherClassId', teacher.classId || 'admin');
        localStorage.setItem('teacherName', teacher.name);
        router.push('/teacher/dashboard');
    } else {
        toast({
            title: "登入失敗",
            description: "您輸入的帳號或密碼不正確。",
            variant: "destructive",
        });
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <header className="mb-12 text-center animate-in fade-in slide-in-from-top duration-700">
        <Logo className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground">
          歡迎來到南梓實小虛擬銀行
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
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
                 <Select onValueChange={setClassId} value={classId}>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-password">密碼</Label>
                <Input 
                  id="student-password" 
                  type="password" 
                  placeholder="請輸入您的密碼" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                登入 <ArrowRight className="ml-2 h-4 w-4" />
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
                  <Select onValueChange={setTeacherId} value={teacherId}>
                     <SelectTrigger id="teacher-id-select">
                         <SelectValue placeholder="請選擇您的帳號" />
                     </SelectTrigger>
                     <SelectContent>
                         {teachers.map(t => (
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" variant="outline">
                以老師身份進入 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
      <footer className="text-center mt-12 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} 南梓實小虛擬銀行. 版權所有。</p>
      </footer>
    </div>
  );
}
