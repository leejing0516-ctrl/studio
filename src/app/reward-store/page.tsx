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

const rewardIcons = [
    <Ticket key="1" className="w-8 h-8 text-accent" />,
    <Gem key="2" className="w-8 h-8 text-primary" />,
    <ToyBrick key="3" className="w-8 h-8 text-destructive" />,
];

export default function RewardStore() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary">獎勵商店</h1>
            <div className="text-lg font-semibold text-primary">
              您的點數:{" "}
              <span className="text-accent font-bold">0</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <p className="text-muted-foreground">獎勵商店目前關閉中。</p>
          </div>
        </div>
      </main>
    </div>
  );
}
