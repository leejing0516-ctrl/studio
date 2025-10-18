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
import { type Reward } from "@/lib/mock-data";

const rewardIcons = [
    <Ticket key="1" className="w-8 h-8 text-accent" />,
    <Gem key="2" className="w-8 h-8 text-primary" />,
    <ToyBrick key="3" className="w-8 h-8 text-destructive" />,
];

const MOCK_REWARDS: Reward[] = [
    {id: 'r1', name: '鉛筆', cost: 100, stock: 50},
    {id: 'r2', name: '橡皮擦', cost: 150, stock: 40},
    {id: 'r3', name: '神秘盒子', cost: 1000, stock: 5},
];

const studentPoints = 500; // Mock data

export default function RewardStore() {
  
  const handleRedeem = (reward: Reward) => {
    alert(`Redeem functionality for ${reward.name} is under reconstruction.`);
  };

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
            {MOCK_REWARDS.map((reward, index) => (
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
                    onClick={() => handleRedeem(reward)}
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
