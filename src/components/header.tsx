"use client";

import { useRouter } from "next/navigation";
import Logo from "./logo";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useHydration } from "@/hooks/use-hydration";

const Header = () => {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const hasHydrated = useHydration();

  useEffect(() => {
    if (hasHydrated) {
        setUserName(sessionStorage.getItem('userName'));
    }
  }, [hasHydrated]);


  const handleLogout = () => {
    sessionStorage.removeItem('studentId');
    sessionStorage.removeItem('teacherId');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userType');
    
    router.push("/");
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Logo />
            <span className="font-bold text-primary ml-2">FinLit Classroom</span>
          </div>
          <div className="flex items-center space-x-4">
            {userName && (
              <span className="text-sm text-muted-foreground">
                Welcome, {userName}
              </span>
            )}
            <Button onClick={handleLogout} variant="ghost" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
