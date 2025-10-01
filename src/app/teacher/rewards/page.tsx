
"use client";

import { useState, useContext, useEffect, useMemo } from "react";
import Image from "next/image";
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
import type { Teacher, Reward } from "@/lib/types";
import { PlusCircle, Edit, Trash2, Loader2, Coins, ImageOff, GraduationCap, Building } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import { Badge } from "@/components/ui/badge";

const MAX_FILE_SIZE = 800 * 1024; // 800KB

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default function TeacherRewardsPage() {
    const { 
        rewards, setRewards, 
        isLoading, teachers
    } = useContext(AppDataContext);

    const { toast } = useToast();

    const [role, setRole] = useState<string | null>(null);
    const [teacherId, setTeacherId] = useState<string | null>(null);
    
    // State for Rewards
    const [isAddRewardDialogOpen, setIsAddRewardDialogOpen] = useState(false);
    const [isEditRewardDialogOpen, setIsEditRewardDialogOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | null>(null);
    const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);
    const [rewardImageFile, setRewardImageFile] = useState<File | null>(null);
    const [rewardImagePreview, setRewardImagePreview] = useState<string | null>(null);
    const [rewardScope, setRewardScope] = useState<'school' | 'class'>('school');


    useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        const storedTeacherId = localStorage.getItem('teacherId');
        setRole(storedRole);
        setTeacherId(storedTeacherId);
        if (storedRole === 'teacher') {
            setRewardScope('class');
        }
    }, []);

    const allClassRewards = useMemo(() => {
        return rewards.filter(r => r.scope === 'class');
    }, [rewards]);
    
    const schoolRewards = useMemo(() => {
        return rewards.filter(r => r.scope === 'school');
    }, [rewards]);
    
    const teacherRewards = useMemo(() => {
        if (role !== 'teacher' || !teacherId) return [];
        return rewards.filter(r => r.providerId === teacherId);
    }, [rewards, role, teacherId]);

    const handleRewardImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                toast({
                    title: "圖片檔案太大",
                    description: `請選擇小於 ${MAX_FILE_SIZE / 1024}KB 的圖片。`,
                    variant: "destructive",
                });
                return;
            }
            setRewardImageFile(file);
            setRewardImagePreview(URL.createObjectURL(file));
        }
    };
    
    const handleAddReward = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const cost = Number(formData.get("cost"));
        const stock = Number(formData.get("stock"));
        
        let imageUrl = `https://picsum.photos/seed/${name.replace(/\s/g, '-')}/600/400`;
        if (rewardImageFile) {
            try {
                imageUrl = await fileToDataUrl(rewardImageFile);
            } catch (error) {
                toast({title: "圖片上傳失敗", variant: "destructive"});
            }
        }
        
        const newReward: Reward = {
            id: `reward-${Date.now()}-${Math.random()}`,
            name,
            description,
            cost,
            stock,
            image: imageUrl,
            scope: rewardScope,
            providerId: rewardScope === 'school' ? 'school_admin' : teacherId!,
        };
        
        await setRewards(current => [...current, newReward]);
        setIsAddRewardDialogOpen(false);
        toast({
            title: "已新增獎勵",
            description: `已成功新增獎勵「${name}」。`
        });
    }

    const handleEditRewardClick = (reward: Reward) => {
        setEditingReward(reward);
        setRewardImagePreview(reward.image);
        setIsEditRewardDialogOpen(true);
    };

    const handleUpdateReward = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingReward) return;

        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const cost = Number(formData.get("cost"));
        const stock = Number(formData.get("stock"));

        let imageUrl = editingReward.image;
        if (rewardImageFile) {
            try {
                imageUrl = await fileToDataUrl(rewardImageFile);
            } catch (error) {
                toast({title: "圖片上傳失敗", variant: "destructive"});
            }
        }
        
        const updatedReward: Reward = {
            ...editingReward,
            name,
            description,
            cost,
            stock,
            image: imageUrl
        };
        
        await setRewards(current => current.map(r => r.id === updatedReward.id ? updatedReward : r));
        setIsEditRewardDialogOpen(false);
        setEditingReward(null);
        toast({
            title: "獎勵已更新",
            description: `已成功更新「${name}」。`
        });
    }
  
    const handleDeleteRewardClick = (reward: Reward) => {
        setRewardToDelete(reward);
    };

    const handleConfirmDeleteReward = async () => {
        if (!rewardToDelete) return;
        await setRewards(current => current.filter(r => r.id !== rewardToDelete!.id));
        toast({
            title: "已刪除獎勵",
            description: `已成功刪除獎勵「${rewardToDelete.name}」。`,
            variant: "destructive"
        });
        setRewardToDelete(null);
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const RewardsTable = ({ rewards, isReadOnly = false }: { rewards: Reward[], isReadOnly?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>獎勵</TableHead>
                    <TableHead>費用</TableHead>
                    <TableHead>庫存</TableHead>
                    {isReadOnly && <TableHead>提供者</TableHead>}
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rewards.length > 0 ? rewards.map((reward) => (
                    <TableRow key={reward.id}>
                        <TableCell className="flex items-center gap-4">
                            <Image src={reward.image} alt={reward.name} width={64} height={64} className="rounded-md object-cover" />
                            <div>
                                <p className="font-medium">{reward.name}</p>
                                <p className="text-sm text-muted-foreground">{reward.description}</p>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1 font-semibold text-primary">
                                <Coins className="h-4 w-4" />
                                {reward.cost.toLocaleString()}
                            </div>
                        </TableCell>
                        <TableCell>{reward.stock}</TableCell>
                        {isReadOnly && (
                            <TableCell>{teachers.find(t => t.id === reward.providerId)?.name || '學校'}</TableCell>
                        )}
                        <TableCell className="text-right">
                             <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditRewardClick(reward)} disabled={isReadOnly}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog open={!!rewardToDelete && rewardToDelete.id === reward.id} onOpenChange={(open) => !open && setRewardToDelete(null)}>
                                <AlertDialogTrigger asChild>
                                     <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRewardClick(reward)} disabled={isReadOnly}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            您確定要刪除獎勵「{reward.name}」嗎？此操作無法復原。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleConfirmDeleteReward()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={isReadOnly ? 5 : 4} className="h-24 text-center">
                            目前沒有獎勵。
                        </TableCell>
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
                        <TabsTrigger value="school">學校獎勵</TabsTrigger>
                        <TabsTrigger value="class">班級獎勵 (僅檢視)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="school">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>學校獎勵管理</CardTitle>
                                    <CardDescription>新增、編輯或刪除全校性的獎勵品。</CardDescription>
                                </div>
                                <Button onClick={() => { setRewardScope('school'); setIsAddRewardDialogOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    新增學校獎勵
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <RewardsTable rewards={schoolRewards} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="class">
                        <Card>
                             <CardHeader>
                                <CardTitle>所有班級獎勵</CardTitle>
                                <CardDescription>檢視所有班級老師建立的獎勵。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RewardsTable rewards={allClassRewards} isReadOnly={true} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            ) : (
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>我的班級獎勵</CardTitle>
                            <CardDescription>為您的班級新增、編輯或刪除獎勵。</CardDescription>
                        </div>
                        <Button onClick={() => { setRewardScope('class'); setIsAddRewardDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新增班級獎勵
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <RewardsTable rewards={teacherRewards} />
                    </CardContent>
                </Card>
            )}

            {/* Dialog for Add/Edit Reward */}
            <Dialog open={isAddRewardDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setRewardImageFile(null);
                    setRewardImagePreview(null);
                }
                setIsAddRewardDialogOpen(open);
            }}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={handleAddReward}>
                        <DialogHeader>
                            <DialogTitle>新增{rewardScope === 'school' ? '學校' : '班級'}獎勵</DialogTitle>
                            <DialogDescription>建立一個新的獎勵品讓學生兌換。</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>獎勵圖片 (建議大小上限 800KB)</Label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                                        {rewardImagePreview ? (
                                            <Image src={rewardImagePreview} alt="Reward preview" fill className="object-cover rounded-md" />
                                        ) : (
                                            <ImageOff className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <Input id="image-upload" type="file" accept="image/*" onChange={handleRewardImageFileChange} className="sr-only" />
                                        <Label htmlFor="image-upload" className={buttonVariants({ variant: 'outline' })}>
                                            選擇檔案
                                        </Label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reward-name">獎勵名稱</Label>
                                <Input id="reward-name" name="name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reward-desc">描述</Label>
                                <Textarea id="reward-desc" name="description" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reward-cost">費用（點數）</Label>
                                    <Input id="reward-cost" name="cost" type="number" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reward-stock">庫存</Label>
                                    <Input id="reward-stock" name="stock" type="number" required />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">新增獎勵</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditRewardDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    setEditingReward(null);
                    setRewardImageFile(null);
                    setRewardImagePreview(null);
                }
                setIsEditRewardDialogOpen(open);
            }}>
                <DialogContent className="sm:max-w-lg">
                     <form onSubmit={handleUpdateReward}>
                        <DialogHeader>
                            <DialogTitle>編輯獎勵</DialogTitle>
                            <DialogDescription>修改「{editingReward?.name}」的詳細內容。</DialogDescription>
                        </DialogHeader>
                         <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>獎勵圖片 (建議大小上限 800KB)</Label>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                                        {rewardImagePreview ? (
                                            <Image src={rewardImagePreview} alt="Reward preview" fill className="object-cover rounded-md" />
                                        ) : (
                                            <ImageOff className="h-8 w-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <Input id="edit-image-upload" type="file" accept="image/*" onChange={handleRewardImageFileChange} className="sr-only" />
                                        <Label htmlFor="edit-image-upload" className={buttonVariants({ variant: 'outline' })}>
                                            選擇檔案
                                        </Label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-reward-name">獎勵名稱</Label>
                                <Input id="edit-reward-name" name="name" defaultValue={editingReward?.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-reward-desc">描述</Label>
                                <Textarea id="edit-reward-desc" name="description" defaultValue={editingReward?.description} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-reward-cost">費用（點數）</Label>
                                    <Input id="edit-reward-cost" name="cost" type="number" defaultValue={editingReward?.cost} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-reward-stock">庫存</Label>
                                    <Input id="edit-reward-stock" name="stock" type="number" defaultValue={editingReward?.stock} required />
                                </div>
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
    );
}
