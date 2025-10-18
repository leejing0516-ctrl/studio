"use client";
import { LoginForm } from "./login-form";
import { useSchoolStore } from "@/store/school-store";
import { useEffect } from "react";

export default function Home() {
  const { classes, teachers, fetchInitialData } = useSchoolStore();

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (!classes.length || !teachers.length) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-light-teal p-8">
            <div>Loading classroom data...</div>
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-light-teal p-8">
      <div className="w-full max-w-md">
        <LoginForm classes={classes} teachers={teachers} />
      </div>
    </main>
  );
}
