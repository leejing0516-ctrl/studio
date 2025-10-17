
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Users, Trash2, Edit, UserPlus, PlusCircle, KeySquare, UserCog, Briefcase, Bank, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useSchoolStore } from "@/store/useSchoolStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Student, PointRecord, Teacher, ClassInfo, ClassGroup } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

const PointsTab = () => {
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
        if (!teacher) return [];
        if (teacher.role === 'admin') {
            return classes;
        }
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.find(c => c.id === selectedClassId)) {
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
        <div className="space-y-4">
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
                        <CardTitle className="text-lg">批次發送/扣除點數</CardTitle>
                        <CardDescription>對全班、特定分組或選取的學生進行操作。輸入正數為發送，負數為扣除。</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1 space-y-2">
                        <Label htmlFor="batch-target">操作目標</Label>
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
                        <Button className="w-full" onClick={handleBatchSubmit}>執行批次操作</Button>
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
                            <TableHead className="w-[200px]">個別操作：點數</TableHead>
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
                                    <Input type="number" placeholder="例如: 50, -50" value={points[student.id] || ''} onChange={e => handlePointChange(student.id, e.target.value)} />
                                </TableCell>
                                <TableCell>
                                    <Input value={reason[student.id] || ''} onChange={e => handleReasonChange(student.id, e.target.value)} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleIndividualSubmit(student)} disabled={points[student.id] === '' || points[student.id] === undefined}>送出</Button>
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
    )
}

const GroupManagementTab = () => {
    const { teacher, setStudents, setClasses } = useAuth();
    const { students, classes } = useSchoolStore();
    const { toast } = useToast();

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
    const [groups, setGroups] = useState<ClassGroup[]>([]);
    const [editingGroupName, setEditingGroupName] = useState<{ id: string, name: string } | null>(null);

    const availableClasses = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') return classes;
        const teacherClassIds = teacher.classIds || [];
        return classes.filter(c => teacherClassIds.includes(c.id));
    }, [teacher, classes]);

    const filteredStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a, b) => a.id.localeCompare(b.id));
    }, [students, selectedClassId]);

    useEffect(() => {
        if (availableClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    useEffect(() => {
        if (selectedClassId && teacher?.id) {
            const currentClass = classes.find(c => c.id === selectedClassId);
            setGroups(currentClass?.groups?.[teacher.id] || []);
        }
    }, [selectedClassId, classes, teacher?.id]);

    const handleManageGroups = () => {
        if (!selectedClassId) {
            toast({ title: "請先選擇一個班級", variant: "destructive" });
            return;
        }
        setIsManageGroupsOpen(true);
    };

    const addGroup = () => {
        const newGroup: ClassGroup = { id: `group-${Date.now()}`, name: `新的分組 ${groups.length + 1}` };
        setGroups([...groups, newGroup]);
    };

    const deleteGroup = (groupId: string) => {
        setGroups(groups.filter(g => g.id !== groupId));
    };

    const saveGroups = async () => {
        if (!teacher?.id || !selectedClassId) return;

        await setClasses(prevClasses => prevClasses.map(c => {
            if (c.id === selectedClassId) {
                return {
                    ...c,
                    groups: {
                        ...(c.groups || {}),
                        [teacher.id!]: groups
                    }
                };
            }
            return c;
        }));

        await setStudents(prevStudents => prevStudents.map(s => {
            if (s.classId === selectedClassId && s.groupId && !groups.some(g => g.id === s.groupId)) {
                return { ...s, groupId: undefined };
            }
            return s;
        }));

        toast({ title: "分組已儲存" });
        setIsManageGroupsOpen(false);
    };
    
    const assignStudentToGroup = async (studentId: string, groupId: string) => {
        await setStudents(prevStudents => prevStudents.map(s => 
            s.id === studentId && s.classId === selectedClassId ? { ...s, groupId: groupId } : s
        ));
    };

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <div className="flex-1 max-w-xs">
                    <Label htmlFor="class-select-group">選擇班級</Label>
                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                        <SelectTrigger id="class-select-group">
                            <SelectValue placeholder="請選擇班級" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableClasses.map(classInfo => (
                                <SelectItem key={classInfo.id} value={classInfo.id}>{classInfo.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <Button onClick={handleManageGroups}>
                    <Users className="mr-2 h-4 w-4" /> 管理我的分組
                 </Button>
            </div>
            
            {groups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <p>您尚未為此班級建立任何分組。</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>座號</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead className="w-1/3">指派分組</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>{student.id}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>
                                        <Select 
                                            value={student.groupId || ""} 
                                            onValueChange={(value) => assignStudentToGroup(student.id, value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="未分組" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">未分組</SelectItem>
                                                {groups.map(group => (
                                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={isManageGroupsOpen} onOpenChange={setIsManageGroupsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>管理分組 for {classes.find(c => c.id === selectedClassId)?.name}</DialogTitle>
                        <DialogDescription>新增、編輯或刪除您在此班級的小組。</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {groups.map(group => (
                            <div key={group.id} className="flex items-center gap-2">
                                <Input 
                                    value={editingGroupName?.id === group.id ? editingGroupName.name : group.name}
                                    onFocus={() => setEditingGroupName({ id: group.id, name: group.name })}
                                    onChange={(e) => setEditingGroupName({ id: group.id, name: e.target.value })}
                                    onBlur={() => {
                                        if (editingGroupName?.id === group.id) {
                                            setGroups(groups.map(g => g.id === group.id ? { ...g, name: editingGroupName.name } : g));
                                            setEditingGroupName(null);
                                        }
                                    }}
                                />
                                <Button variant="ghost" size="icon" onClick={() => deleteGroup(group.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" onClick={addGroup}>
                            <PlusCircle className="mr-2 h-4 w-4" /> 新增組別
                        </Button>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={saveGroups}>儲存分組</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function TeacherDashboardPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>班級與點數管理</CardTitle>
                    <CardDescription>在此管理班級、學生分組、發放點數與查看歷史紀錄。</CardDescription>
                </CardHeader>
                <CardContent>
                   <Tabs defaultValue="points" className="w-full">
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="students">學生管理</TabsTrigger>
                        <TabsTrigger value="groups">分組管理</TabsTrigger>
                        <TabsTrigger value="points">發送點數</TabsTrigger>
                        <TabsTrigger value="history">點數歷史</TabsTrigger>
                        <TabsTrigger value="approvals">審核中心</TabsTrigger>
                      </TabsList>
                      <TabsContent value="students" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>學生管理</CardTitle>
                                <CardDescription>即將推出：在此新增、編輯或批次匯入學生資料。</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <p className="text-muted-foreground text-center py-12">此功能正在開發中。</p>
                             </CardContent>
                        </Card>
                      </TabsContent>
                      <TabsContent value="groups" className="mt-4">
                         <Card>
                            <CardHeader>
                                <CardTitle>分組管理</CardTitle>
                                <CardDescription>為目前選擇的班級建立您自己的小組，並將學生指派到各組。</CardDescription>
                            </CardHeader>
                             <CardContent>
                               <GroupManagementTab />
                             </CardContent>
                        </Card>
                      </TabsContent>
                       <TabsContent value="points" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>發送點數</CardTitle>
                                <CardDescription>獎勵或扣除學生的點數。</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <PointsTab />
                             </CardContent>
                        </Card>
                      </TabsContent>
                       <TabsContent value="history" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>點數歷史</CardTitle>
                                <CardDescription>即將推出：查看您在各班級的點數發放歷史紀錄。</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <p className="text-muted-foreground text-center py-12">此功能正在開發中。</p>
                             </CardContent>
                        </Card>
                      </TabsContent>
                       <TabsContent value="approvals" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>審核中心</CardTitle>
                                <CardDescription>即將推出：在此統一審核所有來自學生的申請。</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <p className="text-muted-foreground text-center py-12">此功能正在開發中。</p>
                             </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
