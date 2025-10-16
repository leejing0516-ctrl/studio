
      
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Users, Trash2, Edit, UserPlus, PlusCircle, KeySquare, UserCog, Briefcase, Bank, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from "@/store/useSchoolStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, PointRecord, Teacher, ClassInfo } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Papa from "papaparse";
import { TEACHER_PASSWORD } from "@/lib/placeholder-data";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";


const StudentManagement = () => {
    const { toast } = useToast();
    const { teacher } = useAuth();
    const { students, classes, setStudents: updateAllStudents } = useSchoolStore();
    
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [points, setPoints] = useState<{ [key: string]: number | '' }>({});
    const [reason, setReason] = useState<{ [key: string]: string }>({});
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    
    const [batchPoints, setBatchPoints] = useState<number | ''>('');
    const [batchReason, setBatchReason] = useState('');
    const [batchTarget, setBatchTarget] = useState('selected');

    const availableClasses = useMemo(() => {
      if (teacher?.role === 'admin') {
        return classes;
      }
      const teacherClassIds = teacher?.classIds || [];
      return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.some(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    const filteredStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a,b) => (a.id).localeCompare(b.id));
    }, [students, selectedClassId]);

    const handlePointChange = (studentId: string, value: string) => {
        setPoints(prev => ({ ...prev, [studentId]: value === '' ? '' : Number(value) }));
    };

    const handleReasonChange = (studentId: string, value: string) => {
        setReason(prev => ({ ...prev, [studentId]: value }));
    };

    const handleIndividualSubmit = async (student: Student) => {
        const pointsToUpdate = points[student.id];
        const reasonForUpdate = reason[student.id] || "老師手動調整";

        if (pointsToUpdate === undefined || pointsToUpdate === '') return;

        try {
            await updateAllStudents(currentStudents => 
                currentStudents.map(s => {
                    if (s._docId === student._docId) {
                        const newPoints = (Number(s.points) || 0) + Number(pointsToUpdate);
                        const newRecord: PointRecord = {
                            points: Number(pointsToUpdate),
                            date: new Date().toISOString(),
                            reason: reasonForUpdate,
                            teacherId: teacher?.id
                        };
                        return { 
                            ...s, 
                            points: newPoints,
                            pointHistory: [...(s.pointHistory || []), newRecord]
                        };
                    }
                    return s;
                })
            );

            toast({ title: "點數已更新", description: `已為 ${student.name} 更新 ${pointsToUpdate} 點。` });
            // Clear input fields after submission
            setPoints(prev => ({ ...prev, [student.id]: '' }));
            setReason(prev => ({ ...prev, [student.id]: '' }));
        } catch (error: any) {
            toast({ title: "更新失敗", description: error.message, variant: "destructive" });
        }
    };
    
    const handleBatchSubmit = async () => {
        if (batchPoints === '' || Number(batchPoints) === 0) {
            toast({ title: "請輸入有效的點數", variant: "destructive" });
            return;
        }

        let targetStudentIds: string[] = [];
        if (batchTarget === 'selected') {
            targetStudentIds = selectedStudents;
        } else if (batchTarget === 'all') {
            targetStudentIds = filteredStudents.map(s => s.id);
        } else {
             const classInfo = classes.find(c => c.id === selectedClassId);
             if (classInfo && classInfo.groups && classInfo.groups[teacher?.id || '']) {
                 const group = classInfo.groups[teacher?.id || ''].find(g => g.id === batchTarget);
                 if (group) {
                     targetStudentIds = filteredStudents.filter(s => s.groupId === group.id).map(s => s.id);
                 }
             }
        }
        
        if (targetStudentIds.length === 0) {
            toast({ title: "沒有目標學生", description: "請選擇至少一位學生或一個群組。", variant: "destructive" });
            return;
        }

        try {
            await updateAllStudents(currentStudents => 
                currentStudents.map(s => {
                    if (targetStudentIds.includes(s.id) && s.classId === selectedClassId) {
                        const newPoints = (Number(s.points) || 0) + Number(batchPoints);
                        const newRecord: PointRecord = {
                            points: Number(batchPoints),
                            date: new Date().toISOString(),
                            reason: batchReason || "批次操作",
                            teacherId: teacher?.id
                        };
                        return { 
                            ...s, 
                            points: newPoints,
                            pointHistory: [...(s.pointHistory || []), newRecord]
                        };
                    }
                    return s;
                })
            );
            
            toast({ title: "批次操作成功", description: `已為 ${targetStudentIds.length} 位學生更新 ${batchPoints} 點。` });
            setBatchPoints('');
            setBatchReason('');
            setSelectedStudents([]);

        } catch (error: any) {
            toast({ title: "批次更新失敗", description: error.message, variant: "destructive" });
        }
    };
    
    const teacherGroups = useMemo(() => {
        const classInfo = classes.find(c => c.id === selectedClassId);
        if (!classInfo || !teacher?.id) return [];
        return classInfo.groups?.[teacher.id] || [];
    }, [classes, selectedClassId, teacher]);

    return (
      <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                  <Label htmlFor="class-select">選擇班級</Label>
                  <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                      <SelectTrigger id="class-select">
                          <SelectValue placeholder="請選擇班級" />
                      </SelectTrigger>
                      <SelectContent>
                          {availableClasses.map(classInfo => (
                              <SelectItem key={classInfo.id} value={classInfo.id}>{classInfo.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
          </div>
          
          <Card className="bg-muted/50">
              <CardHeader>
                    <CardTitle className="text-lg">發送/扣除點數</CardTitle>
                    <CardDescription>獎勵或扣除學生的點數。輸入正數為發送，負數為扣除。</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-1 space-y-2">
                      <Label htmlFor="batch-target">批次操作: 選擇目標</Label>
                      <Select value={batchTarget} onValueChange={setBatchTarget}>
                          <SelectTrigger id="batch-target">
                              <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="selected">已選取的學生 ({selectedStudents.length})</SelectItem>
                              <SelectItem value="all">全班</SelectItem>
                              {teacherGroups.map(g => <SelectItem key={g.id} value={g.id}>分組: {g.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="md:col-span-1 space-y-2">
                      <Label htmlFor="batch-points">點數</Label>
                      <Input id="batch-points" type="number" placeholder="例如: 50, -5" value={batchPoints} onChange={e => setBatchPoints(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                      <Label htmlFor="batch-reason">理由 (選填)</Label>
                      <Input id="batch-reason" placeholder="例如: 小組競賽獲勝" value={batchReason} onChange={e => setBatchReason(e.target.value)} />
                  </div>
                  <div className="md:col-span-1">
                      <Button className="w-full" onClick={handleBatchSubmit}>執行</Button>
                  </div>
              </CardContent>
          </Card>

          <div className="mt-6 overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[50px]">
                                <input
                                  type="checkbox"
                                  onChange={(e) => {
                                      if (e.target.checked) {
                                          setSelectedStudents(filteredStudents.map(s => s.id));
                                      } else {
                                          setSelectedStudents([]);
                                      }
                                  }}
                                  checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                              />
                          </TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>分組</TableHead>
                          <TableHead className="text-right">目前點數</TableHead>
                          <TableHead className="w-[200px]">個別操作：點數 (例如: 50, -50)</TableHead>
                          <TableHead className="w-[200px]">理由 (選填)</TableHead>
                          <TableHead className="text-right w-[80px]">執行</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredStudents.length > 0 ? filteredStudents.map(student => (
                          <TableRow key={student.id}>
                              <TableCell>
                                  <input
                                      type="checkbox"
                                      checked={selectedStudents.includes(student.id)}
                                      onChange={(e) => {
                                          if (e.target.checked) {
                                              setSelectedStudents([...selectedStudents, student.id]);
                                          } else {
                                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                          }
                                      }}
                                  />
                              </TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{teacherGroups.find(g => g.id === student.groupId)?.name || '未分組'}</TableCell>
                              <TableCell className="text-right font-medium">{Math.round(Number(student.points || 0)).toLocaleString()}</TableCell>
                              <TableCell>
                                  <Input type="number" value={points[student.id] || ''} onChange={e => handlePointChange(student.id, e.target.value)} />
                              </TableCell>
                              <TableCell>
                                  <Input value={reason[student.id] || ''} onChange={e => handleReasonChange(student.id, e.target.value)} />
                              </TableCell>
                              <TableCell className="text-right">
                                  <Button size="sm" onClick={() => handleIndividualSubmit(student)} disabled={points[student.id] === '' || points[student.id] === undefined}>執行</Button>
                              </TableCell>
                          </TableRow>
                      )) : (
                          <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center">這個班級目前沒有學生。</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </div>
      </div>
    );
};

const TeacherAndClassManagement = () => {
    const { toast } = useToast();
    const { teacher: admin, setTeachers, setClasses, setStudents, setPlatformConfig: setConfig, setAuthInfo } = useAuth();
    const { teachers, classes, students, config } = useSchoolStore();

    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
    const [newTeacherName, setNewTeacherName] = useState('');
    const [newTeacherRole, setNewTeacherRole] = useState('teacher');
    const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
    const [isSavingTeacher, setIsSavingTeacher] = useState(false);

    const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);
    const [isAddClassOpen, setIsAddClassOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    
    const [isDistributePointsOpen, setIsDistributePointsOpen] = useState(false);
    const [distributeTeacher, setDistributeTeacher] = useState<Teacher | null>(null);
    const [distributeAmount, setDistributeAmount] = useState<number | ''>('');
    
    const unassignedClasses = useMemo(() => {
        return classes.filter(c => !teachers.some(t => Array.isArray(t.classIds) && t.classIds.includes(c.id) && t.role === 'teacher'));
    }, [classes, teachers]);


    const handleAddTeacher = async () => {
        if (!newTeacherName) {
            toast({ title: "請輸入教師姓名", variant: "destructive" });
            return;
        }
        if (newTeacherRole === 'teacher' && assignedClassIds.length !== 1) {
            toast({ title: "班級導師只能指派一個班級", variant: "destructive" });
            return;
        }
        setIsSavingTeacher(true);
        try {
            const newTeacherId = `teacher-${Date.now()}`;
            const newTeacher: Teacher = {
                id: newTeacherId,
                name: newTeacherName,
                role: newTeacherRole,
                classIds: assignedClassIds,
                password: config?.teacherPassword || TEACHER_PASSWORD,
                pointBalance: 0,
            };
            
            await setTeachers(current => [...current, newTeacher]);

            toast({ title: "教師已新增", description: `已成功新增 ${newTeacherName} 老師。` });
            setIsAddTeacherOpen(false);
            setNewTeacherName('');
            setNewTeacherRole('teacher');
            setAssignedClassIds([]);
        } catch (e) {
            toast({ title: "新增失敗", description: "建立教師時發生錯誤。", variant: "destructive" });
        } finally {
            setIsSavingTeacher(false);
        }
    };
    
    const handleImpersonate = (targetTeacher: Teacher) => {
        if (!admin || !targetTeacher._docId) return;
        
        localStorage.setItem('impersonator', admin.id);
        setAuthInfo({ role: 'teacher', docId: targetTeacher._docId });
        
        toast({ title: "身分模擬中...", description: `您現在以 ${targetTeacher.name} 的身分登入。` });
        window.location.href = '/teacher/dashboard';
    };
    
    const handleDistributePoints = async () => {
        if (!distributeTeacher || distributeAmount === '' || Number(distributeAmount) <= 0) {
            toast({ title: "請輸入有效的點數", variant: "destructive" });
            return;
        }
        const schoolFunds = config?.schoolFunds || 0;
        if (schoolFunds < Number(distributeAmount)) {
            toast({ title: "學校資金不足", description: `學校總資金僅剩 ${schoolFunds.toLocaleString()} 點。`, variant: "destructive" });
            return;
        }

        try {
            await setConfig({ schoolFunds: schoolFunds - Number(distributeAmount) });
            await setTeachers(current => current.map(t => 
                t.id === distributeTeacher.id ? { ...t, pointBalance: (t.pointBalance || 0) + Number(distributeAmount) } : t
            ));
            toast({ title: "點數已分配", description: `已成功分配 ${Number(distributeAmount).toLocaleString()} 點給 ${distributeTeacher.name} 老師。` });
            setIsDistributePointsOpen(false);
            setDistributeAmount('');
            setDistributeTeacher(null);
        } catch (e) {
            toast({ title: "分配失敗", variant: "destructive" });
        }
    };

    const handleDeleteTeacher = async () => {
        if (!teacherToDelete) return;
        await setTeachers(current => current.filter(t => t.id !== teacherToDelete.id));
        toast({ title: "教師已刪除", variant: "destructive" });
        setTeacherToDelete(null);
    };

    const handleAddClass = async () => {
        if (!newClassName) {
            toast({ title: "請輸入班級名稱", variant: "destructive" });
            return;
        }
        const newClassId = `class-${Date.now()}`;
        const newClass: ClassInfo = {
            id: newClassId,
            name: newClassName,
            announcements: []
        };
        await setClasses(current => [...current, newClass]);
        toast({ title: "班級已新增" });
        setIsAddClassOpen(false);
        setNewClassName('');
    };

    const handleDeleteClass = async () => {
        if (!classToDelete) return;

        try {
             await setStudents(current => current.filter(s => s.classId !== classToDelete.id));
             await setClasses(current => current.filter(c => c.id !== classToDelete.id));
             
             await setTeachers(current => current.map(t => ({
                ...t,
                classIds: (t.classIds || []).filter(cid => cid !== classToDelete.id)
             })));

             toast({ title: "班級已刪除", description: "班級及其所有學生資料、教師關聯皆已被刪除。", variant: "destructive" });
        } catch(e) {
             toast({ title: "刪除失敗", description: "刪除班級時發生錯誤。", variant: "destructive" });
        }
        
        setClassToDelete(null);
    };


    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>教師管理</CardTitle>
                        <CardDescription>管理系統中的教師帳號、分配點數或模擬登入。</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsAddTeacherOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> 新增老師</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID / 姓名</TableHead>
                                <TableHead>角色</TableHead>
                                <TableHead>任教班級</TableHead>
                                <TableHead>點數餘額</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachers.map(t => {
                                const assignedClasses = (t.classIds || []).map(cid => classes.find(c => c.id === cid)?.name).filter(Boolean);
                                return (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <div className="font-medium">{t.name}</div>
                                        <div className="text-xs text-muted-foreground">{t.id}</div>
                                    </TableCell>
                                    <TableCell>{t.role}</TableCell>
                                    <TableCell>{assignedClasses.join(', ') || '-'}</TableCell>
                                    <TableCell>{t.pointBalance?.toLocaleString() || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleImpersonate(t)}><Eye className="mr-1 h-4 w-4" />模擬</Button>
                                        <Button variant="ghost" size="sm" onClick={() => {setDistributeTeacher(t); setIsDistributePointsOpen(true);}}><Coins className="mr-1 h-4 w-4" />分配</Button>
                                        <Button variant="destructive" size="sm" onClick={() => setTeacherToDelete(t)}><Trash2 className="mr-1 h-4 w-4" />刪除</Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>班級管理</CardTitle>
                        <CardDescription>管理學校中的所有班級。</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setIsAddClassOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> 新增班級</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>班級名稱</TableHead>
                                <TableHead>班級導師</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map(c => {
                                const assignedTeacher = teachers.find(t => Array.isArray(t.classIds) && t.classIds.includes(c.id) && t.role === 'teacher');
                                return (
                                <TableRow key={c.id}>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{assignedTeacher?.name || '未指派'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="destructive" size="sm" onClick={() => setClassToDelete(c)}>
                                            <Trash2 className="mr-1 h-4 w-4"/> 刪除
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
             {/* Dialogs */}
            <Dialog open={isAddTeacherOpen} onOpenChange={setIsAddTeacherOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新增教師</DialogTitle>
                        <DialogDescription>建立一個新的教師帳號。預設密碼將會是您在平台設定中定義的密碼。</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-teacher-name">姓名</Label>
                            <Input id="new-teacher-name" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-teacher-role">角色</Label>
                            <Select value={newTeacherRole} onValueChange={setNewTeacherRole}>
                                <SelectTrigger id="new-teacher-role"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teacher">班級導師</SelectItem>
                                    <SelectItem value="subject_teacher">科任教師</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {newTeacherRole === 'teacher' && (
                             <div className="space-y-2">
                                <Label htmlFor="assign-class">指派班級 (導師只能選一個)</Label>
                                <Select value={assignedClassIds[0] || ''} onValueChange={value => setAssignedClassIds([value])}>
                                    <SelectTrigger id="assign-class"><SelectValue placeholder="選擇一個班級"/></SelectTrigger>
                                    <SelectContent>
                                        {unassignedClasses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        {newTeacherRole === 'subject_teacher' && (
                             <div className="space-y-2">
                                <Label>指派班級 (科任可複選)</Label>
                                <ScrollArea className="h-40 rounded-md border p-4">
                                     <div className="space-y-2">
                                        {classes.map(c => (
                                            <div key={c.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`class-${c.id}`}
                                                    checked={assignedClassIds.includes(c.id)}
                                                    onCheckedChange={(checked) => {
                                                        setAssignedClassIds(prev => 
                                                            checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                                                        );
                                                    }}
                                                />
                                                <label htmlFor={`class-${c.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {c.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleAddTeacher} disabled={isSavingTeacher}>儲存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>新增班級</DialogTitle>
                    </DialogHeader>
                     <div className="space-y-2 py-4">
                        <Label htmlFor="new-class-name">班級名稱</Label>
                        <Input id="new-class-name" value={newClassName} onChange={e => setNewClassName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleAddClass}>新增</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isDistributePointsOpen} onOpenChange={setIsDistributePointsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>分配點數給 {distributeTeacher?.name}</DialogTitle>
                        <CardDescription>
                            從學校總資金 (目前: {(config?.schoolFunds || 0).toLocaleString()}點) 中撥款給老師。
                        </CardDescription>
                    </DialogHeader>
                     <div className="space-y-2 py-4">
                        <Label htmlFor="distribute-amount">分配點數</Label>
                        <Input id="distribute-amount" type="number" value={distributeAmount} onChange={e => setDistributeAmount(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleDistributePoints}>確認分配</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={!!teacherToDelete} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確定刪除?</AlertDialogTitle>
                        <AlertDialogDescription>您確定要刪除老師 {teacherToDelete?.name} 嗎? 此動作無法復原。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTeacher} className={buttonVariants({variant: 'destructive'})}>確定刪除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確定刪除?</AlertDialogTitle>
                        <AlertDialogDescription>
                            刪除班級「{classToDelete?.name}」將會永久刪除此班級內**所有學生**的資料，包含點數、股票等。此動作無法復原。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClass} className={buttonVariants({variant: 'destructive'})}>我了解，確定刪除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function TeacherDashboardPage() {
    const { teacher } = useAuth();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>班級與點數總覽</CardTitle>
                    <CardDescription>選擇一個班級以管理學生點數，或進行其他管理操作。</CardDescription>
                </CardHeader>
                <CardContent>
                    {teacher?.role === 'admin' ? (
                        <Tabs defaultValue="students">
                            <TabsList>
                                <TabsTrigger value="students"><Users className="mr-2 h-4 w-4"/>學生管理</TabsTrigger>
                                <TabsTrigger value="management"><Briefcase className="mr-2 h-4 w-4"/>教師與班級管理</TabsTrigger>
                            </TabsList>
                            <TabsContent value="students" className="mt-4">
                                <StudentManagement />
                            </TabsContent>
                            <TabsContent value="management" className="mt-4">
                                <TeacherAndClassManagement />
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <StudentManagement />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    