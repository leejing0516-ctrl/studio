
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function AvatarCreatorPage() {
  return (
    <div className="animate-in fade-in-0 duration-500">
      <Card className="text-center p-12">
        <Wrench className="mx-auto h-16 w-16 text-primary" />
        <CardTitle className="mt-6 text-3xl font-bold">
          「分身造型」功能即將推出！
        </CardTitle>
        <CardDescription className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          我們正在努力打造一個超酷的娃娃屋系統，讓你可以用點數購買各種有趣的配件，創造出專屬於你的獨一無二數位分身。敬請期待！
        </CardDescription>
      </Card>
    </div>
  );
}
