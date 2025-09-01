"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/teacher/dashboard", label: "儀表板", icon: LayoutDashboard },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              FinLit 教室
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
                  <AvatarImage src="https://picsum.photos/101" data-ai-hint="teacher avatar" />
                  <AvatarFallback>圖靈</AvatarFallback>
                </Avatar>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="font-semibold">圖靈博士</p>
                  <p className="text-xs text-muted-foreground">老師</p>
                </div>
                <ChevronDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
              <DropdownMenuLabel>我的帳號</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 size-4" />
                <span>設定</span>
              </DropdownMenuItem>
              <Link href="/">
                <DropdownMenuItem>
                  <LogOut className="mr-2 size-4" />
                  <span>登出</span>
                </DropdownMenuItem>
              </Link>
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
  );
}
