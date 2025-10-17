"use client";
import { useState, useMemo, useEffect } from 'react';
import { useSchoolStore } from '@/store/useSchoolStore';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, UserPlus, Trash2, KeySquare, Users, Group, FileUp, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/lib/types';
import { doc, runTransaction, writeBatch, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Papa from 'papaparse';


export default function TeacherDashboard() {
    const { teacher } = useAuth();
    const { classes } = useSchoolStore();

    const availableClasses = useMemo(() => {
        if (!teacher) return [];
        if (teacher.role === 'admin') {
            return classes;
        }
        if (teacher.role === 'teacher') {
            return classes.filter(c => c.teacherId === teacher.id);
        }
        if (teacher.role === 'subject_teacher') {
            return classes.filter(c => teacher.managedClasses?.includes(c.id));
        }
        return [];
    }, [teacher, classes]);

    if (availableClasses.length === 0 && teacher?.role !== 'admin') {
        return <Card><CardHeader><CardTitle>沒有可管理的班級</CardTitle><CardDescription>您目前沒有被指派管理任何班級。</CardDescription></CardHeader></Card>
    }

    return (
        <Tabs defaultValue="points">
            <TabsList>
                <TabsTrigger value="points">班級點數管理</TabsTrigger>
                {teacher?.role === 'admin' && <TabsTrigger value="students">學生帳號管理</TabsTrigger>}
                 {teacher?.role === 'admin' && <TabsTrigger value="groups">班級分組管理</TabsTrigger>}
            </TabsList>
            <TabsContent value="points">
                <PointsTab availableClasses={availableClasses} />
            </TabsContent>
            {teacher?.role === 'admin' && (
                <TabsContent value="students">
                    <StudentManagementTab availableClasses={availableClasses} />
                </TabsContent>
            )}
            {teacher?.role === 'admin' && (
                <TabsContent value="groups">
                    <GroupManagementTab availableClasses={availableClasses} />
                </TabsContent>
            )}
        </Tabs>
    );
}

// Points Management Tab
function PointsTab({ availableClasses }: { availableClasses: any[] }) {
    const { students } = useSchoolStore();
    const { toast } = useToast();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [amount, setAmount] = useState<number | ''>('');
    const [description, setDescription] = useState('');
    const [operation, setOperation] = useState<'add' | 'deduct'>('add');

    useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.find(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

    const classStudents = useMemo(() => {
        return students.filter(s => s.classId === selectedClassId).sort((a,b)=> a.seatNumber - b.seatNumber);
    }, [students, selectedClassId]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedStudents(classStudents.map(s => s.id));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };
    
    const handleOpenDialog = (op: 'add' | 'deduct') => {
        if(selectedStudents.length === 0) {
            toast({ title: "尚未選擇學生", description: "請先勾選要操作的學生", variant: "destructive" });
            return;
        }
        setOperation(op);
        setIsDialogOpen(true);
    };
    
    const handleConfirmTransaction = async () => {
        if (!amount || amount <= 0 || !description) {
            toast({ title: "資料不完整", description: "請輸入有效的點數與事由", variant: "destructive" });
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const studentDocs = await Promise.all(
                    selectedStudents.map(studentId => {
                         const student = students.find(s => s.id === studentId);
                         if (!student?._docId) return null;
                         return transaction.get(doc(db, "students", student._docId));
                    })
                );

                for (const studentDoc of studentDocs) {
                    if (!studentDoc || !studentDoc.exists()) {
                        throw new Error("找不到學生資料");
                    }
                    const currentPoints = studentDoc.data().points || 0;
                    const newPoints = operation === 'add' ? currentPoints + amount : currentPoints - amount;

                    if (newPoints < 0) {
                        throw new Error(`${studentDoc.data().name} 的點數不足，無法扣除`);
                    }
                    
                    const newTransaction = {
                        date: new Date(),
                        description: description,
                        amount: operation === 'add' ? +amount : -amount,
                        type: operation === 'add' ? 'earn' : 'spend'
                    };

                    transaction.update(studentDoc.ref, { 
                        points: newPoints,
                        transactions: [...(studentDoc.data().transactions || []), newTransaction]
                    });
                }
            });
            toast({ title: "操作成功", description: `已為 ${selectedStudents.length} 位學生${operation === 'add' ? '增加' : '扣除'} ${amount} 點` });
            setIsDialogOpen(false);
            setAmount('');
            setDescription('');
            setSelectedStudents([]);
        } catch (error: any) {
            toast({ title: "操作失敗", description: error.message, variant: "destructive" });
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>班級點數管理</CardTitle>
                <CardDescription>對班級學生進行點數的增加或扣除。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-4">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="選擇班級" />
                        </SelectTrigger>
                        <SelectContent>
                             {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => handleOpenDialog('add')} disabled={selectedStudents.length === 0}>
                        增加點數
                    </Button>
                    <Button variant="destructive" onClick={() => handleOpenDialog('deduct')} disabled={selectedStudents.length === 0}>
                        扣除點數
                    </Button>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <input type="checkbox" onChange={handleSelectAll} checked={selectedStudents.length === classStudents.length && classStudents.length > 0} />
                                </TableHead>
                                <TableHead>座號</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead>目前點數</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classStudents.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => handleSelectStudent(student.id)} />
                                    </TableCell>
                                    <TableCell>{student.seatNumber}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.points}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{operation === 'add' ? '增加' : '扣除'}點數</DialogTitle>
                        <DialogDescription>
                            將為 {selectedStudents.length} 位選定的學生{operation === 'add' ? '增加' : '扣除'}點數。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="amount">點數</Label>
                            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="請輸入點數" />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="description">事由</Label>
                             <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="請輸入事由" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleConfirmTransaction}>確認</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

// Student Account Management Tab
function StudentManagementTab({ availableClasses }: { availableClasses: any[] }) {
    const { students, classes } = useSchoolStore();
    const { toast } = useToast();
    const [selectedClassId, setSelectedClassId] = useState('');

    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [isImportStudentOpen, setIsImportStudentOpen] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentSeat, setNewStudentSeat] = useState<number | ''>('');
    const [file, setFile] = useState<File | null>(null);

    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [studentToResetPassword, setStudentToResetPassword] = useState<Student | null>(null);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [newStudentPassword, setNewStudentPassword] = useState('');


     useEffect(() => {
        if (availableClasses.length > 0 && !availableClasses.find(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    }, [availableClasses, selectedClassId]);

     const classStudents = useMemo(() => {
        if (!selectedClassId) return [];
        return students.filter(s => s.classId === selectedClassId).sort((a,b)=> a.seatNumber - b.seatNumber);
    }, [students, selectedClassId]);

    const handleAddStudent = async () => {
         if (!newStudentName || !newStudentSeat || !selectedClassId) {
            toast({ title: "資料不完整", variant: "destructive" });
            return;
        }
        try {
            const batch = writeBatch(db);
            const studentRef = doc(collection(db, "students"));
            batch.set(studentRef, {
                id: studentRef.id,
                name: newStudentName,
                classId: selectedClassId,
                seatNumber: newStudentSeat,
                points: 0,
                deposits: [],
                loans: [],
                transactions: []
            });
            await batch.commit();
            toast({ title: "學生新增成功" });
            setIsAddStudentOpen(false);
            setNewStudentName('');
            setNewStudentSeat('');
        } catch (e: any) {
            toast({ title: "新增失敗", description: e.message, variant: "destructive" });
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };
    
    const handleImportStudents = () => {
        if (!file || !selectedClassId) {
            toast({ title: '請選擇檔案和班級', variant: 'destructive' });
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const requiredFields = ['seatNumber', 'name'];
                const headers = results.meta.fields || [];
                if (!requiredFields.every(field => headers.includes(field))) {
                    toast({ title: 'CSV 檔案格式錯誤', description: `必須包含以下欄位: ${requiredFields.join(', ')}`, variant: 'destructive' });
                    return;
                }

                const newStudents = results.data as { seatNumber: string; name: string }[];

                try {
                    const batch = writeBatch(db);
                    newStudents.forEach(studentData => {
                        const studentRef = doc(collection(db, "students"));
                        batch.set(studentRef, {
                            id: studentRef.id,
                            name: studentData.name,
                            seatNumber: parseInt(studentData.seatNumber, 10),
                            classId: selectedClassId,
                            points: 0,
                            deposits: [],
                            loans: [],
                            transactions: []
                        });
                    });
                    await batch.commit();
                    toast({ title: '學生匯入成功', description: `成功匯入 ${newStudents.length} 位學生` });
                    setIsImportStudentOpen(false);
                    setFile(null);
                } catch (error: any) {
                    toast({ title: '匯入失敗', description: error.message, variant: 'destructive' });
                }
            },
            error: (error: any) => {
                toast({ title: '檔案解析失敗', description: error.message, variant: 'destructive' });
            }
        });
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete?._docId) return;
        try {
            const batch = writeBatch(db);
            const studentRef = doc(db, "students", studentToDelete._docId);
            batch.delete(studentRef);
            await batch.commit();
            toast({ title: "學生已刪除" });
            setStudentToDelete(null);
        } catch (e: any) {
             toast({ title: "刪除失敗", description: e.message, variant: "destructive" });
        }
    };

    // For now, student login does not require password. This is a placeholder.
    const handleResetPassword = async () => {
       toast({ title: "功能開發中", description: "學生登入目前不需要密碼。" });
       setIsResetPasswordOpen(false);
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>學生帳號管理</CardTitle>
                <CardDescription>管理班級中的學生名單。</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4 mb-4">
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="選擇班級" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Button onClick={() => setIsAddStudentOpen(true)} disabled={!selectedClassId}><UserPlus className="mr-2 h-4 w-4"/>新增學生</Button>
                     <Button variant="outline" onClick={() => setIsImportStudentOpen(true)} disabled={!selectedClassId}><FileUp className="mr-2 h-4 w-4"/>批次匯入</Button>
                </div>
                 <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>座號</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classStudents.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell>{student.seatNumber}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => { setStudentToResetPassword(student); setIsResetPasswordOpen(true); }}><KeySquare className="h-4 w-4"/></Button>
                                        <AlertDialog open={!!studentToDelete && studentToDelete.id === student.id} onOpenChange={(open) => !open && setStudentToDelete(null)}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>確定要刪除學生嗎？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        此操作將永久刪除學生「{studentToDelete?.name}」的所有資料，包含點數、交易紀錄等，且無法復原。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">確定刪除</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

             {/* Add Student Dialog */}
            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>新增學生</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">姓名</Label>
                            <Input id="name" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="seat" className="text-right">座號</Label>
                            <Input id="seat" type="number" value={newStudentSeat} onChange={e => setNewStudentSeat(Number(e.target.value))} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleAddStudent}>新增</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* Import Students Dialog */}
            <Dialog open={isImportStudentOpen} onOpenChange={setIsImportStudentOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>批次匯入學生</DialogTitle><DialogDescription>請上傳 CSV 檔案，需包含 seatNumber 和 name 兩個欄位。</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="csv-file">CSV 檔案</Label>
                        <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                         <Button asChild variant="link" className="p-0 h-auto justify-start">
                             <a href="/student_template.csv" download>下載範本檔案</a>
                        </Button>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="secondary">取消</Button></DialogClose>
                        <Button onClick={handleImportStudents}>匯入</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* Reset Password Dialog */}
            <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>重設學生密碼</DialogTitle>
                        <DialogDescription>學生登入目前不需要密碼，此功能暫時停用。</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button>了解</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

// Group Management Tab
function GroupManagementTab({ availableClasses }: { availableClasses: any[] }) {
    const { toast } = useToast();
     useEffect(() => {
        // Placeholder for future logic
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>班級分組管理</CardTitle>
                <CardDescription>此功能正在開發中。</CardDescription>
            </CardHeader>
            <CardContent>
                <p>您未來將可以在這裡為班級設定分組，並進行分組競賽。</p>
            </CardContent>
        </Card>
    )
}
