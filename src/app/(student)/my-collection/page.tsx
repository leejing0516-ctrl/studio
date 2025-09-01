"use client";

import { useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import { StudentDataContext } from "@/context/StudentDataContext";
import { Gem, Hourglass, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentManagementContext } from "@/context/StudentManagementContext";
import { useToast } from "@/hooks/use-toast";
import type { RedeemedRewardItem } from "@/lib/types";

export default function MyCollectionPage() {
  const { studentData, updateStudentData } = useContext(StudentDataContext);
  const { students, setStudents } = useContext(StudentManagementContext);
  const { toast } = useToast();

  const handleUseReward = (redemption: RedeemedRewardItem) => {
    if (!studentData.student) return;

    // Update local student data (StudentDataContext)
    const updatedRedeemedRewards = studentData.student.redeemedRewards.map(r => 
        r.redemptionId === redemption.redemptionId ? { ...r, status: 'pending_use' as const } : r
    );
    updateStudentData({
        student: {
            ...studentData.student,
            redeemedRewards: updatedRedeemedRewards
        }
    });

    // Update global student list (StudentManagementContext)
    setStudents(students.map(s => {
        if (s.id === studentData.student?.id) {
            return {
                ...s,
                redeemedRewards: updatedRedeemedRewards,
            };
        }
        return s;
    }));

    toast({
        title: "已提出使用請求",
        description: `您已請求使用「${redemption.reward.name}」。請等待老師同意。`
    });
  };

  const redeemedRewards = studentData.student?.redeemedRewards || [];

  return (
    <div className="animate-in fade-in-0 duration-500">
      {redeemedRewards.length === 0 ? (
        <Card className="text-center p-12">
            <Gem className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">您的收藏還是空的</CardTitle>
            <CardDescription className="mt-2">
                前往獎勵商店，用您的點數兌換第一個收藏品吧！
            </CardDescription>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {redeemedRewards.map((redemption) => (
            <Card key={redemption.redemptionId} className="flex flex-col overflow-hidden">
              <div className="relative h-48 w-full">
                <Image
                  src={redemption.reward.image}
                  alt={redemption.reward.name}
                  fill
                  className="object-cover"
                  data-ai-hint="reward item"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <CardHeader>
                <CardTitle>{redemption.reward.name}</CardTitle>
                <CardDescription>{redemption.reward.description}</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between items-center bg-muted/50 p-4 mt-auto">
                 {redemption.status === 'collected' && (
                    <Button onClick={() => handleUseReward(redemption)}>使用</Button>
                )}
                {redemption.status === 'pending_use' && (
                    <Button variant="outline" disabled>
                        <Hourglass className="mr-2"/>
                        等待老師同意
                    </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
