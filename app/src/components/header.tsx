"use client";

import { useRouter } from "next/navigation";
import Logo from "./logo";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "firebase/auth";
import { useSimpleUser } from "@/hooks/use-simple-user";

const Header = () => {
  const router = useRouter();
  const { user } = useSimpleUser();

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/");
  };

  return (
    <header className="bg-card/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => router.push('/')}>
            <Logo />
            <span className="font-bold text-primary ml-2">南梓實小虛擬銀行</span>
          </div>
          <div className="flex items-center space-x-4">
            {user?.name && (
              <span className="text-sm text-muted-foreground">
                歡迎, {user.name}
              </span>
            )}
            <Button onClick={handleLogout} variant="ghost" size="sm">
              登出
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
