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
import { Input } from "@/components/ui/input";
import { type Student, type Class } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { addStudent } from "@/lib/firestore-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ManageStudentsDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [newStudentName, setNewStudentName] = useState<string>("");

  const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes } = useCollection<Class>(classesQuery);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedClass) return null;
    return query(collection(firestore, 'students'), where('classId', '==', selectedClass));
  }, [firestore, selectedClass]);
  const { data: studentsInClass, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);

  useEffect(() => {
    if (!isOpen) {
      setSelectedClass("");
      setNewStudentName("");
    }
  }, [isOpen]);

  const handleAddStudent = () => {
    if (!firestore || !selectedClass || !newStudentName) {
      toast({
        title: "輸入無效",
        description: "請選擇班級並輸入新學生的姓名。",
        variant: "destructive",
      });
      return;
    }

    const newStudentData = {
      name: newStudentName,
      classId: selectedClass,
      points: 0,
      assets: [],
    };
    
    addStudent(firestore, newStudentData);

    toast({
      title: "成功!",
      description: `已將 ${newStudentName} 加入班級。`,
    });
    setNewStudentName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>管理學生</DialogTitle>
          <DialogDescription>
            查看班級名冊並新增學生。密碼預設為 'password'。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="class-select">班級</Label>
              <Select onValueChange={setSelectedClass} value={selectedClass}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="選擇一個班級以查看學生" />
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
            
            {selectedClass && (
                <>
                    <h3 className="text-sm font-medium text-muted-foreground mt-4">班級名冊</h3>
                    <ScrollArea className="h-48 rounded-md border">
                        <div className="p-4">
                            {studentsLoading && <p>載入學生中...</p>}
                            {(studentsInClass || []).length > 0 ? (
                                <ul className="space-y-2">
                                    {studentsInClass?.map(student => (
                                        <li key={student.id} className="text-sm">{student.name}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">這個班級還沒有學生。</p>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="flex items-center space-x-2 pt-4">
                        <Input
                        type="text"
                        placeholder="新學生姓名"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        />
                        <Button onClick={handleAddStudent} size="sm">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            新增
                        </Button>
                    </div>
                </>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
