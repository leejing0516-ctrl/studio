"use client";

import { useState, useContext } from "react";
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
import { students } from "@/lib/placeholder-data";
import type { Reward } from "@/lib/types";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RewardContext } from "@/context/RewardContext";

export default function TeacherDashboardPage() {
  const { rewards, setRewards } = useContext(RewardContext);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const { toast } = useToast();

  const handleAwardPoints = (studentName: string) => {
    toast({
        title: "點數已發送！",
        description: `您已成功發送點數給 ${studentName}。`
    })
  }

  const handleAddReward = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newReward: Reward = {
      id: rewards.length > 0 ? Math.max(...rewards.map(r => r.id)) + 1 : 1,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      cost: Number(formData.get("cost")),
      stock: Number(formData.get("stock")),
      image: `https://picsum.photos/seed/${Math.random()}/600/400`,
    };
    setRewards([...rewards, newReward]);
    setIsAddDialogOpen(false);
    toast({
        title: "已新增獎勵",
        description: `${newReward.name} 已被新增至商店。`
    })
  };
  
  const handleEditClick = (reward: Reward) => {
    setEditingReward(reward);
    setIsEditDialogOpen(true);
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
    
    setRewards(rewards.map(r => (r.id === updatedReward.id ? updatedReward : r)));
    setIsEditDialogOpen(false);
    setEditingReward(null);
    toast({
        title: "已更新獎勵",
        description: `${updatedReward.name} 的資訊已更新。`
    })
  }

  const handleDeleteReward = (id: number) => {
    const rewardToDelete = rewards.find(r => r.id === id);
    setRewards(rewards.filter(reward => reward.id !== id));
    if(rewardToDelete){
        toast({
            title: "已移除獎勵",
            description: `${rewardToDelete.name} 已被移除。`,
            variant: "destructive"
        })
    }
  }

  return (
    <>
    <Tabs defaultValue="students" className="animate-in fade-in-0 duration-500">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="students">管理學生</TabsTrigger>
        <TabsTrigger value="rewards">管理獎勵</TabsTrigger>
      </TabsList>
      <TabsContent value="students" className="mt-6">
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
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={student.avatar} data-ai-hint="student avatar" />
                        <AvatarFallback>
                          {student.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.name}</span>
                    </TableCell>
                    <TableCell>{student.points.toLocaleString()}</TableCell>
                    <TableCell>
                      <Input type="number" placeholder="例如 50" aria-label={`給 ${student.name} 的點數`} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleAwardPoints(student.name)}>發送</Button>
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
            <Button onClick={() => setIsAddDialogOpen(true)}>
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
                      <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleEditClick(reward)}>
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
      </Tabs>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
    </>
  );
}
