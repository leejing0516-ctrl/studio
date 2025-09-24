
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STUDENT_MANUAL_CONTENT } from "@/lib/manual-content";
import { TEACHER_MANUAL_CONTENT } from "@/lib/manual-content";
import { POINTS_TEMPLATE_CONTENT } from "@/lib/manual-content";
import { STATEMENT_CONTENT } from "@/lib/manual-content";

// A simple markdown-like renderer
const SimpleRenderer = ({ content }: { content: string }) => {
    return (
        <div className="prose prose-sm max-w-none text-foreground">
            {content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-2xl font-bold mt-6 mb-3 border-b pb-2">{line.substring(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-semibold mt-5 mb-2">{line.substring(3)}</h2>;
                }
                 if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-lg font-semibold mt-4 mb-1">{line.substring(4)}</h3>;
                }
                 if (line.startsWith('*   ')) {
                    return <p key={index} className="ml-4 before:content-['•'] before:mr-2">{line.substring(4)}</p>;
                }
                if (line.trim() === '---') {
                    return <hr key={index} className="my-6" />;
                }
                return <p key={index} className="mb-2">{line}</p>;
            })}
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
                    <Tabs defaultValue="teacher_manual">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                            <TabsTrigger value="teacher_manual">教師手冊</TabsTrigger>
                            <TabsTrigger value="student_manual">學生手冊</TabsTrigger>
                            <TabsTrigger value="points_template">點數範本</TabsTrigger>
                            <TabsTrigger value="statement">系統聲明</TabsTrigger>
                        </TabsList>
                        <ScrollArea className="h-[65vh] mt-4 border rounded-md p-6">
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

