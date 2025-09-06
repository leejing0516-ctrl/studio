
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import Image from "next/image";
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
  Gift,
  LineChart,
  Settings,
  LogOut,
  ChevronDown,
  Package,
  Landmark,
  KeyRound,
  Megaphone,
  Flag,
  PiggyBank,
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
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/lib/types";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { studentData, setStudentData } = useContext(StudentDataContext);
  const { students, setStudents } = useContext(AppDataContext);
  const { toast } = useToast();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // If there's no student data on page load (e.g., after a refresh), redirect to login
    if (!studentData.student) {
      const storedId = localStorage.getItem('studentId');
      const storedClassId = localStorage.getItem('studentClassId');
      if (storedId && storedClassId) {
        const foundStudent = students.find(s => s.id === storedId && s.classId === storedClassId);
        if (foundStudent) {
            setStudentData({ 
                student: foundStudent,
                points: foundStudent.points,
                portfolio: foundStudent.portfolio,
                redeemedRewards: foundStudent.redeemedRewards,
                loans: foundStudent.loans,
                challenges: foundStudent.challenges,
                fixedDeposits: foundStudent.fixedDeposits,
            });
        } else {
             router.push('/');
        }
      } else {
          router.push('/');
          return;
      }
    }
    
    // Sync student data from the "source of truth" (AppDataContext)
    const latestStudentData = students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId);
    if (latestStudentData) {
        const studentJson = JSON.stringify(studentData.student);
        const latestStudentJson = JSON.stringify(latestStudentData);
        // Only update if the data is actually different to avoid infinite loops
        if (studentJson !== latestStudentJson) {
            setStudentData({ 
                student: latestStudentData,
                points: latestStudentData.points,
                portfolio: latestStudentData.portfolio,
                redeemedRewards: latestStudentData.redeemedRewards,
                loans: latestStudentData.loans,
                challenges: latestStudentData.challenges,
                fixedDeposits: latestStudentData.fixedDeposits || [],
            });
        }
    } else if (studentData.student) {
        // If student is not found in the global list (e.g., removed by teacher), log out
        handleLogout();
    }
  }, [students, studentData.student, setStudentData, router]);


  const student = studentData.student;
  
  const handleLogout = () => {
    setStudentData({ student: null, points: 0, portfolio: [], redeemedRewards: [], loans: [], challenges: [], fixedDeposits: [] });
    localStorage.removeItem('studentId');
    localStorage.removeItem('studentClassId');
    localStorage.removeItem('userRole');
    router.push('/');
  }

  const handleChangePassword = async () => {
    if (!student) return;
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
    
    // In a real app, this should be a secure API call.
    // For this prototype, we'll find the student and check the password.
    const studentToUpdate = students.find(s => s.id === student.id && s.classId === student.classId);

    if (studentToUpdate?.password !== currentPassword) {
        toast({ title: "密碼錯誤", description: "您輸入的目前密碼不正確。", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    try {
        await setStudents(currentStudents => currentStudents.map(s => {
            if (s.id === student.id && s.classId === student.classId) {
                return { ...s, password: newPassword };
            }
            return s;
        }));
        
        toast({ title: "密碼已更新", description: "您的密碼已成功更新。" });
        setIsSettingsOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    } catch(e) {
        toast({ title: "更新失敗", description: "更新密碼時發生錯誤。", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }

  };

  const navItems = [
    { href: "/dashboard", label: "儀表板", icon: LayoutDashboard },
    { href: "/announcements", label: "最新公告", icon: Megaphone },
    { href: "/challenges", label: "挑戰任務", icon: Flag },
    { href: "/my-collection", label: "我的收藏", icon: Package },
    { href: "/rewards", label: "獎勵商店", icon: Gift },
    { href: "/stocks", label: "股票市場", icon: LineChart },
    { href: "/deposits", label: "定期存款", icon: PiggyBank },
    { href: "/loans", label: "信用貸款", icon: Landmark },
  ];

  if (!student) {
      return null; // Or a loading spinner, as the useEffect will redirect
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
                  isActive={pathname === item.href}
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
                  <AvatarImage src={student?.avatar} data-ai-hint="student avatar" />
                  <AvatarFallback>{student?.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold">{student?.name || '學生'}</p>
                  <p className="text-xs text-muted-foreground">學生</p>
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
        <div className="flex flex-col min-h-svh">
            <header className="flex h-14 items-center justify-between border-b bg-background/50 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-20">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-semibold md:text-xl capitalize">
                    {pathname.split("/").pop()?.replace('-', ' ') || '儀表板'}
                </h1>
            </header>
            <main className="flex-1 p-4 md:p-6">{children}</main>
             <footer className="text-center p-4 text-muted-foreground text-sm border-t">
                <p>&copy; {new Date().getFullYear()} 南梓實小虛擬銀行. 版權所有。</p>
            </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>

    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>帳號設定</DialogTitle>
            <DialogDescription>修改您的登入密碼。</DialogDescription>
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
