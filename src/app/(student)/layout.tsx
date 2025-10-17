"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarProvider,
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
  Wallet,
  Coins,
  ShieldQuestion,
  BookUp,
  GraduationCap,
  Mail,
  Home,
  FileEdit,
  Loader2,
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
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/logo";
import { useSchoolStore } from "@/store/useSchoolStore";


export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { student, handleLogout, isLoading } = useAuth();
  const { config, students, classes } = useSchoolStore();

  const currentStudent = React.useMemo(() => {
    if (!student?.id) return null;
    return students.find(s => s.id === student.id);
  }, [student, students]);

  const currentClass = React.useMemo(() => {
    if (!currentStudent?.classId) return null;
    return classes.find(c => c.id === currentStudent.classId);
  }, [currentStudent, classes]);

  const navItems = [
    ...(config?.homeLinks.map(link => ({
        href: link.url,
        label: link.title,
        icon: Home,
        roles: ['student']
    })) || []),
    { href: "/dashboard", label: "儀表板", icon: LayoutDashboard, roles: ['student'] },
    { href: "/my-class", label: "我的班級", icon: GraduationCap, roles: ['student'] },
    { href: "/announcements", label: "最新公告", icon: Megaphone, roles: ['student'] },
    { href: "/rewards", label: "獎勵兌換", icon: Gift, roles: ['student'] },
    { href: "/challenges", label: "挑戰任務", icon: Flag, roles: ['student'] },
    { href: "/habits", label: "習慣養成", icon: Repeat, roles: ['student'] },
    ...(config?.showBuKeXingQiu ? [{ href: "/bu-ke-xing-qiu", label: "布可星球", icon: BookUp, roles: ['student'] }] : []),
    { href: "/wallet", label: "我的錢包", icon: Wallet, roles: ['student'] },
    { href: "/invest", label: "投資理財", icon: LineChart, roles: ['student'] },
    { href: "/fundraising", label: "愛心募資", icon: HeartHandshake, roles: ['student'] },
    { href: "/feedback", label: "意見回饋", icon: Mail, roles: ['student'] },
  ];

  const studentNavItems = navItems.map(item => ({
      ...item,
      href: `/${student?.id}${item.href}`
  }));

  const currentNavItem = studentNavItems.find(item => pathname.includes(item.href));

  if (isLoading || !student || !currentStudent) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin" />
        正在載入學生資料...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              {config?.platformName || '虛擬銀行'}
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {studentNavItems.map((item) => (
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
                   <AvatarImage src={currentStudent.avatarUrl || `https://picsum.photos/seed/${currentStudent.id}/100`} data-ai-hint="student avatar" />
                  <AvatarFallback>{currentStudent.name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold text-lg">{currentStudent.name}</p>
                   <p className="text-xs text-muted-foreground">{currentClass?.name || '未分班'} | {currentStudent.seatNumber}號</p>
                </div>
                <ChevronDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
              <DropdownMenuLabel>我的帳號</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
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
        <header className="flex h-14 items-center justify-between border-b bg-white/50 backdrop-blur-lg px-4 md:px-6 sticky top-0 z-10">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-semibold md:text-xl capitalize">
                {currentNavItem?.label || '儀表板'}
            </h1>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Coins className="text-yellow-500" />
                    <span className="font-bold text-lg">{currentStudent.points}</span>
                </div>
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
