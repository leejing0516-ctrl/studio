
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
  const { platformConfig, setPlatformConfig } = useContext(AppDataContext);

  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [teacherRole, setTeacherRole] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    const role = localStorage.getItem('teacherRole');
    setTeacherName(name);
    setTeacherRole(role);
    if (!name) {
      router.push('/');
    }
  }, [router]);
  
  const handleLogout = () => {
    localStorage.removeItem('teacherName');
    localStorage.removeItem('teacherRole');
    localStorage.removeItem('teacherClassId');
    localStorage.removeItem('teacherId');
    localStorage.removeItem('userRole');
    router.push('/');
  }

  const handleChangePassword = async () => {
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

    const storedPassword = platformConfig?.teacherPassword || TEACHER_PASSWORD;
    if (currentPassword !== storedPassword) {
        toast({ title: "密碼錯誤", description: "您輸入的目前密碼不正確。", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    try {
      await setPlatformConfig({ teacherPassword: newPassword });
      toast({ title: "密碼已更新", description: "所有教師的登入密碼已成功更新。" });
      setIsSettingsOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch(e) {
      toast({ title: "更新失敗", description: "更新密碼時發生錯誤。", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }


  const navItems = [
    { href: "/teacher/dashboard", label: "儀表板", icon: LayoutDashboard },
  ];

  if (!teacherName) {
    return <div>載入中...</div>; // Or a proper loading screen
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
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
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
                  <p className="text-xs text-muted-foreground">{teacherRole === 'admin' ? '校長' : '老師'}</p>
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
        <header className="flex h-14 items-center justify-between border-b bg-background/50 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-20">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold md:text-xl capitalize">
                教師儀表板
            </h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>

    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>帳號設定</DialogTitle>
            <DialogDescription>修改所有教師及校長的登入密碼。此為共用密碼。</DialogDescription>
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
