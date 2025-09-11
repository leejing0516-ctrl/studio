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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Teacher, Challenge } from "@/lib/types";
import { PlusCircle, Edit, Trash2, Loader2, School, GraduationCap, Coins } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { Badge } from "@/components/ui/badge";

export default function TeacherChallengesPage() {
    const { 
        isLoading, platformConfig, setPlatformConfig, teachers
    } = useContext(AppDataContext);

    const { toast } = useToast();

    const [role, setRole] = useState<string | null>(null);
    const [teacherId, setTeacherId] = useState<string | null>(null);
    
    // State for Challenges
    const [isAddChallengeDialogOpen, setIsAddChallengeDialogOpen] = useState(false);
    const [isEditChallengeDialogOpen, setIsEditChallengeDialogOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
    const [challengeToDelete, setChallengeToDelete] = useState<Challenge | null>(null);
    const [challengeScope, setChallengeScope] = useState<'school' | 'class'>('school');

    useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        const storedTeacherId = localStorage.getItem('teacherId');
        setRole(storedRole);
        setTeacherId(storedTeacherId);
        if (storedRole === 'teacher') {
            setChallengeScope('class');
        }
    }, []);

    const allChallenges = useMemo(() => platformConfig?.challenges || [], [platformConfig]);

    const teacherChallenges = useMemo(() => {
        if (role !== 'teacher' || !teacherId) return [];
        return allChallenges.filter(c => c.providerId === teacherId);
    }, [allChallenges, role, teacherId]);

    const schoolChallenges = useMemo(() => {
        if (role !== 'admin') return [];
        return allChallenges.filter(c => c.scope === 'school');
    }, [allChallenges, role]);

    const allClassChallenges = useMemo(() => {
        if (role !== 'admin') return [];
        return allChallenges.filter(c => c.scope === 'class');
    }, [allChallenges, role]);

    const handleAddChallenge = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const points = Number(formData.get("points"));
        
        if (!teacherId) return;

        const newChallenge: Challenge = {
            id: `challenge-${Date.now()}`,
            name,
            description,
            points,
            scope: challengeScope,
            providerId: challengeScope === 'school' ? 'school_admin' : teacherId,
        };

        const currentChallenges = platformConfig?.challenges || [];
        setPlatformConfig({ challenges: [...currentChallenges, newChallenge] });
        
        toast({ title: "已新增挑戰", description: `已成功新增挑戰「${name}」。` });
        setIsAddChallengeDialogOpen(false);
    };

    const handleEditChallengeClick = (challenge: Challenge) => {
        setEditingChallenge(challenge);
        setChallengeScope(challenge.scope);
        setIsEditChallengeDialogOpen(true);
    };

    const handleUpdateChallenge = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingChallenge) return;

        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const points = Number(formData.get("points"));
        
        const updatedChallenge: Challenge = {
            ...editingChallenge,
            name,
            description,
            points,
        };

        const currentChallenges = platformConfig?.challenges || [];
        setPlatformConfig({ challenges: currentChallenges.map(c => c.id === updatedChallenge.id ? updatedChallenge : c) });

        toast({ title: "已更新挑戰", description: `已成功更新挑戰「${name}」。` });
        setIsEditChallengeDialogOpen(false);
        setEditingChallenge(null);
    };
    
    const handleDeleteChallengeClick = (challenge: Challenge) => {
        setChallengeToDelete(challenge);
    };
  
    const handleConfirmDeleteChallenge = () => {
        if (!challengeToDelete) return;
        
        const currentChallenges = platformConfig?.challenges || [];
        setPlatformConfig({ challenges: currentChallenges.filter(c => c.id !== challengeToDelete.id) });

        toast({ title: "已刪除挑戰", description: `已成功刪除挑戰「${challengeToDelete.name}」。`, variant: "destructive" });
        setChallengeToDelete(null);
    }
  
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const ChallengeTable = ({ challenges, isReadOnly = false }: { challenges: Challenge[], isReadOnly?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>挑戰名稱</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>獎勵點數</TableHead>
                    {!isReadOnly && <TableHead>提供者</TableHead>}
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {challenges.length > 0 ? challenges.map((challenge) => (
                    <TableRow key={challenge.id}>
                        <TableCell className="font-medium">{challenge.name}</TableCell>
                        <TableCell className="max-w-md">{challenge.description}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1 font-semibold text-primary">
                                <Coins className="h-4 w-4" />
                                {challenge.points.toLocaleString()}
                            </div>
                        </TableCell>
                        {!isReadOnly && (
                            <TableCell>{teachers.find(t => t.id === challenge.providerId)?.name || '學校'}</TableCell>
                        )}
                        <TableCell className="text-right">
                             <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditChallengeClick(challenge)} disabled={isReadOnly}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteChallengeClick(challenge)} disabled={isReadOnly}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            您確定要刪除挑戰「{challenge.name}」嗎？此操作無法復原。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleConfirmDeleteChallenge()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">目前沒有挑戰。</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-6">
            {role === 'admin' ? (
                <Tabs defaultValue="school" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="school">學校挑戰</TabsTrigger>
                        <TabsTrigger value="class">班級挑戰 (僅檢視)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="school">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>學校挑戰管理</CardTitle>
                                    <CardDescription>新增、編輯或刪除全校性的挑戰。</CardDescription>
                                </div>
                                <Button onClick={() => { setChallengeScope('school'); setIsAddChallengeDialogOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    新增學校挑戰
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <ChallengeTable challenges={schoolChallenges} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="class">
                        <Card>
                            <CardHeader>
                                <CardTitle>所有班級挑戰</CardTitle>
                                <CardDescription>檢視所有班級老師建立的挑戰。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChallengeTable challenges={allClassChallenges} isReadOnly={true} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            ) : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>我的班級挑戰</CardTitle>
                            <CardDescription>為您的班級新增、編輯或刪除挑戰。</CardDescription>
                        </div>
                        <Button onClick={() => { setChallengeScope('class'); setIsAddChallengeDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新增班級挑戰
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <ChallengeTable challenges={teacherChallenges} />
                    </CardContent>
                </Card>
            )}

            {/* Dialogs for Challenges */}
            <Dialog open={isAddChallengeDialogOpen} onOpenChange={setIsAddChallengeDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={handleAddChallenge}>
                        <DialogHeader>
                            <DialogTitle>新增{challengeScope === 'school' ? '學校' : '班級'}挑戰</DialogTitle>
                            <DialogDescription>建立一個新的挑戰讓學生們參加。</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="ch-name">挑戰名稱</Label>
                                <Input id="ch-name" name="name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ch-desc">任務說明</Label>
                                <Textarea id="ch-desc" name="description" required rows={4} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ch-points">獎勵點數</Label>
                                <Input id="ch-points" name="points" type="number" required />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">新增挑戰</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isEditChallengeDialogOpen} onOpenChange={(open) => {if (!open) {setEditingChallenge(null);}}}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={handleUpdateChallenge}>
                        <DialogHeader>
                            <DialogTitle>編輯挑戰</DialogTitle>
                            <DialogDescription>修改「{editingChallenge?.name}」的詳細內容。</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-ch-name">挑戰名稱</Label>
                                <Input id="edit-ch-name" name="name" defaultValue={editingChallenge?.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-ch-desc">任務說明</Label>
                                <Textarea id="edit-ch-desc" name="description" defaultValue={editingChallenge?.description} required rows={4} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-ch-points">獎勵點數</Label>
                                <Input id="edit-ch-points" name="points" type="number" defaultValue={editingChallenge?.points} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">儲存變更</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
