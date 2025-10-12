
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STUDENT_MANUAL_CONTENT } from "@/lib/manual-content";
import { TEACHER_MANUAL_CONTENT } from "@/lib/manual-content";
import { POINTS_TEMPLATE_CONTENT } from "@/lib/manual-content";
import { STATEMENT_CONTENT } from "@/lib/manual-content";
import { RESTORE_MANUAL_CONTENT } from "@/lib/manual-content";
import { CHANGELOG_CONTENT } from "@/lib/manual-content";
import { AlertTriangle, Book, History } from "lucide-react";
import React from "react";

// A simple and safe renderer for the manual content.
const SimpleRenderer = ({ content }: { content: string }) => {
    return (
        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {content}
        </div>
    );
};

export default function ManualPage() {
    return (
        <div className="space-y-6 animate-in fade-in-0 duration-500">
             <Card>
                <CardHeader>
                    <CardTitle>操作手冊與說明文件</CardTitle>
                    <CardDescription>您可以在這裡找到所有關於平台操作的說明文件與相關範本。</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="changelog">
                        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
                            <TabsTrigger value="changelog" className="text-primary font-bold flex items-center gap-2">
                                <History className="h-4 w-4" />系統日誌
                            </TabsTrigger>
                            <TabsTrigger value="restore_manual" className="text-destructive font-bold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />資料救援
                            </TabsTrigger>
                            <TabsTrigger value="teacher_manual">教師手冊</TabsTrigger>
                            <TabsTrigger value="student_manual">學生手冊</TabsTrigger>
                            <TabsTrigger value="points_template">點數範本</TabsTrigger>
                            <TabsTrigger value="statement">系統聲明</TabsTrigger>
                        </TabsList>
                        <ScrollArea className="h-[65vh] mt-4 border rounded-md p-6">
                             <TabsContent value="changelog">
                                <SimpleRenderer content={CHANGELOG_CONTENT} />
                            </TabsContent>
                            <TabsContent value="restore_manual">
                                <SimpleRenderer content={RESTORE_MANUAL_CONTENT} />
                            </TabsContent>
                            <TabsContent value="teacher_manual">
                                <SimpleRenderer content={TEACHER_MANUAL_CONTENT} />
                            </TabsContent>
                             <TabsContent value="student_manual">
                                <SimpleRenderer content={STUDENT_MANUAL_CONTENT} />
                            </TabsContent>
                             <TabsContent value="points_template">
                                <SimpleRenderer content={POINTS_TEMPLATE_CONTENT} />
                            </TabsContent>
                             <TabsContent value="statement">
                                <SimpleRenderer content={STATEMENT_CONTENT} />
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
