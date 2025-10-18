
"use client";

import { useState, useEffect } from "react";
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
import { type Student, type Class } from "@/store/school-store";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { awardPoints } from "@/lib/firestore-actions";

export function AwardPointsDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const firestore = useFirestore();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [points, setPoints] = useState<number>(100);
  const { toast } = useToast();

  const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes } = useCollection<Class>(classesQuery);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClass) return null;
    return query(collection(firestore, 'students'), where('classId', '==', selectedClass));
  }, [firestore, selectedClass]);
  const { data: studentsInClass } = useCollection<Student>(studentsQuery);

  useEffect(() => {
    // Reset student selection when class changes
    setSelectedStudent("");
  }, [selectedClass]);

  const handleAwardPoints = () => {
    if (!selectedStudent || points <= 0) {
      toast({
        title: "輸入無效",
        description: "請選擇一位學生並輸入正數點數。",
        variant: "destructive",
      });
      return;
    }
    
    awardPoints(firestore, selectedStudent, points);

    const student = studentsInClass?.find(s => s.id === selectedStudent);
    toast({
      title: "成功!",
      description: `已獎勵 ${points} 點給 ${student?.name}。`,
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
                {(classes || []).map((c) => (
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
                <SelectValue placeholder="選擇學生" />
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
