
"use client";

import { useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { AppDataContext } from "@/context/AppDataContext";
import { StudentDataContext } from "@/context/StudentDataContext";
import { Separator } from "@/components/ui/separator";
import type { Announcement } from "@/lib/types";

const AnnouncementList = ({ announcements }: { announcements: Announcement[] }) => (
    <div className="space-y-6">
        {announcements.map((ann) => (
            <div key={ann.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-base">{ann.title}</h3>
                    <div className="text-xs text-muted-foreground ml-4 whitespace-nowrap text-right">
                        <p>{ann.teacherName}</p>
                        <p>{format(new Date(ann.date), "yyyy-MM-dd")}</p>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.content}</p>
            </div>
        ))}
    </div>
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
        const currentStudent = students.find(s => s.id === studentData.student!.id && s.classId === studentData.student!.classId) || studentData.student;
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
                        <AnnouncementList announcements={schoolAnnouncements} />
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
                        <AnnouncementList announcements={classAnnouncements} />
                    ) : (
                        <p className="text-muted-foreground text-center py-8">目前沒有班級公告。</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    