"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { type Reward } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { addReward, updateReward } from "@/lib/firestore-actions";

export function ManageRewardsDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const firestore = useFirestore();
  const rewardsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'rewards') : null, [firestore]);
  const { data: rewards, isLoading } = useCollection<Reward>(rewardsQuery);
  
  const [editedRewards, setEditedRewards] = useState<Reward[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    if (rewards && isOpen) {
      setEditedRewards(JSON.parse(JSON.stringify(rewards)));
    }
  }, [rewards, isOpen]);

  const handleFieldChange = (
    id: string,
    field: keyof Omit<Reward, 'id'>,
    value: string | number
  ) => {
    setEditedRewards(
      editedRewards.map((reward) =>
        reward.id === id ? { ...reward, [field]: Number.isNaN(value) ? '' : value } : reward
      )
    );
  };
  
  const handleAddNew = () => {
    const tempId = `new-${Date.now()}`; 
    setEditedRewards([...editedRewards, { id: tempId, name: "", cost: 0, stock: 0}]);
  };

  const handleSaveChanges = () => {
    if (!firestore) return;

    // Use a for...of loop to handle async operations correctly
    for (const reward of editedRewards) {
      try {
        if (reward.id.startsWith('new-')) {
          if (reward.name && reward.cost > 0) {
              addReward(firestore, { name: reward.name, cost: reward.cost, stock: reward.stock });
          }
        } else {
          const originalReward = rewards?.find(r => r.id === reward.id);
          if (JSON.stringify(originalReward) !== JSON.stringify(reward)) {
              updateReward(firestore, reward.id, { name: reward.name, cost: reward.cost, stock: reward.stock });
          }
        }
      } catch (error: any) {
        toast({
          title: "錯誤",
          description: `更新獎勵 "${reward.name}" 時發生錯誤: ${error.message}`,
          variant: "destructive",
        });
        // Stop processing further if one fails
        return;
      }
    }

    toast({
      title: "成功!",
      description: "獎勵已成功更新。",
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>管理獎勵</DialogTitle>
          <DialogDescription>
            新增、編輯或移除獎勵商店中的物品。
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-6">
          <div className="space-y-4 py-4">
            {isLoading ? <p>載入獎勵中...</p> : (editedRewards || []).map((reward) => (
              <div
                key={reward.id}
                className="grid grid-cols-12 items-center gap-2 p-2 rounded-md border"
              >
                <div className="col-span-5">
                  <Label htmlFor={`name-${reward.id}`} className="sr-only">
                    名稱
                  </Label>
                  <Input
                    id={`name-${reward.id}`}
                    value={reward.name}
                    placeholder="獎勵名稱"
                    onChange={(e) =>
                      handleFieldChange(reward.id, "name", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`cost-${reward.id}`} className="sr-only">
                    價格
                  </Label>
                  <Input
                    id={`cost-${reward.id}`}
                    type="number"
                    value={reward.cost}
                    placeholder="價格"
                    onChange={(e) =>
                      handleFieldChange(reward.id, "cost", Number(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`stock-${reward.id}`} className="sr-only">
                    庫存
                  </Label>
                  <Input
                    id={`stock-${reward.id}`}
                    type="number"
                    value={reward.stock}
                    placeholder="庫存"
                    onChange={(e) =>
                      handleFieldChange(reward.id, "stock", Number(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-1">
                    <Button variant="ghost" size="icon" disabled>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> 新增
            </Button>
          <Button onClick={handleSaveChanges} type="submit">
            儲存變更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
