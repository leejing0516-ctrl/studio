
"use client";

import { useState, useContext, useEffect } from "react";
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
import type { FundraisingProject } from "@/lib/types";
import { PlusCircle, Edit, Trash2, Loader2, ImageOff, Calendar as CalendarIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { AppDataContext } from "@/context/AppDataContext";
import { format, addDays, isValid } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";


const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export default function TeacherFundraisingPage() {
  const { 
    isLoading, platformConfig, setPlatformConfig, classes
  } = useContext(AppDataContext);

  const { toast } = useToast();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // State for Fundraising
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<FundraisingProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<FundraisingProject | null>(null);
  const [projectImageFile, setProjectImageFile] = useState<File | null>(null);
  const [projectImagePreview, setProjectImagePreview] = useState<string | null>(null);
  const [projectDeadline, setProjectDeadline] = useState<Date | undefined>(addDays(new Date(), 14));
  
  useEffect(() => {
    const storedRole = localStorage.getItem('teacherRole');
    const storedTeacherId = localStorage.getItem('teacherId');
    if (storedRole !== 'admin') {
      toast({ title: "權限不足", description: "只有校長才能存取此頁面。", variant: "destructive" });
      router.push('/teacher/dashboard');
      return;
    }
    setRole(storedRole);
    setTeacherId(storedTeacherId);
  }, [router, toast]);


  const handleProjectImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: "圖片檔案太大",
                description: `請選擇小於 ${MAX_FILE_SIZE / 1024 / 1024}MB 的圖片。`,
                variant: "destructive",
            });
            return;
        }
        setProjectImageFile(file);
        setProjectImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddFundraisingProject = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!projectDeadline) {
          toast({ title: "缺少截止日期", description: "請為專案設定一個截止日期。", variant: "destructive" });
          return;
      }

      const formData = new FormData(event.currentTarget);
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const goal = Number(formData.get("goal"));

      let imageUrl = `https://picsum.photos/seed/${title.replace(/\s/g, '-')}/600/400`;
      if (projectImageFile) {
          try {
              imageUrl = await fileToDataUrl(projectImageFile);
          } catch (error) {
              toast({ title: "圖片上傳失敗", variant: "destructive" });
              return;
          }
      }

      const newProject: FundraisingProject = {
          id: `fund-${Date.now()}-${Math.random()}`,
          title,
          description,
          image: imageUrl,
          goal,
          currentAmount: 0,
          status: 'active',
          creatorId: teacherId || 'school_admin',
          donations: [],
          deadline: projectDeadline.toISOString(),
      };

      await setPlatformConfig({
          fundraisingProjects: [...(platformConfig?.fundraisingProjects || []), newProject]
      });
      toast({ title: "已建立募資專案", description: `專案「${title}」已成功建立。` });
      setIsAddProjectDialogOpen(false);
  };
  
  const handleEditProjectClick = (project: FundraisingProject) => {
    setEditingProject(project);
    setProjectImagePreview(project.image);
    const deadlineDate = new Date();
    if(project.deadline && isValid(new Date(project.deadline))) {
        setProjectDeadline(new Date(project.deadline));
    } else {
        setProjectDeadline(addDays(new Date(), 14));
    }
    setIsEditProjectDialogOpen(true);
  };
  
  const handleUpdateFundraisingProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProject || !projectDeadline) {
        toast({ title: "缺少截止日期", description: "請為專案設定一個截止日期。", variant: "destructive" });
        return;
    }

    const formData = new FormData(event.currentTarget);
    let imageUrl = editingProject.image;
    if (projectImageFile) {
        try {
            imageUrl = await fileToDataUrl(projectImageFile);
        } catch (error) {
            toast({ title: "圖片上傳失敗", variant: "destructive" });
            return;
        }
    }
    
    const updatedProject: FundraisingProject = {
        ...editingProject,
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        goal: Number(formData.get("goal")),
        status: formData.get("status") as 'active' | 'completed',
        image: imageUrl,
        deadline: projectDeadline.toISOString(),
    };
    
    await setPlatformConfig({
        fundraisingProjects: (platformConfig?.fundraisingProjects || []).map(p => p.id === updatedProject.id ? updatedProject : p)
    });
    toast({ title: "已更新專案", description: `專案「${updatedProject.title}」已更新。` });
    setIsEditProjectDialogOpen(false);
  };

  const handleDeleteFundraisingProjectClick = (project: FundraisingProject) => {
    setProjectToDelete(project);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    await setPlatformConfig({
        fundraisingProjects: (platformConfig?.fundraisingProjects || []).filter(p => p.id !== projectToDelete.id)
    });
    toast({ title: "已刪除專案", description: `專案「${projectToDelete.title}」已被刪除。`, variant: "destructive" });
    setProjectToDelete(null);
  };

  if (isLoading || role !== 'admin') {
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
                    <CardTitle>募資專案管理</CardTitle>
                    <CardDescription>建立、編輯或查看全校性的募資專案。</CardDescription>
                </div>
                <Button onClick={() => setIsAddProjectDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    建立新專案
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {(platformConfig?.fundraisingProjects || []).length > 0 ? (platformConfig?.fundraisingProjects || []).map(project => (
                    <Card key={project.id} className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <Image src={project.image} alt={project.title} width={128} height={128} className="rounded-md object-cover w-full md:w-32 h-32"/>
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle>{project.title}</CardTitle>
                                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                                        {project.status === 'active' ? '進行中' : '已完成'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                                <Progress value={(project.currentAmount / project.goal) * 100} />
                                <p className="text-sm">
                                    進度：{project.currentAmount.toLocaleString()} / {project.goal.toLocaleString()} 點
                                </p>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-start gap-2">
                               <Button size="sm" onClick={() => handleEditProjectClick(project)}>
                                    <Edit className="mr-2"/>編輯
                                </Button>
                                <AlertDialog open={!!projectToDelete && projectToDelete.id === project.id} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteFundraisingProjectClick(project)}>
                                            <Trash2 className="mr-2" />刪除
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>您確定要刪除專案嗎？</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                您確定要刪除募資專案「{project.title}」嗎？此操作無法復原。
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>取消</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleConfirmDeleteProject()} className={buttonVariants({ variant: "destructive" })}>確定刪除</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-medium">查看捐款紀錄</summary>
                            <ScrollArea className="h-40 mt-2 border rounded-md p-2">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>學生</TableHead>
                                            <TableHead>班級</TableHead>
                                            <TableHead>日期</TableHead>
                                            <TableHead className="text-right">金額</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {project.donations.map((d, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{d.studentName}</TableCell>
                                                <TableCell>{classes.find(c=>c.id === d.classId)?.name}</TableCell>
                                                <TableCell>{format(new Date(d.date), 'yyyy-MM-dd')}</TableCell>
                                                <TableCell className="text-right">{d.amount.toLocaleString()} 點</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </details>
                    </Card>
                )) : (
                    <p className="text-center text-muted-foreground py-8">尚未建立任何募資專案。</p>
                )}
            </CardContent>
       </Card>

        {/* Dialog for Fundraising Project */}
        <Dialog open={isAddProjectDialogOpen} onOpenChange={(open) => {
            if (!open) {
                setProjectImageFile(null);
                setProjectImagePreview(null);
            }
            setIsAddProjectDialogOpen(open);
        }}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleAddFundraisingProject}>
                    <DialogHeader>
                        <DialogTitle>建立新的募資專案</DialogTitle>
                        <DialogDescription>發起一個全校性的專案，讓大家共同參與！</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>專案圖片 (建議大小上限 2MB)</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                                    {projectImagePreview ? (
                                        <Image src={projectImagePreview} alt="Project preview" fill className="object-cover rounded-md" />
                                    ) : (
                                        <ImageOff className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <Input id="project-image-upload" type="file" accept="image/*" onChange={handleProjectImageFileChange} className="sr-only" />
                                    <Label htmlFor="project-image-upload" className={buttonVariants({ variant: 'outline' })}>
                                        選擇檔案
                                    </Label>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project-title">專案標題</Label>
                            <Input id="project-title" name="title" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project-description">專案說明</Label>
                            <Textarea id="project-description" name="description" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="project-goal">募資目標（點數）</Label>
                                <Input id="project-goal" name="goal" type="number" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="project-deadline">截止日期</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !projectDeadline && "text-muted-foreground"
                                        )}
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {projectDeadline ? format(projectDeadline, "PPP") : <span>選擇一個日期</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                        mode="single"
                                        selected={projectDeadline}
                                        onSelect={setProjectDeadline}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">取消</Button></DialogClose>
                        <Button type="submit">建立專案</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        <Dialog open={isEditProjectDialogOpen} onOpenChange={(open) => {
            if (!open) {
                setEditingProject(null);
                setProjectImageFile(null);
                setProjectImagePreview(null);
            }
            setIsEditProjectDialogOpen(open);
        }}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleUpdateFundraisingProject}>
                    <DialogHeader>
                        <DialogTitle>編輯募資專案</DialogTitle>
                        <DialogDescription>修改「{editingProject?.title}」的詳細資訊。</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="space-y-2">
                            <Label>專案圖片 (建議大小上限 2MB)</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center relative">
                                    {projectImagePreview ? (
                                        <Image src={projectImagePreview} alt="Project preview" fill className="object-cover rounded-md" />
                                    ) : (
                                        <ImageOff className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <Input id="edit-project-image-upload" type="file" accept="image/*" onChange={handleProjectImageFileChange} className="sr-only" />
                                    <Label htmlFor="edit-project-image-upload" className={buttonVariants({ variant: 'outline' })}>
                                        選擇檔案
                                    </Label>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-project-title">專案標題</Label>
                            <Input id="edit-project-title" name="title" defaultValue={editingProject?.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-project-description">專案說明</Label>
                            <Textarea id="edit-project-description" name="description" defaultValue={editingProject?.description} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-project-goal">募資目標（點數）</Label>
                                <Input id="edit-project-goal" name="goal" type="number" defaultValue={editingProject?.goal} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-project-deadline">截止日期</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !projectDeadline && "text-muted-foreground"
                                        )}
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {projectDeadline && isValid(projectDeadline) ? format(projectDeadline, "PPP") : <span>選擇一個日期</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                        mode="single"
                                        selected={projectDeadline}
                                        onSelect={setProjectDeadline}
                                        disabled={(date) => date < new Date()}
                                        initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>專案狀態</Label>
                            <Select name="status" defaultValue={editingProject?.status}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">進行中</SelectItem>
                                    <SelectItem value="completed">已完成</SelectItem>
                                </SelectContent>
                            </Select>
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
