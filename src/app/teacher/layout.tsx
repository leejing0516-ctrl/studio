

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useContext } from "react";
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
import Logo from "@/components/logo";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { TEACHER_PASSWORD } from "@/lib/placeholder-data";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { teachers, setTeachers, platformConfig, setPlatformConfig, isLoading } = useContext(AppDataContext);

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [teacherRole, setTeacherRole] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [isImpersonating, setIsImpersonating] = useState(false);


  useEffect(() => {
    const id = localStorage.getItem('teacherId');
    const name = localStorage.getItem('teacherName');
    const role = localStorage.getItem('teacherRole');
    const impersonator = localStorage.getItem('impersonator');
    
    setTeacherId(id);
    setTeacherName(name);
    setTeacherRole(role);
    setIsImpersonating(!!impersonator);
    
    if (!localStorage.getItem('userRole')?.includes('teacher')) {
      router.push('/');
    }
  }, [router, pathname]); // Depend on pathname to re-check on navigation
  
  const handleLogout = () => {
    localStorage.removeItem('teacherName');
    localStorage.removeItem('teacherRole');
    localStorage.removeItem('teacherClassIds');
    localStorage.removeItem('teacherId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('impersonator');
    router.push('/');
  }

  const handleStopImpersonating = () => {
    const originalAdminId = localStorage.getItem('impersonator');
    const originalAdmin = teachers.find(t => t.id === originalAdminId);
    if (!originalAdmin) {
      toast({ title: "返回失敗", description: "找不到原始管理員身份，請重新登入。", variant: "destructive" });
      handleLogout();
      return;
    }
    
    localStorage.setItem('userRole', 'teacher');
    localStorage.setItem('teacherId', originalAdmin.id);
    localStorage.setItem('teacherRole', originalAdmin.role);
    localStorage.setItem('teacherClassIds', JSON.stringify(originalAdmin.classIds));
    localStorage.setItem('teacherName', originalAdmin.name);
    localStorage.removeItem('impersonator');

    toast({ title: "已返回校長身份" });
    window.location.reload();
  }

  const handleChangePassword = async () => {
    setIsSaving(true);
    
    if (!teacherId) {
        toast({ title: "錯誤", description: "無法識別您的身份，請重新登入。", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    
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

    const teacherToUpdate = teachers.find(t => t.id === teacherId);
    if (!teacherToUpdate) {
        toast({ title: "錯誤", description: "找不到您的帳號資訊。", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    const storedPassword = teacherToUpdate.password || platformConfig?.teacherPassword || TEACHER_PASSWORD;
    if (currentPassword !== storedPassword) {
        toast({ title: "密碼錯誤", description: "您輸入的目前密碼不正確。", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    
    // Admins can change the default password for new teachers
    if (teacherRole === 'admin' && teacherId === 'principal') {
        try {
          await setPlatformConfig({ teacherPassword: newPassword });
          toast({ title: "預設密碼已更新", description: "未來新建立的教師帳號將使用此新密碼作為預設密碼。" });
        } catch(e) {
          toast({ title: "預設密碼更新失敗", description: "更新預設密碼時發生錯誤。", variant: "destructive" });
        }
    }


    try {
      await setTeachers(currentTeachers => currentTeachers.map(t => {
          if (t.id === teacherId) {
              return { ...t, password: newPassword };
          }
          return t;
      }));
      toast({ title: "密碼已更新", description: "您的登入密碼已成功更新。" });
      setIsSettingsOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch(e) {
      toast({ title: "更新失敗", description: "更新您的密碼時發生錯誤。", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }


  const navItems = [
    { href: "/teacher/dashboard", label: "班級與點數管理", icon: LayoutDashboard, roles: ['admin', 'teacher', 'subject_teacher'] },
    { href: "/teacher/announcements", label: "公告管理", icon: Megaphone, roles: ['admin', 'teacher'] },
    { href: "/teacher/rewards", label: "獎勵管理", icon: Gift, roles: ['admin', 'teacher'] },
    { href: "/teacher/challenges", label: "挑戰管理", icon: Flag, roles: ['admin', 'teacher'] },
    { href: "/teacher/habits", label: "習慣審核", icon: Repeat, roles: ['admin', 'teacher'] },
    { href: "/teacher/stocks", label: "股票管理", icon: LineChart, roles: ['admin'] },
    { href: "/teacher/fundraising", label: "募資管理", icon: HeartHandshake, roles: ['admin'] },
    { href: "/teacher/settings", label: "平台設定", icon: Settings, roles: ['admin'] },
  ];
  
  const availableNavItems = navItems.filter(item => item.roles.includes(teacherRole || ''));
  const currentNavItem = availableNavItems.find(item => pathname.startsWith(item.href));


  const roleNameMapping: { [key: string]: string } = {
    admin: '校長',
    teacher: '班級導師',
    subject_teacher: '科任教師'
  };


  if (isLoading || !teacherName) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-6 w-6 animate-spin"
            >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            載入中...
        </div>
    );
  }

  return (
    <>
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-8" />
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
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
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
                  <AvatarImage src={`https://picsum.photos/seed/${teacherName}/100`} data-ai-hint="teacher avatar" />
                  <AvatarFallback>{teacherName?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold">{teacherName}</p>
                  <p className="text-xs text-muted-foreground">{roleNameMapping[teacherRole || ''] || '老師'}</p>
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
            <span>您正在以 {teacherName} 的身份模擬登入。</span>
            <Button size="sm" variant="link" className="h-auto p-0 text-yellow-900 underline" onClick={handleStopImpersonating}>
              返回校長身份
            </Button>
          </div>
        )}
        <header className="flex h-14 items-center justify-between border-b bg-background/50 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-20">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold md:text-xl capitalize">
                {currentNavItem?.label || '儀表板'}
            </h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>

    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>帳號設定</DialogTitle>
            <DialogDescription>
                {teacherRole === 'admin' ? '修改您的登入密碼。您也可以修改未來新教師註冊時的「預設密碼」。' : '修改您的個人登入密碼。'}
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

    
