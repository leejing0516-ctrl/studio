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
import { StudentManagementContext } from '@/context/StudentManagementContext';
import { StudentDataContext } from '@/context/StudentDataContext';


export default function HomePage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const { students } = useContext(StudentManagementContext);
  const { setStudentData } = useContext(StudentDataContext);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === studentId && s.password === password);
    if (student) {
      toast({
        title: "登入成功！",
        description: `歡迎回來，${student.name}！`,
      });
      // Here you would typically set some global state or session
      // For this prototype, we'll just set the current student data
      setStudentData({
          points: student.points,
          portfolio: [], // This should be fetched for the specific student
      });
      router.push('/dashboard');
    } else {
      toast({
        title: "登入失敗",
        description: "您輸入的編號或密碼不正確。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <header className="mb-12 text-center animate-in fade-in slide-in-from-top duration-700">
        <Logo className="h-16 w-auto mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground">
          歡迎來到 FinLit 教室
        </h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          您通往金融素養的門戶，在這裡學習金錢知識既有回報又充滿樂趣！
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
          <form onSubmit={handleLogin}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">學生登入</CardTitle>
              </div>
              <CardDescription>
                使用老師提供給您的編號和密碼登入。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="password">密碼</Label>
                <Input 
                  id="password" 
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
        <Card className="hover:shadow-lg hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="p-3 bg-accent/10 rounded-full">
                <School className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-2xl">老師入口</CardTitle>
            </div>
            <CardDescription>
              管理您的教室、獎勵學生點數、為獎勵商店補貨以及管理學生名單。
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/teacher/dashboard" className="w-full">
              <Button className="w-full" variant="outline">
                以老師身份進入 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      <footer className="text-center mt-12 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} FinLit 教室. 版權所有。</p>
      </footer>
    </div>
  );
}
