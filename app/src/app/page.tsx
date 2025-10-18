
"use client";
import { LoginForm } from "./login-form";
import { useCollection, useFirestore } from "@/firebase";
import { collection } from "firebase/firestore";
import { type Class, type Teacher } from "@/store/school-store";
import { useMemo } from "react";

export default function Home() {
  const firestore = useFirestore();

  const classesQuery = useMemo(() => collection(firestore, 'classes'), [firestore]);
  const teachersQuery = useMemo(() => collection(firestore, 'teachers'), [firestore]);

  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  if (classesLoading || teachersLoading) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-light-teal p-8">
            <div>Loading classroom data...</div>
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-light-teal p-8">
      <div className="w-full max-w-md">
        <LoginForm classes={classes || []} teachers={teachers || []} />
      </div>
    </main>
  );
}
