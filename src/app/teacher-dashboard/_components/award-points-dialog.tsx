
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSchoolStore, type Student, type Class } from "@/store/school-store";
import { useToast } from "@/hooks/use-toast";

export function AwardPointsDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { classes, getStudentsByClass, awardPoints } = useSchoolStore();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [points, setPoints] = useState<number>(100);
  const { toast } = useToast();

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    const students = getStudentsByClass(classId);
    setStudentsInClass(students);
    setSelectedStudent(""); // Reset student selection
  };

  const handleAwardPoints = () => {
    if (!selectedStudent || points <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a student and enter a positive point value.",
        variant: "destructive",
      });
      return;
    }
    awardPoints(selectedStudent, points);
    toast({
      title: "Success!",
      description: `Awarded ${points} points to the selected student.`,
    });
    setIsOpen(false);
    // Reset form
    setSelectedClass("");
    setSelectedStudent("");
    setPoints(100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Award Points</DialogTitle>
          <DialogDescription>
            Select a class and student to award points.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="class" className="text-right">
              Class
            </Label>
            <Select onValueChange={handleClassChange} value={selectedClass}>
              <SelectTrigger id="class" className="col-span-3">
                <SelectValue placeholder="Select a class" />
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="student" className="text-right">
              Student
            </Label>
            <Select
              onValueChange={setSelectedStudent}
              value={selectedStudent}
              disabled={!selectedClass}
            >
              <SelectTrigger id="student" className="col-span-3">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {studentsInClass.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="points" className="text-right">
              Points
            </Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAwardPoints} type="submit">
            Award
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
