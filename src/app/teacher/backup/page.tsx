
"use client";

import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, PlusCircle, History, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { AppDataContext } from "@/context/AppDataContext";
import type { Backup } from "@/lib/types";
import { format } from "date-fns";
import { zhTW } from 'date-fns/locale';

export default function TeacherBackupPage() {
  const { 
    isLoading, fetchBackups, createBackup, restoreFromBackup, deleteBackup
  } = useContext(AppDataContext);

  const { toast } = useToast();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isFetchingBackups, setIsFetchingBackups] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('teacherRole');
    if (storedRole !== 'admin') {
      toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
      router.push('/teacher/dashboard');
      return;
    }
    setRole(storedRole);

    const loadBackups = async () => {
      setIsFetchingBackups(true);
      try {
        const fetchedBackups = await fetchBackups();
        setBackups(fetchedBackups);
      } catch (error) {
        toast({ title: "讀取備份失敗", description: "無法從後端讀取備份列表。", variant: "destructive" });
      } finally {
        setIsFetchingBackups(false);
      }
    };
    loadBackups();
  }, [router, toast, fetchBackups]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      await createBackup();
      const updatedBackups = await fetchBackups();
      setBackups(updatedBackups);
      toast({ title: "備份已建立", description: "目前的學生點數資料已成功備份。" });
    } catch (error) {
      toast({ title: "備份失敗", description: "建立備份時發生錯誤。", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    setIsRestoring(true);
    try {
      await restoreFromBackup(backupToRestore);
      toast({ title: "資料還原成功", description: `所有學生的點數已還原至 ${format(new Date(backupToRestore.createdAt), "yyyy/MM/dd HH:mm")} 的狀態。` });
    } catch (error) {
      toast({ title: "還原失敗", description: "還原資料時發生錯誤。", variant: "destructive" });
    } finally {
      setIsRestoring(false);
      setBackupToRestore(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!backupToDelete) return;
    setIsDeleting(true);
    try {
      await deleteBackup(backupToDelete.id);
      setBackups(prev => prev.filter(b => b.id !== backupToDelete.id));
      toast({ title: "備份已刪除", description: `備份檔案 ${backupToDelete.id} 已被刪除。`, variant: "destructive" });
    } catch (error) {
      toast({ title: "刪除失敗", description: "刪除備份時發生錯誤。", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setBackupToDelete(null);
    }
  };

  if (isLoading || role !== 'admin' || isFetchingBackups) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>資料備份與還原</CardTitle>
                    <CardDescription>您可以在此手動建立緊急備份，或從過去的備份中還原所有學生的點數資料。</CardDescription>
                </div>
                <Button onClick={handleCreateBackup} disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                    手動建立備份
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>備份時間</TableHead>
                            <TableHead>備份說明</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {backups.length > 0 ? backups.map(backup => (
                            <TableRow key={backup.id}>
                                <TableCell className="font-medium">{format(new Date(backup.createdAt), "yyyy/MM/dd HH:mm:ss")}</TableCell>
                                <TableCell>{backup.description || `包含 ${backup.students.length} 位學生的點數資料`}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setBackupToRestore(backup)} disabled={isRestoring || isDeleting} className="mr-2">
                                      <History className="mr-2" />
                                      還原至此版本
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setBackupToDelete(backup)} disabled={isRestoring || isDeleting}>
                                      <Trash2 className="mr-2" />
                                      刪除
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    尚未建立任何備份。
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      
        <AlertDialog open={!!backupToRestore} onOpenChange={(open) => !open && setBackupToRestore(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>確定要還原資料嗎？</AlertDialogTitle>
                    <AlertDialogDescription>
                        此操作將會用 **{backupToRestore ? format(new Date(backupToRestore.createdAt), 'yyyy/MM/dd HH:mm') : ''}** 的備份資料，覆蓋掉 **所有學生目前** 的點數。
                        <br />
                        <strong className="text-destructive mt-2 block">這個動作無法復原，請謹慎操作！</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmRestore} className={buttonVariants({ variant: "destructive" })} disabled={isRestoring}>
                        {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        我了解風險，確定還原
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={!!backupToDelete} onOpenChange={(open) => !open && setBackupToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>確定要刪除備份嗎？</AlertDialogTitle>
                    <AlertDialogDescription>
                        您確定要永久刪除 **{backupToDelete ? format(new Date(backupToDelete.createdAt), 'yyyy/MM/dd HH:mm') : ''}** 這份備份檔案嗎？
                        <br />
                        <strong className="text-destructive mt-2 block">這個動作無法復原。</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        確定刪除
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
