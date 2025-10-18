"use client";

import { useState } from "react";
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
import { useSchoolStore, type Reward } from "@/store/school-store";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2 } from "lucide-react";

export function ManageRewardsDialog({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { rewards, addReward, updateReward } = useSchoolStore();
  const [editedRewards, setEditedRewards] = useState<Reward[]>(rewards);
  const { toast } = useToast();

  const handleFieldChange = (
    id: string,
    field: keyof Reward,
    value: string | number
  ) => {
    setEditedRewards(
      editedRewards.map((reward) =>
        reward.id === id ? { ...reward, [field]: value } : reward
      )
    );
  };
  
  const handleAddNew = () => {
    // A temporary ID for the key, the store will create a real one
    const tempId = `new-${Date.now()}`; 
    setEditedRewards([...editedRewards, { id: tempId, name: "", cost: 0, stock: 0}]);
  };

  const handleSaveChanges = () => {
    // This logic would be more complex with a real backend
    editedRewards.forEach(reward => {
      const originalReward = rewards.find(r => r.id === reward.id);
      if (!originalReward) {
        // It's a new reward
        addReward({ name: reward.name, cost: reward.cost, stock: reward.stock });
      } else if (JSON.stringify(originalReward) !== JSON.stringify(reward)) {
        // It's an updated reward
        updateReward(reward);
      }
    });

    toast({
      title: "Success!",
      description: "Rewards have been updated.",
    });
    setIsOpen(false);
  };
  
  // Note: a delete function is not implemented in the store for this example.
  // A real app would have a `deleteReward` action.

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Rewards</DialogTitle>
          <DialogDescription>
            Add, edit, or remove items in the reward store.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-6">
          <div className="space-y-4 py-4">
            {editedRewards.map((reward) => (
              <div
                key={reward.id}
                className="grid grid-cols-12 items-center gap-2 p-2 rounded-md border"
              >
                <div className="col-span-5">
                  <Label htmlFor={`name-${reward.id}`} className="sr-only">
                    Name
                  </Label>
                  <Input
                    id={`name-${reward.id}`}
                    value={reward.name}
                    placeholder="Reward Name"
                    onChange={(e) =>
                      handleFieldChange(reward.id, "name", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`cost-${reward.id}`} className="sr-only">
                    Cost
                  </Label>
                  <Input
                    id={`cost-${reward.id}`}
                    type="number"
                    value={reward.cost}
                    placeholder="Cost"
                    onChange={(e) =>
                      handleFieldChange(reward.id, "cost", Number(e.target.value))
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`stock-${reward.id}`} className="sr-only">
                    Stock
                  </Label>
                  <Input
                    id={`stock-${reward.id}`}
                    type="number"
                    value={reward.stock}
                    placeholder="Stock"
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
                <PlusCircle className="mr-2 h-4 w-4" /> Add New
            </Button>
          <Button onClick={handleSaveChanges} type="submit">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
