
"use client";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Gem, Ticket, ToyBrick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { type Student, type Reward } from "@/lib/mock-data";
import { redeemReward } from "@/lib/firestore-actions";
import { useSimpleUser } from "@/hooks/use-simple-user";

const rewardIcons = [
    <Ticket key="1" className="w-8 h-8 text-accent" />,
    <Gem key="2" className="w-8 h-8 text-primary" />,
    <ToyBrick key="3" className="w-8 h-8 text-destructive" />,
];

export default function RewardStore() {
  const { user: sessionUser, isLoading: isSessionLoading } = useSimpleUser('student');
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isSessionLoading && !sessionUser) {
      router.push("/");
    }
  }, [sessionUser, isSessionLoading, router]);

  const rewardsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'rewards') : null, [firestore]);
  const { data: rewards, isLoading: rewardsLoading } = useCollection<Reward>(rewardsQuery);

  const studentRef = useMemoFirebase(() => (sessionUser && firestore) ? doc(firestore, 'students', sessionUser.id) : null, [firestore, sessionUser]);
  const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);
  
  const handleRedeem = async (rewardId: string) => {
    if (!sessionUser || !student || !firestore) return;
    const reward = rewards?.find(r => r.id === rewardId);
    if (!reward) return;

    try {
      await redeemReward(firestore, sessionUser.id, rewardId);
      toast({
        title: "成功!",
        description: "獎勵已成功兌換！",
      });
    } catch (error: any) {
      toast({
        title: "哦喔！",
        description: error.message || "兌換獎勵時發生錯誤。",
        variant: "destructive",
      });
    }
  };
  
  const isLoading = isSessionLoading || studentLoading || rewardsLoading;

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">載入中...</div>;
  }
  
  if (!sessionUser || !student) {
     return <div className="flex min-h-screen items-center justify-center bg-background">正在重導向...</div>;
  }
  
  const studentPoints = student.points;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary">獎勵商店</h1>
            <div className="text-lg font-semibold text-primary">
              您的點數:{" "}
              <span className="text-accent font-bold">{studentPoints.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(rewards || []).map((reward, index) => (
              <Card key={reward.id} className="flex flex-col">
                <CardHeader className="items-center">
                  <div className="p-4 bg-primary/10 rounded-full">
                    {rewardIcons[index % rewardIcons.length]}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow text-center">
                  <CardTitle>{reward.name}</CardTitle>
                  <CardDescription className="text-lg font-bold text-primary mt-2">
                    {reward.cost.toLocaleString()} 點
                  </CardDescription>
                  <p className="text-sm text-muted-foreground mt-1">
                    剩下 {reward.stock} 個
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleRedeem(reward.id)}
                    disabled={studentPoints < reward.cost || reward.stock === 0}
                    className="w-full bg-accent hover:bg-accent/90"
                  >
                    {reward.stock === 0 ? "已售完" : "兌換"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
