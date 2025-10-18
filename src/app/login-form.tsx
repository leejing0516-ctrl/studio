
"use client";

import { useState } from "react";
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
import { useUserStore } from "@/store/user-store";
import { useSchoolStore, type Class, type Teacher, type Student } from "@/store/school-store";
import Logo from "@/components/logo";
import { Input } from "@/components/ui/input";
import { mockStudentData } from "@/lib/mock-data";

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
  const { login } = useUserStore();
  const { getStudentByName, addStudent } = useSchoolStore();

  const handleLogin = () => {
    if (userType === "student" && studentName && selectedClass) {
      let student = getStudentByName(studentName);

      if (!student) {
        student = {
          id: `student-${Date.now()}`,
          name: studentName,
          classId: selectedClass,
          points: 1000, // Default points for new student
          assets: [],
          type: 'student'
        } as Omit<Student, 'type'>;
        addStudent(student as Student); // Cast needed here, store manages the type
      }
      
      const userToLogin = {
        ...student,
        type: "student" as const,
      };

      login(userToLogin);
      router.push("/student-dashboard");

    } else if (userType === "teacher" && selectedTeacher && password) {
      const teacher = teachers.find((t) => t.id === selectedTeacher);
      if (teacher && password === "password") { // Demo password
        login({
          id: teacher.id,
          name: teacher.name,
          type: "teacher" as const,
        });
        router.push("/teacher-dashboard");
      } else {
        alert("Invalid teacher credentials");
      }
    }
  };

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
                    {classes.map((c) => (
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
                    {teachers.map((t) => (
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

