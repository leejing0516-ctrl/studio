
"use client";

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { StudentDataContext } from './StudentDataContext';

interface AuthContextType {
  // Functions to be added here
}

const AuthContext = createContext<AuthContextType>({});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { setStudentData } = useContext(StudentDataContext);

  const handleLogout = () => {
    localStorage.clear();
    setStudentData({} as any); // Clear student data on logout
    router.replace('/');
  };

  const value = {
    handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
