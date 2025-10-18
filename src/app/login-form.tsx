
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Class, type Teacher, type Student } from "@/store/school-store";
import Logo from "@/components/logo";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { addStudent, getStudentByName } from "@/lib/firestore-actions";
import { signInAnonymously } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";


export function LoginForm({
  classes,
  teachers,
}: {
  classes: Class[];
  teachers: Teacher[];
}) {
  const [userType, setUserType] = useState("student");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [studentName, setStudentName] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user: firebaseUser, isUserLoading } = useUser();

  // Redirect if user is already logged in
  useEffect(() => {
    if (firebaseUser) {
        // This is a simplification. A real app might need to distinguish
        // between student and teacher users in Firebase Auth (e.g. using custom claims)
        // and redirect accordingly. For now, we assume any logged in user is a student.
        router.push("/student-dashboard");
    }
  }, [firebaseUser, router]);


  const handleLogin = async () => {
     if (!auth) {
        toast({ title: "Login Failed", description: "Authentication service is not ready.", variant: "destructive" });
        return;
    }
    
    // Ensure anonymous user is signed in for backend operations
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            toast({ title: "Authentication Error", description: "Could not connect to the service.", variant: "destructive" });
            return;
        }
    }

    if (userType === "student") {
      if (!studentName || !selectedClass) {
        toast({ title: "Login Failed", description: "Please enter your name and select a class.", variant: "destructive" });
        return;
      }
      
      let student = await getStudentByName(studentName);

      if (!student) {
         toast({ title: "New Profile Created", description: `Welcome, ${studentName}! A new profile has been created for you.` });
          const newStudentData: Omit<Student, 'id'> = {
            name: studentName,
            classId: selectedClass,
            points: 1000, 
            assets: [],
          };
          const newStudentId = await addStudent(newStudentData);
          if (!newStudentId) {
            toast({ title: "Creation Failed", description: "Could not create a new student profile.", variant: "destructive" });
            return;
          }
          student = { ...newStudentData, id: newStudentId };
      }
      
      // Instead of a local store, we now rely on Firebase Auth state.
      // We'll use a trick: sign in the user "anonymously" but the app logic
      // will associate this anonymous user with the student document.
      // A more robust solution would use custom tokens.
      // For now, the login is implicit. We just navigate.
      // We will need to store the student ID to know who is logged in.
      // We'll use sessionStorage for this simple case.
      sessionStorage.setItem('studentId', student.id);
      sessionStorage.setItem('userName', student.name);
      sessionStorage.setItem('userType', 'student');


      router.push("/student-dashboard");

    } else if (userType === "teacher") {
      if (!selectedTeacher || !password) {
        toast({ title: "Login Failed", description: "Please select your name and enter the password.", variant: "destructive" });
        return;
      }
      const teacher = teachers.find((t) => t.id === selectedTeacher);
      // NOTE: This is a demo password. In a real app, use Firebase Auth for teachers.
      if (teacher && password === "password") { 
        sessionStorage.setItem('teacherId', teacher.id);
        sessionStorage.setItem('userName', teacher.name);
        sessionStorage.setItem('userType', 'teacher');
        router.push("/teacher-dashboard");
      } else {
        toast({ title: "Login Failed", description: "Invalid teacher credentials.", variant: "destructive" });
      }
    }
  };

  if (isUserLoading || firebaseUser) {
      return (
          <div className="flex items-center justify-center p-8">
              Loading...
          </div>
      )
  }

  return (
    <Card className="w-full">
      <CardHeader className="items-center">
        <Logo />
        <CardTitle className="mt-4 text-2xl font-bold text-primary">
          FinLit Classroom
        </CardTitle>
        <CardDescription>
          Welcome! Please select your role to log in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-type">I am a...</Label>
            <Select onValueChange={setUserType} defaultValue={userType}>
              <SelectTrigger id="user-type">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userType === "student" && (
            <>
              <div>
                <Label htmlFor="student-name">Your Name</Label>
                <Input
                  id="student-name"
                  placeholder="Enter your full name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select onValueChange={setSelectedClass} value={selectedClass}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {userType === "teacher" && (
            <>
              <div>
                <Label htmlFor="teacher">Teacher</Label>
                <Select
                  onValueChange={setSelectedTeacher}
                  value={selectedTeacher}
                >
                  <SelectTrigger id="teacher">
                    <SelectValue placeholder="Select your name" />
                  </SelectTrigger>
                  <SelectContent>
                    {(teachers || []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleLogin} className="w-full bg-accent hover:bg-accent/90">
          Login
        </Button>
      </CardFooter>
    </Card>
  );
}
