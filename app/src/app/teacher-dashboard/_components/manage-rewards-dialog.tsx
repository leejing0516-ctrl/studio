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

const MOCK_REWARDS: Reward[] = [
    {id: 'r1', name: '鉛筆', cost: 100, stock: 50},
    {id: 'r2', name: '橡皮擦', cost: 150, stock: 40},
    {id: 'r3', name: '神秘盒子', cost: 1000, stock: 5},
];

export function ManageRewardsDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  
  const [editedRewards, setEditedRewards] = useState<Reward[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen) {
      setEditedRewards(JSON.parse(JSON.stringify(MOCK_REWARDS)));
    }
  }, [isOpen]);

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
    toast({
      title: "功能正在重建中",
      description: "此功能暫時停用。",
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
            {(editedRewards || []).map((reward) => (
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
