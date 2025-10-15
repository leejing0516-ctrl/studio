
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useContext, useEffect, useState, useMemo } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  Megaphone,
  Flag,
  LineChart,
  HeartHandshake,
  Gift,
  Repeat,
  AlertTriangle,
  BookUser,
  Home,
  DatabaseZap,
  Trophy,
  Bone,
  Palette,
  FileEdit,
  Mail,
  BookUp,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppDataContext } from "@/context/AppDataContext";
import { StudentDataContext } from "@/context/StudentDataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TEACHER_PASSWORD } from "@/lib/placeholder-data";
import Logo from "@/components/logo";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const { platformConfig, teachers, setTeachers } = useContext(AppDataContext);
  const { studentData, setStudentData } = useContext(StudentDataContext);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  const teacher = studentData?.teacher;
  const isImpersonating = useMemo(() => typeof window !== 'undefined' && !!localStorage.getItem('impersonator'), []);

  const hasNewFeedback = useMemo(() => {
    return (platformConfig?.feedback || []).some(f => !f.isRead);
  }, [platformConfig?.feedback]);

  useEffect(() => {
    if (!teacher) {
      router.replace("/");
    }
  }, [teacher, router]);

  const handleLogout = () => {
    localStorage.clear();
    setStudentData({} as any);
    router.replace("/");
  };
  
  const handleStopImpersonating = () => {
    const originalAdminId = localStorage.getItem('impersonator');
    if (!originalAdminId) {
      toast({ title: "返回失敗", description: "找不到原始管理員身份，請重新登入。", variant: "destructive" });
      handleLogout();
      return;
    }
    
    const originalAdmin = teachers.find(t => t.id === originalAdminId);
    const correctPassword = originalAdmin?.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

    localStorage.setItem('userRole', 'teacher');
    localStorage.setItem('teacherId', originalAdminId);
    localStorage.setItem('teacherPassword', correctPassword);
    localStorage.removeItem('impersonator');

    toast({ title: "已返回校長身份" });
    window.location.reload();
  }

  const handleChangePassword = async () => {
     if (!teacher) return;
    setIsSaving(true);
    if (newPassword !== confirmPassword) {
        toast({ title: "密碼不符", description: "新密碼與確認密碼不相符。", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    if (newPassword.length < 3) {
        toast({ title: "密碼太短", description: "新密碼長度至少需要 3 個字元。", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    const correctPassword = teacher?.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;

    if (currentPassword !== correctPassword) {
       toast({ title: "密碼錯誤", description: "您輸入的目前密碼不正確。", variant: "destructive" });
        setIsSaving(false);
        return;
    }

     try {
        await setTeachers(currentTeachers => currentTeachers.map(t => {
            if (t.id === teacher.id) {
                return { ...t, password: newPassword };
            }
            return t;
        }));
        localStorage.setItem('teacherPassword', newPassword);
        toast({ title: "密碼已更新", description: "您的密碼已成功更新。" });
        setIsSettingsOpen(false);
    } catch (e) {
        toast({ title: "更新失敗", description: "更新密碼時發生錯誤。", variant: "destructive" });
    } finally {
         setIsSaving(false);
    }
  }

  const navItems = [
    { href: "/teacher/dashboard", label: "班級與點數管理", icon: LayoutDashboard, roles: ['admin', 'teacher', 'subject_teacher'] },
    { href: "/teacher/class-rankings", label: "班級排名", icon: Users, roles: ['admin', 'teacher', 'subject_teacher'] },
    { href: "/teacher/rankings", label: "全校排名", icon: Trophy, roles: ['admin'] },
    { href: "/teacher/announcements", label: "公告管理", icon: Megaphone, roles: ['admin', 'teacher', 'subject_teacher'] },
    { href: "/teacher/feedback", label: "意見信箱", icon: Mail, roles: ['admin'], hasNew: hasNewFeedback },
    { href: "/teacher/rewards", label: "獎勵管理", icon: Gift, roles: ['admin', 'teacher'] },
    { href: "/teacher/challenges", label: "挑戰管理", icon: Flag, roles: ['admin', 'teacher', 'subject_teacher'] },
    { href: "/teacher/habits", label: "習慣審核", icon: Repeat, roles: ['admin', 'teacher'] },
    { href: "/teacher/bu-ke-xing-qiu", label: "布可星球", icon: BookUp, roles: ['admin'] },
    { href: "/teacher/pets", label: "寵物管理", icon: Bone, roles: ['admin'] },
    { href: "/teacher/stocks", label: "股票管理", icon: LineChart, roles: ['admin'] },
    { href: "/teacher/fundraising", label: "募資管理", icon: HeartHandshake, roles: ['admin'] },
    { href: "/teacher/home-editor", label: "首頁編輯", icon: Home, roles: ['admin'] },
    { href: "/teacher/dashboard-editor", label: "儀表編輯", icon: FileEdit, roles: ['admin'] },
    { href: "/teacher/settings", label: "平台設定", icon: Settings, roles: ['admin'] },
    { href: "/teacher/manual", label: "操作手冊", icon: BookUser, roles: ['admin', 'teacher', 'subject_teacher'] },
  ];
  
  const teacherRole = teacher?.role;
  const availableNavItems = navItems.filter(item => teacherRole && item.roles.includes(teacherRole));
  const currentNavItem = availableNavItems.find(item => pathname.startsWith(item.href));

  const roleNameMapping: { [key: string]: string } = {
    admin: '校長',
    teacher: '班級導師',
    subject_teacher: '科任教師'
  };

  if (!teacher) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        正在載入或導回登入頁…
      </div>
    );
  }

  return (
    <>
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              南梓實小虛擬銀行
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {availableNavItems.map((item) => (
              <SidebarMenuItem key={item.href + (item.label || '')}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  <Link href={item.href} className="relative">
                    <item.icon />
                    <span>{item.label}</span>
                     {item.hasNew && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 p-2 group-data-[collapsible=icon]:justify-center"
              >
                <Avatar className="size-8">
                  <AvatarImage src={`https://picsum.photos/seed/${teacher.name}/100`} data-ai-hint="teacher avatar" />
                  <AvatarFallback>{teacher.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold text-lg">{teacher.name}</p>
                  <p className="text-xs text-muted-foreground">{roleNameMapping[teacher.role || ''] || '老師'}</p>
                </div>
                <ChevronDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
              <DropdownMenuLabel>我的帳號</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)}>
                <Settings className="mr-2 size-4" />
                <span>設定</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                <span>登出</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {isImpersonating && (
          <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-yellow-400 p-2 text-center text-sm font-semibold text-yellow-900">
            <AlertTriangle className="h-4 w-4" />
            <span>您正在以 {teacher.name} 的身份模擬登入。</span>
            <Button size="sm" variant="link" className="h-auto p-0 text-yellow-900 underline" onClick={handleStopImpersonating}>
              返回校長身份
            </Button>
          </div>
        )}
        <header className="flex h-14 items-center justify-between border-b bg-white/50 backdrop-blur-lg px-4 md:px-6 sticky top-0 z-20">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold md:text-xl capitalize">
                {currentNavItem?.label || '儀表板'}
            </h1>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>

    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>帳號設定</DialogTitle>
            <DialogDescription>
                {teacher.role === 'admin' ? '修改您的登入密碼。您也可以修改未來新教師註冊時的「預設密碼」。' : '修改您的個人登入密碼。'}
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="current-password">目前密碼</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="new-password">新密碼</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm-password">確認新密碼</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="secondary">取消</Button>
            </DialogClose>
            <Button onClick={handleChangePassword} disabled={isSaving}>
                {isSaving ? "儲存中..." : "儲存變更"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
