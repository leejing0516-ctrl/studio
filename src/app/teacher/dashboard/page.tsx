
"use client";

import { useState, useContext, useEffect, useMemo } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Reward, Student, Teacher, Class } from "@/lib/types";
import { PlusCircle, Edit, Trash2, KeyRound, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AppDataContext } from "@/context/AppDataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TeacherDashboardPage() {
  const { rewards, setRewards, students, setStudents, classes, setClasses, teachers, setTeachers } = useContext(AppDataContext);

  const [role, setRole] = useState<string | null>(null);
  const [teacherClassId, setTeacherClassId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    const storedRole = localStorage.getItem('teacherRole');
    const storedClassId = localStorage.getItem('teacherClassId');
    setRole(storedRole);
    setTeacherClassId(storedClassId);
    if (storedRole === 'admin') {
      setSelectedClassId(classes[0]?.id || '');
    } else {
      setSelectedClassId(storedClassId || '');
    }
  }, [classes]);

  const studentsInView = useMemo(() => {
    if (role === 'admin') {
      return students.filter(s => s.classId === selectedClassId);
    }
    return students.filter(s => s.classId === teacherClassId);
  }, [role, students, selectedClassId, teacherClassId]);

  const [isAddRewardDialogOpen, setIsAddRewardDialogOpen] = useState(false);
  const [isEditRewardDialogOpen, setIsEditRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);

  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [isEditTeacherDialogOpen, setIsEditTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);

  const { toast } = useToast();
  
  const pendingRequests = useMemo(() => students.flatMap(student => 
    (student.redeemedRewards || [])
        .filter(r => r.status === 'pending_use')
        .map(r => ({ student, redemption: r }))
  ).filter(({student}) => {
      if (role === 'admin') return student.classId === selectedClassId;
      return student.classId === teacherClassId;
  }), [students, role, selectedClassId, teacherClassId]);

  const handleApproveUsage = (studentId: string, redemptionId: string) => {
    setStudents(currentStudents => currentStudents.map(student => {
        if (student.id === studentId) {
            return {
                ...student,
                redeemedRewards: student.redeemedRewards.filter(r => r.redemptionId !== redemptionId)
            };
        }
        return student;
    }));
    toast({
        title: "已批准使用",
        description: `您已批准了該學生的獎勵使用請求。`
    });
  };

  const handleAwardPoints = (studentId: string, pointsToAdd: number) => {
    if (!pointsToAdd || pointsToAdd <= 0) {
      toast({
        title: "無效的點數",
        description: "請輸入一個正數。",
        variant: "destructive",
      });
      return;
    }
    setStudents(currentStudents => currentStudents.map(s => s.id === studentId ? { ...s, points: s.points + pointsToAdd } : s));
    const student = students.find(s => s.id === studentId);
    toast({
        title: "點數已發送！",
        description: `您已成功發送 ${pointsToAdd} 點給 ${student?.name}。`
    })
  }

  const handleAddReward = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newReward: Reward = {
      id: rewards.length > 0 ? Math.max(...rewards.map(r => parseInt(r.id.toString()))) + 1 : 1,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      cost: Number(formData.get("cost")),
      stock: Number(formData.get("stock")),
      image: `https://picsum.photos/seed/${Math.random()}/600/400`,
    };
    setRewards(currentRewards => [...currentRewards, newReward]);
    setIsAddRewardDialogOpen(false);
    toast({
        title: "已新增獎勵",
        description: `${newReward.name} 已被新增至商店。`
    })
  };
  
  const handleEditRewardClick = (reward: Reward) => {
    setEditingReward(reward);
    setIsEditRewardDialogOpen(true);
  };
  
  const handleUpdateReward = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingReward) return;

    const formData = new FormData(event.currentTarget);
    const updatedReward: Reward = {
      ...editingReward,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      cost: Number(formData.get("cost")),
      stock: Number(formData.get("stock")),
    };
    
    setRewards(currentRewards => currentRewards.map(r => (r.id === updatedReward.id ? updatedReward : r)));
    setIsEditRewardDialogOpen(false);
    setEditingReward(null);
    toast({
        title: "已更新獎勵",
        description: `${updatedReward.name} 的資訊已更新。`
    })
  }

  const handleDeleteReward = (id: number) => {
    const rewardToDelete = rewards.find(r => r.id === id);
    setRewards(currentRewards => currentRewards.filter(reward => reward.id !== id));
    if(rewardToDelete){
        toast({
            title: "已移除獎勵",
            description: `${rewardToDelete.name} 已被移除。`,
            variant: "destructive"
        })
    }
  }

  const handleAddStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;

    if (students.some(s => s.id === id && s.classId === selectedClassId)) {
        toast({
            title: "新增學生失敗",
            description: `編號 ${id} 在此班級已存在。`,
            variant: "destructive",
        });
        return;
    }

    const newStudent: Student = {
        id,
        name,
        classId: selectedClassId,
        password,
        points: 0,
        avatar: `https://picsum.photos/seed/${id}/100`,
        portfolio: [],
        redeemedRewards: [],
    };
    setStudents(currentStudents => [...currentStudents, newStudent]);
    setIsAddStudentDialogOpen(false);
    toast({
        title: "已新增學生",
        description: `已成功新增學生 ${name}。`
    });
  }

  const handleResetPasswordClick = (student: Student) => {
    setEditingStudent(student);
    setIsResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStudent) return;
    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("new-password") as string;

    setStudents(currentStudents => currentStudents.map(s => s.id === editingStudent.id ? { ...s, password: newPassword } : s));
    setIsResetPasswordDialogOpen(false);
    setEditingStudent(null);
    toast({
        title: "密碼已重設",
        description: `${editingStudent.name} 的密碼已更新。`
    });
  }
  
  const handleAddTeacher = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const classId = formData.get("classId") as string;

    if (teachers.some(t => t.id === id)) {
        toast({
            title: "新增老師失敗",
            description: `ID 為 ${id} 的老師已存在。`,
            variant: "destructive",
        });
        return;
    }
    
    const newTeacher: Teacher = {
        id,
        name,
        classId: classId || null,
        role: 'teacher',
    };
    setTeachers(current => [...current, newTeacher]);
    setIsAddTeacherDialogOpen(false);
    toast({
        title: "已新增老師",
        description: `已成功新增老師 ${name}。`
    });
  }

  const handleEditTeacherClick = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsEditTeacherDialogOpen(true);
  }

  const handleUpdateTeacher = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTeacher) return;
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const classId = formData.get("classId") as string;

    setTeachers(currentTeachers => currentTeachers.map(t => 
        t.id === editingTeacher.id ? { ...t, name, classId: classId || null } : t
    ));

    setIsEditTeacherDialogOpen(false);
    setEditingTeacher(null);
    toast({
        title: "已更新教師資訊",
        description: "教師資訊已成功更新。"
    });
  }
  
  const handleAddClass = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;

    if (classes.some(c => c.id === id)) {
        toast({
            title: "新增班級失敗",
            description: `ID 為 ${id} 的班級已存在。`,
            variant: "destructive",
        });
        return;
    }

    const newClass: Class = { id, name };
    setClasses(current => [...current, newClass]);
    setIsAddClassDialogOpen(false);
    toast({
        title: "已新增班級",
        description: `已成功新增班級 ${name}。`
    });
  };
  
  const unassignedClasses = useMemo(() => {
    const assignedClassIds = teachers.map(t => t.classId).filter(Boolean);
    return classes.filter(c => !assignedClassIds.includes(c.id));
  }, [classes, teachers]);


  return (
    <div className="flex flex-col gap-6">
    {role === 'admin' && (
      <Card>
        <CardHeader>
          <CardTitle>班級選擇</CardTitle>
          <CardDescription>身為校長，您可以選擇要檢視或管理的班級。</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={setSelectedClassId} value={selectedClassId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="請選擇班級" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    )}
    <Tabs defaultValue="students" className="animate-in fade-in-0 duration-500">
      <TabsList className={`grid w-full ${role === 'admin' ? 'grid-cols-5' : 'grid-cols-4'}`}>
        <TabsTrigger value="students">學生管理</TabsTrigger>
        {role === 'admin' && <TabsTrigger value="teachers">教師管理</TabsTrigger>}
        <TabsTrigger value="points">發送點數</TabsTrigger>
        <TabsTrigger value="rewards">獎勵管理</TabsTrigger>
        <TabsTrigger value="requests">
            使用請求
            {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
            )}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="students" className="mt-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>學生名單</CardTitle>
                    <CardDescription>
                        新增、編輯或移除目前所選班級的學生。
                    </CardDescription>
                </div>
                <Button onClick={() => setIsAddStudentDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新增學生
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>編號</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>目前點數</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {studentsInView.map((student) => (
                    <TableRow key={student.id}>
                        <TableCell className="font-mono">{student.id}</TableCell>
                        <TableCell className="flex items-center gap-4">
                        <Avatar>
                            <AvatarImage src={student.avatar} data-ai-hint="student avatar" />
                            <AvatarFallback>
                                {student.name.slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{student.name}</span>
                        </TableCell>
                        <TableCell>{student.points.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleResetPasswordClick(student)}>
                                <KeyRound className="h-4 w-4" />
                           </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
      </TabsContent>

      {role === 'admin' && (
        <TabsContent value="teachers" className="mt-6 space-y-6">
            <Card>
                <CardHeader  className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>教師名單</CardTitle>
                        <CardDescription>新增、編輯或指派班級導師。</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddTeacherDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增老師
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead>班級</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachers.filter(t => t.role === 'teacher').map(teacher => (
                                <TableRow key={teacher.id}>
                                    <TableCell>{teacher.id}</TableCell>
                                    <TableCell>{teacher.name}</TableCell>
                                    <TableCell>{classes.find(c => c.id === teacher.classId)?.name || '未指派'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditTeacherClick(teacher)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader  className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>班級列表</CardTitle>
                        <CardDescription>新增或管理系統中的班級。</CardDescription>
                    </div>
                     <Button onClick={() => setIsAddClassDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        新增班級
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>班級 ID</TableHead>
                                <TableHead>班級名稱</TableHead>
                                <TableHead>班級導師</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.id}</TableCell>
                                    <TableCell>{c.name}</TableCell>
                                    <TableCell>{teachers.find(t => t.classId === c.id)?.name || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      )}
      
      <TabsContent value="points" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>發送點數</CardTitle>
            <CardDescription>
              選擇一位學生並根據他們的成就發送點數。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>學生</TableHead>
                  <TableHead>目前點數</TableHead>
                  <TableHead className="w-[150px]">要發送的點數</TableHead>
                  <TableHead className="text-right w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsInView.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={student.avatar} data-ai-hint="student avatar" />
                        <AvatarFallback>
                          {student.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.name}</span>
                    </TableCell>
                    <TableCell>{student.points.toLocaleString()}</TableCell>
                    <TableCell>
                      <form id={`points-form-${student.id}`} onSubmit={(e) => {
                          e.preventDefault();
                          const points = parseInt(new FormData(e.currentTarget).get('points') as string, 10);
                          handleAwardPoints(student.id, points);
                          (e.target as HTMLFormElement).reset();
                      }}>
                        <Input name="points" type="number" placeholder="例如 50" aria-label={`給 ${student.name} 的點數`} />
                      </form>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" type="submit" form={`points-form-${student.id}`}>發送</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rewards" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>獎勵庫存</CardTitle>
              <CardDescription>
                從學生商店中新增、編輯或移除獎勵。
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddRewardDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                新增獎勵
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>獎勵</TableHead>
                  <TableHead>費用</TableHead>
                  <TableHead>庫存</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell className="font-medium">{reward.name}</TableCell>
                    <TableCell>{reward.cost.toLocaleString()}</TableCell>
                    <TableCell>{reward.stock}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditRewardClick(reward)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteReward(reward.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="requests" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>獎勵使用請求</CardTitle>
            <CardDescription>
              批准學生提出的獎勵使用請求。批准後，獎勵將從學生的收藏中移除。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>學生</TableHead>
                  <TableHead>獎勵名稱</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length > 0 ? (
                    pendingRequests.map(({ student, redemption }) => (
                        <TableRow key={redemption.redemptionId}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{redemption.reward.name}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={() => handleApproveUsage(student.id, redemption.redemptionId)}>同意使用</Button>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center h-24">
                            目前沒有待處理的請求。
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    {/* Dialogs for Rewards */}
    <Dialog open={isAddRewardDialogOpen} onOpenChange={setIsAddRewardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddReward}>
          <DialogHeader>
            <DialogTitle>新增獎勵</DialogTitle>
            <DialogDescription>
              填寫新獎勵項目的詳細資訊。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-name" className="text-right">
                名稱
              </Label>
              <Input id="add-name" name="name" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-description" className="text-right">
                描述
              </Label>
              <Input id="add-description" name="description" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-cost" className="text-right">
                費用
              </Label>
              <Input id="add-cost" name="cost" type="number" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-stock" className="text-right">
                庫存
              </Label>
              <Input id="add-stock" name="stock" type="number" className="col-span-3" required/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">取消</Button>
            </DialogClose>
            <Button type="submit">新增獎勵</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditRewardDialogOpen} onOpenChange={setIsEditRewardDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleUpdateReward}>
          <DialogHeader>
            <DialogTitle>編輯獎勵</DialogTitle>
            <DialogDescription>
              更新「{editingReward?.name}」的詳細資訊。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                名稱
              </Label>
              <Input id="edit-name" name="name" defaultValue={editingReward?.name} className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                描述
              </Label>
              <Input id="edit-description" name="description" defaultValue={editingReward?.description} className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-cost" className="text-right">
                費用
              </Label>
              <Input id="edit-cost" name="cost" type="number" defaultValue={editingReward?.cost} className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stock" className="text-right">
                庫存
              </Label>
              <Input id="edit-stock" name="stock" type="number" defaultValue={editingReward?.stock} className="col-span-3" required/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setEditingReward(null)}>取消</Button>
            </DialogClose>
            <Button type="submit">儲存變更</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialogs for Students */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddStudent}>
          <DialogHeader>
            <DialogTitle>新增學生</DialogTitle>
            <DialogDescription>
              在「{classes.find(c => c.id === selectedClassId)?.name}」建立新的學生帳號。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-id" className="text-right">
                編號
              </Label>
              <Input id="student-id" name="id" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-name" className="text-right">
                姓名
              </Label>
              <Input id="student-name" name="name" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-password" className="text-right">
                密碼
              </Label>
              <Input id="student-password" name="password" type="password" className="col-span-3" required/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">取消</Button>
            </DialogClose>
            <Button type="submit">新增學生</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleConfirmResetPassword}>
          <DialogHeader>
            <DialogTitle>重設密碼</DialogTitle>
            <DialogDescription>
              為學生「{editingStudent?.name}」設定一組新密碼。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                新密碼
              </Label>
              <Input id="new-password" name="new-password" type="password" className="col-span-3" required/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setEditingStudent(null)}>取消</Button>
            </DialogClose>
            <Button type="submit">儲存密碼</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Dialogs for Teachers and Classes (Admin only) */}
       <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddTeacher}>
            <DialogHeader>
              <DialogTitle>新增老師</DialogTitle>
              <DialogDescription>建立新的老師帳號並選擇指派的班級。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacher-id" className="text-right">老師 ID</Label>
                    <Input id="teacher-id" name="id" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacher-name" className="text-right">姓名</Label>
                    <Input id="teacher-name" name="name" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="teacher-class" className="text-right">班級</Label>
                    <Select name="classId">
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="選擇一個未指派的班級" />
                        </SelectTrigger>
                        <SelectContent>
                            {unassignedClasses.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                <Button type="submit">新增老師</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditTeacherDialogOpen} onOpenChange={setIsEditTeacherDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleUpdateTeacher}>
          <DialogHeader>
            <DialogTitle>編輯老師資訊</DialogTitle>
            <DialogDescription>
              更新「{editingTeacher?.name}」的詳細資訊。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-teacher-name" className="text-right">
                姓名
              </Label>
              <Input id="edit-teacher-name" name="name" defaultValue={editingTeacher?.name} className="col-span-3" required/>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-teacher-class" className="text-right">班級</Label>
                <Select name="classId" defaultValue={editingTeacher?.classId || ''}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="選擇班級" />
                    </SelectTrigger>
                    <SelectContent>
                         <SelectItem value="">未指派</SelectItem>
                        {classes.map(c => (
                            <SelectItem key={c.id} value={c.id} disabled={unassignedClasses.every(uc => uc.id !== c.id) && c.id !== editingTeacher?.classId}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setEditingTeacher(null)}>取消</Button>
            </DialogClose>
            <Button type="submit">儲存變更</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddClass}>
          <DialogHeader>
            <DialogTitle>新增班級</DialogTitle>
            <DialogDescription>
              建立一個新的班級。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class-id" className="text-right">
                班級 ID
              </Label>
              <Input id="class-id" name="id" placeholder="例如 3A" className="col-span-3" required/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class-name" className="text-right">
                班級名稱
              </Label>
              <Input id="class-name" name="name" placeholder="例如 三年甲班" className="col-span-3" required/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">取消</Button>
            </DialogClose>
            <Button type="submit">新增班級</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    