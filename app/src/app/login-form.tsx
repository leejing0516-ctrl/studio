"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { type Class, type Teacher } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { User, Building } from "lucide-react";

type StudentLoginDetails = { classId: string; name: string; pass: string; };
type TeacherLoginDetails = { teacherId: string; pass: string; };

export function LoginForm({
  classes,
  teachers,
  onStudentLogin,
  onTeacherLogin,
  isAuthLoading,
}: {
  classes: Class[];
  teachers: Teacher[];
  onStudentLogin: (details: StudentLoginDetails) => void;
  onTeacherLogin: (details: TeacherLoginDetails) => void;
  isAuthLoading: boolean;
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  // Safety check: if props are not ready, render nothing.
  // This prevents rendering an empty form and is a key part of the fix.
  if (!classes || !teachers || classes.length === 0 || teachers.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
      <Card>
        <CardHeader className="items-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <User className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold mt-2">學生登入</CardTitle>
          <CardDescription>選擇您的班級，並使用老師提供的姓名和密碼登入。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="class">班級</Label>
            <Select onValueChange={setSelectedClass} value={selectedClass}>
              <SelectTrigger id="class">
                <SelectValue placeholder="請選擇班級" />
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
          <div>
            <Label htmlFor="student-name">學生姓名</Label>
            <Input
              id="student-name"
              placeholder="請輸入您的姓名 (例如: 陳小明)"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="student-password">密碼</Label>
            <Input
              id="student-password"
              type="password"
              placeholder="請輸入您的密碼"
              value={studentPassword}
              onChange={(e) => setStudentPassword(e.target.value)}
            />
          </div>
          <Button onClick={() => onStudentLogin({ classId: selectedClass, name: studentName, pass: studentPassword })} className="w-full mt-2" disabled={isAuthLoading}>
            → 登入
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="items-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <Building className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold mt-2">老師/校長入口</CardTitle>
          <CardDescription>管理您的教室、獎勵學生點數、為獎勵商店補貨以及管理學生名單。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="teacher">教師帳號</Label>
            <Select onValueChange={setSelectedTeacher} value={selectedTeacher}>
              <SelectTrigger id="teacher">
                <SelectValue placeholder="請選擇您的帳號" />
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
            <Label htmlFor="teacher-password">密碼</Label>
            <Input
              id="teacher-password"
              type="password"
              placeholder="請輸入您的密碼"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
            />
          </div>
          <Button onClick={() => onTeacherLogin({ teacherId: selectedTeacher, pass: teacherPassword })} variant="outline" className="w-full mt-2" disabled={isAuthLoading}>
             → 以老師身份進入
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
