"use client";

import Link from "next/link";
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
                    return <li key={index} className="ml-4 list-disc">{line.substring(4)}</li>;
                }
                if (line.match(/\[(.*?)\]\((.*?)\)/)) {
                    const linkMatch = line.match(/\[(.*?)\]\((.*?)\)/);
                    if (linkMatch) {
                        return (
                            <p key={index} className="mb-2 leading-relaxed">
                                {line.substring(0, linkMatch.index)}
                                <Link href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                                    {linkMatch[1]}
                                </Link>
                                {line.substring(linkMatch.index! + linkMatch[0].length)}
                            </p>
                        )
                    }
                }
                 if (line.startsWith('![') && line.includes('](') && line.endsWith(')')) {
                    const alt = line.substring(2, line.indexOf(']('));
                    const src = line.substring(line.indexOf('](') + 2, line.length - 1);
                    // Use a standard <img> tag for external images to avoid Next.js Image optimization issues without proper config.
                    // eslint-disable-next-line @next/next/no-img-element
                    return <img key={index} src={src} alt={alt} className="my-4 rounded-md border shadow-sm" />;
                }
                if (line.trim() === '---') {
                    return <hr key={index} className="my-6" />;
                }
                // Handle bold text with **text** and `code`
                const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
                return (
                    <p key={index} className="mb-2 leading-relaxed">
                        {parts.map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={i}>{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith('`') && part.endsWith('`')) {
                                return <code key={i} className="bg-muted text-foreground font-mono text-sm px-1 py-0.5 rounded-sm">{part.slice(1, -1)}</code>;
                            }
                            return part;
                        })}
                    </p>
                );
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
