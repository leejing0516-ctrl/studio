"use client";

import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

export default function TeacherDashboard() {
  const router = useRouter();

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-grow p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-primary mb-6">
              老師儀表板
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>獎勵點數</CardTitle>
                  <CardDescription>
                    選擇班級和學生以給予點數。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled>
                    獎勵點數
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>管理獎勵</CardTitle>
                  <CardDescription>
                    新增、編輯或從獎勵商店中移除物品。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" disabled>
                    管理獎勵
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>管理學生</CardTitle>
                  <CardDescription>
                    新增或編輯學生名冊。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" disabled>
                    管理學生
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
