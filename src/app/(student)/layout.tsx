
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useState, useMemo, useCallback } from "react";
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
  Bell,
  Mail,
  HeartHandshake,
  Repeat,
  Globe
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Student, PointRecord } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { studentData, setStudentData } = useContext(StudentDataContext);
  const { students, setStudents, isLoading } = useContext(AppDataContext);
  const { toast } = useToast();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const student = useMemo(() => studentData.student, [studentData.student]);

  const handleLogout = useCallback(() => {
    setStudentData({ student: null });
    localStorage.removeItem('studentClassId');
    localStorage.removeItem('studentId');
    localStorage.removeItem('studentPassword');
    localStorage.removeItem('userRole');
    router.push('/');
  }, [router, setStudentData]);

  useEffect(() => {
    if (isLoading) return;

    const userRole = localStorage.getItem('userRole');
    const storedClassId = localStorage.getItem('studentClassId');
    const storedStudentId = localStorage.getItem('studentId');
    const storedPassword = localStorage.getItem('studentPassword');

    if (userRole !== 'student' || !storedClassId || !storedStudentId || !storedPassword) {
      handleLogout();
      return;
    }
    
    const foundStudent = students.find(s => s.classId === storedClassId && s.id === storedStudentId);
    
    if (foundStudent && foundStudent.password === storedPassword) {
        if (JSON.stringify(foundStudent) !== JSON.stringify(studentData.student)) {
            setStudentData({ student: foundStudent });
        }
    } else {
        toast({ title: "驗證失敗", description: "您的登入資訊已過期或不正確，請重新登入。", variant: "destructive" });
        handleLogout();
    }
  }, [isLoading, students, studentData.student, setStudentData, handleLogout, toast]);


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
        
        localStorage.setItem('studentPassword', newPassword);

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
    { href: "/habits", label: "習慣養成", icon: Repeat },
    { href: "/fundraising", label: "募資平台", icon: HeartHandshake },
    { href: "/my-collection", label: "我的收藏", icon: Package },
    { href: "/rewards", label: "獎勵商店", icon: Gift },
    { href: "/stocks", label: "股票市場", icon: LineChart },
    { href: "/deposits", label: "定期存款", icon: PiggyBank },
    { href: "/loans", label: "信用貸款", icon: Landmark },
  ];
  
  const pointHistory = useMemo(() => {
    return student?.pointHistory?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  }, [student]);


  if (isLoading || !student) {
      return null;
  }
  
  const NotificationItem = ({ record }: { record: PointRecord }) => {
    const isPositive = record.points > 0;
    const actionText = isPositive ? '發送了' : '扣除了';
    const amountText = isPositive ? `+${record.points.toLocaleString()}` : record.points.toLocaleString();
    const textColor = isPositive ? 'text-green-600' : 'text-red-500';

    const teacherName = record.reason?.match(/由老師 (.*?) (發放|批次發放|扣除|批次扣除)/)?.[1] || record.reason;
    
    return (
        <div className="flex items-start gap-3">
            <Mail className="mt-1 h-4 w-4 text-muted-foreground shrink-0" />
            <div className="text-sm">
                <p>
                    <span className="font-semibold">{teacherName}</span> 
                    {' '}{actionText} <span className={cn("font-bold", textColor)}>{amountText}</span> 點
                </p>
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(record.date), { addSuffix: true, locale: zhTW })}
                </p>
            </div>
        </div>
    )
  }

  return (
    <>
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
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
            <header className="flex h-14 items-center justify-between border-b bg-white/50 backdrop-blur-lg px-4 md:px-6 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="md:hidden" />
                    <h1 className="text-lg font-semibold md:text-xl capitalize">
                        {navItems.find(item => item.href === pathname)?.label || '儀表板'}
                    </h1>
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <Bell />
                        {pointHistory.length > 0 && <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500" />}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">簡訊通知</h4>
                          <p className="text-sm text-muted-foreground">
                            您最近的點數變動紀錄。
                          </p>
                        </div>
                        <Separator />
                        <div className="grid gap-4 max-h-96 overflow-y-auto pr-2">
                            {pointHistory.length > 0 ? (
                                pointHistory.slice(0, 10).map((record, index) => <NotificationItem key={`${record.date}-${index}`} record={record} />)
                            ) : (
                                <p className="text-sm text-center text-muted-foreground py-4">沒有新的通知。</p>
                            )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
            </header>
            <main className="flex-1 p-4 md:p-6">{children}</main>
             <footer className="text-center p-4 text-muted-foreground text-sm border-t bg-white/50 backdrop-blur-lg">
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
