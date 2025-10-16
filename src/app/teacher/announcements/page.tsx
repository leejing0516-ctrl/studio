
"use client";

import { useState, useEffect, useMemo } from "react";
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
import type { Announcement } from "@/lib/types";
import { PlusCircle, Edit, Trash2, Loader2, School, GraduationCap, Megaphone } from "lucide-react";
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
import { useSchoolStore } from "@/store/useSchoolStore";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";


export default function TeacherAnnouncementsPage() {
    const { 
        classes,
        config: platformConfig,
        loading: isLoading
    } = useSchoolStore();
    const { setClasses, setPlatformConfig } = useAuth();

    const { toast } = useToast();

    const [role, setRole] = useState<string | null>(null);
    const [teacherId, setTeacherId] = useState<string>('');
    const [teacherName, setTeacherName] = useState<string>('');
    const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    
    // State for Announcements
    const [isAddAnnouncementDialogOpen, setIsAddAnnouncementDialogOpen] = useState(false);
    const [isEditAnnouncementDialogOpen, setIsEditAnnouncementDialogOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
    const [announcementType, setAnnouncementType] = useState<'school' | 'class'>('school');


     useEffect(() => {
        const storedRole = localStorage.getItem('teacherRole');
        const storedTeacherId = localStorage.getItem('teacherId');
        const storedTeacherName = localStorage.getItem('teacherName');
        const storedClassIdsStr = localStorage.getItem('teacherClassIds');
        setRole(storedRole);
        setTeacherId(storedTeacherId || '');
        setTeacherName(storedTeacherName || '');
        
        let ids: string[] = [];
        if (storedClassIdsStr && storedClassIdsStr !== 'undefined') {
            try {
                ids = JSON.parse(storedClassIdsStr);
            } catch (e) {
                console.error("Failed to parse teacherClassIds from localStorage", e);
                ids = [];
            }
        }
        setTeacherClassIds(ids);

        // Set initial selected class and announcement type based on role
        if (storedRole === 'admin') {
            setAnnouncementType('school');
        } else if (storedRole === 'teacher' || storedRole === 'subject_teacher') {
            setAnnouncementType('class');
            if (ids.length > 0 && !selectedClassId) {
                setSelectedClassId(ids[0]);
            }
        }
    }, [selectedClassId]);

    const schoolAnnouncements = useMemo(() => {
        return (platformConfig?.announcements || [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [platformConfig]);
    
    const classAnnouncements = useMemo(() => {
        if (!selectedClassId) return [];
        const currentClass = classes.find(c => c.id === selectedClassId);
        return (currentClass?.announcements || [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [classes, selectedClassId]);


    const handleAddAnnouncement = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const title = formData.get("title") as string;
        const content = formData.get("content") as string;

        if (!teacherId || !teacherName) {
            toast({ title: "無法發布", description: "無法獲取您的教師資訊，請重新登入。", variant: "destructive" });
            return;
        }

        const newAnnouncement: Announcement = {
            id: `announcement-${Date.now()}-${Math.random()}`,
            title,
            content,
            date: new Date().toISOString(),
            teacherId: teacherId,
            teacherName: teacherName,
        };
        
        if (announcementType === 'school') {
            const currentAnnouncements = platformConfig?.announcements || [];
            setPlatformConfig({ announcements: [...currentAnnouncements, newAnnouncement] });
            toast({ title: "學校公告已發布" });
        } else if (announcementType === 'class' && selectedClassId) {
             setClasses(currentClasses => currentClasses.map(c => {
                if (c.id === selectedClassId) {
                    return { ...c, announcements: [...(c.announcements || []), newAnnouncement] };
                }
                return c;
             }));
             toast({ title: "班級公告已發布" });
        }
        
        setIsAddAnnouncementDialogOpen(false);
    };

    const handleEditAnnouncementClick = (announcement: Announcement, type: 'school' | 'class') => {
        setEditingAnnouncement(announcement);
        setAnnouncementType(type);
        setIsEditAnnouncementDialogOpen(true);
    };

    const handleUpdateAnnouncement = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingAnnouncement) return;

        const formData = new FormData(event.currentTarget);
        const title = formData.get("title") as string;
        const content = formData.get("content") as string;

        const updatedAnnouncement: Announcement = {
            ...editingAnnouncement,
            title,
            content,
        };

        if (announcementType === 'school') {
            const updatedAnnouncements = (platformConfig?.announcements || []).map(ann => 
                ann.id === updatedAnnouncement.id ? updatedAnnouncement : ann
            );
            setPlatformConfig({ announcements: updatedAnnouncements });
        } else if (announcementType === 'class' && selectedClassId) {
            setClasses(currentClasses => currentClasses.map(c => {
                if (c.id === selectedClassId) {
                    return { ...c, announcements: (c.announcements || []).map(ann => ann.id === updatedAnnouncement.id ? updatedAnnouncement : ann) };
                }
                return c;
             }));
        }

        toast({ title: "公告已更新" });
        setIsEditAnnouncementDialogOpen(false);
        setEditingAnnouncement(null);
    };

    const handleDeleteAnnouncementClick = (announcement: Announcement, type: 'school' | 'class') => {
        setAnnouncementToDelete(announcement);
        setAnnouncementType(type);
    };
  
    const handleConfirmDeleteAnnouncement = () => {
        if (!announcementToDelete) return;

        if (announcementType === 'school') {
            const updatedAnnouncements = (platformConfig?.announcements || []).filter(ann => ann.id !== announcementToDelete.id);
            setPlatformConfig({ announcements: updatedAnnouncements });
        } else if (announcementType === 'class' && selectedClassId) {
            setClasses(currentClasses => currentClasses.map(c => {
                if (c.id === selectedClassId) {
                    return { ...c, announcements: (c.announcements || []).filter(ann => ann.id !== announcementToDelete.id) };
                }
                return c;
            }));
        }

        toast({ title: "公告已刪除", variant: "destructive" });
        setAnnouncementToDelete(null);
    }
  
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    const AnnouncementTable = ({ announcements, type, isReadOnly = false }: { announcements: Announcement[], type: 'school' | 'class', isReadOnly?: boolean }) => (
         <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[150px]">發布日期</TableHead>
                    <TableHead className="w-[120px]">發布人</TableHead>
                    <TableHead>標題</TableHead>
                    {!isReadOnly && <TableHead className="text-right w-[120px]">操作</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {announcements.length > 0 ? announcements.map((ann) => (
                <TableRow key={ann.id}>
                    <TableCell>{format(new Date(ann.date), "yyyy-MM-dd HH:mm")}</TableCell>
                    <TableCell>{ann.teacherName}</TableCell>
                    <TableCell>{ann.title}</TableCell>
                    {!isReadOnly && (
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditAnnouncementClick(ann, type)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAnnouncementClick(ann, type)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            您確定要刪除公告「{ann.title}」嗎？此操作無法復原。
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleConfirmDeleteAnnouncement()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    )}
                </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={isReadOnly ? 3 : 4} className="h-24 text-center">目前沒有公告。</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const AnnouncementList = ({ announcements }: { announcements: Announcement[] }) => (
        <div className="space-y-6">
            {announcements.map((ann) => (
                <div key={ann.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-semibold text-base">{ann.title}</h3>
                        <div className="text-xs text-muted-foreground ml-4 whitespace-nowrap text-right">
                            <p>{ann.teacherName}</p>
                            <p>{format(new Date(ann.date), "yyyy-MM-dd")}</p>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-6">
            {role === 'admin' ? (
                <Tabs defaultValue="school" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="school">學校公告</TabsTrigger>
                        <TabsTrigger value="class">班級公告 (僅檢視)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="school">
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>學校公告管理</CardTitle>
                                    <CardDescription>新增、編輯或刪除全校性的公告。</CardDescription>
                                </div>
                                <Button onClick={() => { setAnnouncementType('school'); setIsAddAnnouncementDialogOpen(true); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    新增學校公告
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <AnnouncementTable announcements={schoolAnnouncements} type="school" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="class">
                        <Card>
                            <CardHeader>
                                <CardTitle>所有班級公告</CardTitle>
                                <CardDescription>檢視所有班級發布的公告。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {classes.map(c => (
                                    <div key={c.id} className="mb-6">
                                        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><GraduationCap /> {c.name}</h3>
                                        <AnnouncementTable announcements={c.announcements || []} type="class" isReadOnly />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            ) : role === 'teacher' || role === 'subject_teacher' ? (
                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Megaphone />
                                學校公告
                            </CardTitle>
                            <CardDescription>來自學校的最新消息與活動。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {schoolAnnouncements.length > 0 ? (
                                <AnnouncementList announcements={schoolAnnouncements} />
                            ) : (
                                <p className="text-muted-foreground text-center py-8">目前沒有學校公告。</p>
                            )}
                        </CardContent>
                    </Card>
        
                    <Separator />
        
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><GraduationCap/>班級公告管理</CardTitle>
                                <CardDescription>為您選擇的班級新增、編輯或刪除公告。</CardDescription>
                            </div>
                            <Button onClick={() => { setAnnouncementType('class'); setIsAddAnnouncementDialogOpen(true); }} disabled={!selectedClassId}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                新增班級公告
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <Label htmlFor="class-select">選擇班級</Label>
                                 <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                    <SelectTrigger id="class-select" className="w-full md:w-[280px]">
                                        <SelectValue placeholder="請選擇班級" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teacherClassIds.map(id => {
                                            const classInfo = classes.find(c => c.id === id);
                                            return classInfo ? <SelectItem key={id} value={id}>{classInfo.name}</SelectItem> : null
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <AnnouncementTable announcements={classAnnouncements} type="class" />
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Dialogs for Announcements */}
            <Dialog open={isAddAnnouncementDialogOpen} onOpenChange={setIsAddAnnouncementDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={handleAddAnnouncement}>
                        <DialogHeader>
                            <DialogTitle>新增{announcementType === 'school' ? '學校' : '班級'}公告</DialogTitle>
                            <DialogDescription>建立一則新的公告，發布後相關人員將能看到。</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="ann-title">標題</Label>
                                <Input id="ann-title" name="title" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ann-content">內容</Label>
                                <Textarea id="ann-content" name="content" required rows={5} />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">發布公告</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isEditAnnouncementDialogOpen} onOpenChange={(open) => {if (!open) {setEditingAnnouncement(null); setIsEditAnnouncementDialogOpen(false);}}}>
                <DialogContent className="sm:max-w-lg">
                    <form onSubmit={handleUpdateAnnouncement}>
                        <DialogHeader>
                            <DialogTitle>編輯公告</DialogTitle>
                            <DialogDescription>修改「{editingAnnouncement?.title}」的詳細內容。</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-ann-title">標題</Label>
                                <Input id="edit-ann-title" name="title" defaultValue={editingAnnouncement?.title} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-ann-content">內容</Label>
                                <Textarea id="edit-ann-content" name="content" defaultValue={editingAnnouncement?.content} required rows={5} />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                            <Button type="submit">儲存變更</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>您確定要刪除嗎？</AlertDialogTitle>
                        <AlertDialogDescription>
                            您確定要刪除公告「{announcementToDelete?.title}」嗎？此操作無法復原。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleConfirmDeleteAnnouncement()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
