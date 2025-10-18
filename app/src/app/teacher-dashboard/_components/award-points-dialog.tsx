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
import { type Class } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

const MOCK_CLASSES: Class[] = [
    { id: '1', name: '一年甲班' },
    { id: '2', name: '二年乙班' },
];

const MOCK_STUDENTS = [
    {id: 's1', name: '陳小明', classId: '1'},
    {id: 's2', name: '林美麗', classId: '1'},
    {id: 's3', name: '黃大為', classId: '2'},
];

export function AwardPointsDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [points, setPoints] = useState<number>(100);
  const { toast } = useToast();

  const studentsInClass = MOCK_STUDENTS.filter(s => s.classId === selectedClass);

  const handleAwardPoints = async () => {
    toast({
      title: "功能正在重建中",
      description: "此功能暫時停用。",
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>獎勵點數</DialogTitle>
          <DialogDescription>
            選擇班級和學生以獎勵點數。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="class" className="text-right">
              班級
            </Label>
            <Select onValueChange={setSelectedClass} value={selectedClass}>
              <SelectTrigger id="class" className="col-span-3">
                <SelectValue placeholder="選擇班級" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_CLASSES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="student" className="text-right">
              學生
            </Label>
            <Select
              onValueChange={setSelectedStudent}
              value={selectedStudent}
              disabled={!selectedClass}
            >
              <SelectTrigger id="student" className="col-span-3">
                <SelectValue placeholder={!selectedClass ? "請先選擇班級" : "選擇學生"} />
              </SelectTrigger>
              <SelectContent>
                {(studentsInClass || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="points" className="text-right">
              點數
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
            獎勵
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
