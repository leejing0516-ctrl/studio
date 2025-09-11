
"use client";

import { useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Megaphone, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { AppDataContext } from "@/context/AppDataContext";
import { StudentDataContext } from "@/context/StudentDataContext";
import { Separator } from "@/components/ui/separator";

const AnnouncementList = ({ announcements, type }: { announcements: any[], type: 'school' | 'class' }) => (
     <Accordion type="single" collapsible className="w-full">
        {announcements.map((ann, index) => (
        <AccordionItem value={`item-${type}-${index}`} key={ann.id}>
            <AccordionTrigger>
                <span className="font-semibold">{ann.title}</span>
                <span className="text-xs text-muted-foreground ml-4 whitespace-nowrap">{format(new Date(ann.date), "yyyy-MM-dd")}</span>
            </AccordionTrigger>
            <AccordionContent>
                <p>{ann.content}</p>
            </AccordionContent>
        </AccordionItem>
        ))}
    </Accordion>
);


export default function AnnouncementsPage() {
    const { platformConfig, classes, students } = useContext(AppDataContext);
    const { studentData } = useContext(StudentDataContext);

    const schoolAnnouncements = useMemo(() => {
        return (platformConfig?.announcements || [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [platformConfig]);

    const classAnnouncements = useMemo(() => {
        if (!studentData.student) return [];
        // Get the most up-to-date student info from the source of truth (AppDataContext)
        const currentStudent = students.find(s => s.id === studentData.student!.id && s.classId === studentData.student!.classId);
        if (!currentStudent) return [];
        
        const studentClass = classes.find(c => c.id === currentStudent.classId);
        return (studentClass?.announcements || [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [classes, students, studentData.student]);

    return (
        <div className="animate-in fade-in-0 duration-500 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone />
                        學校公告
                    </CardTitle>
                    <CardDescription>來自學校的最新消息與活動。</CardDescription>
                </CardHeader>
                <CardContent>
                    {schoolAnnouncements.length > 0 ? (
                        <AnnouncementList announcements={schoolAnnouncements} type="school" />
                    ) : (
                        <p className="text-muted-foreground text-center py-8">目前沒有學校公告。</p>
                    )}
                </CardContent>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GraduationCap />
                        班級公告
                    </CardTitle>
                    <CardDescription>來自您班級老師的最新消息。</CardDescription>
                </CardHeader>
                <CardContent>
                     {classAnnouncements.length > 0 ? (
                        <AnnouncementList announcements={classAnnouncements} type="class" />
                    ) : (
                        <p className="text-muted-foreground text-center py-8">目前沒有班級公告。</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
