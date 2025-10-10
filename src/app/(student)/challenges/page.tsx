
"use client";

import { useState, useContext, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentDataContext } from "@/context/StudentDataContext";
import { AppDataContext } from "@/context/AppDataContext";
import { useToast } from "@/hooks/use-toast";
import type { Challenge, StudentChallenge } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building, GraduationCap, CheckCircle, Hourglass, PlayCircle, Coins } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function ChallengesPage() {
    const { studentData } = useContext(StudentDataContext);
    const { students, setStudents, platformConfig, teachers } = useContext(AppDataContext);
    const { toast } = useToast();

    const currentStudent = useMemo(() => 
        students.find(s => s.id === studentData.student?.id && s.classId === studentData.student.classId)
    , [students, studentData.student]);


    const { availableClassChallenges, availableSchoolChallenges, myChallenges } = useMemo(() => {
        if (!currentStudent) return { availableClassChallenges: [], availableSchoolChallenges: [], myChallenges: [] };
        
        const teacherForClass = teachers.find(t => t.classId === currentStudent.classId);
        const allChallenges = platformConfig?.challenges || [];

        const studentChallengeIds = (currentStudent.challenges || []).map(c => c.challengeId);

        const filterAndSort = (scope: 'school' | 'class') => {
             return allChallenges
                .filter(challenge => {
                    if (studentChallengeIds.includes(challenge.id)) return false; // Filter out already accepted challenges
                    if (scope === 'school') return challenge.scope === 'school';
                    if (scope === 'class') return challenge.scope === 'class' && challenge.providerId === teacherForClass?.id;
                    return false;
                })
        }
        
        const myChallenges = (currentStudent.challenges || [])
            .map(sc => {
                const challengeDetails = allChallenges.find(c => c.id === sc.challengeId);
                return { ...sc, details: challengeDetails };
            })
            .filter(c => c.details) // Filter out if details not found
            .sort((a,b) => new Date(b.acceptedDate).getTime() - new Date(a.acceptedDate).getTime());


        return { 
            availableClassChallenges: filterAndSort('class'), 
            availableSchoolChallenges: filterAndSort('school'),
            myChallenges,
        };

    }, [currentStudent, platformConfig?.challenges, teachers]);

    const handleAcceptChallenge = (challengeId: string) => {
        if (!currentStudent) return;

        const newChallenge: StudentChallenge = {
            challengeId,
            status: 'in_progress',
            acceptedDate: new Date().toISOString(),
        };

        setStudents(prev => prev.map(s => 
            s.id === currentStudent.id && s.classId === currentStudent.classId
            ? { ...s, challenges: [...(s.challenges || []), newChallenge] }
            : s
        ));
        
        const challenge = (platformConfig?.challenges || []).find(c => c.id === challengeId);
        toast({ title: "已接受挑戰！", description: `您已開始挑戰「${challenge?.name}」。` });
    };

    const handleSubmitChallenge = (challengeId: string) => {
        if (!currentStudent) return;

         setStudents(prev => prev.map(s => {
            if (s.id === currentStudent.id && s.classId === currentStudent.classId) {
                return {
                    ...s,
                    challenges: (s.challenges || []).map(c => c.challengeId === challengeId ? { ...c, status: 'pending_approval' } : c)
                };
            }
            return s;
        }));
        
        const challenge = (platformConfig?.challenges || []).find(c => c.id === challengeId);
        toast({ title: "已提交審核！", description: `已將「${challenge?.name}」提交給老師審核。` });
    };


    const ChallengeCard = ({ challenge }: { challenge: Challenge }) => (
        <Card className={cn(
            "flex flex-col text-white",
            challenge.scope === 'school' ? "bg-blue-500" : "bg-orange-500"
        )}>
            <CardHeader>
                 <div className="flex justify-between items-start">
                    <CardTitle>{challenge.name}</CardTitle>
                    <Badge variant="secondary" className="bg-white/30 text-white border-none">
                        {challenge.scope === 'school' ? <Building className="mr-1.5" /> : <GraduationCap className="mr-1.5" />}
                        {challenge.scope === 'school' ? '學校任務' : '班級任務'}
                    </Badge>
                </div>
                <CardDescription className="text-white/80">{challenge.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow"></CardContent>
            <CardFooter className="flex justify-between items-center bg-black/10 p-4">
                 <div className="flex items-center gap-2 font-bold text-lg text-white">
                    <Coins className="h-5 w-5" />
                    <span>+{challenge.points.toLocaleString()}</span>
                </div>
                <Button onClick={() => handleAcceptChallenge(challenge.id)} variant="secondary" className="bg-white text-black hover:bg-gray-200">接受挑戰</Button>
            </CardFooter>
        </Card>
    );

    const MyChallengeCard = ({ studentChallenge }: { studentChallenge: StudentChallenge & { details: Challenge | undefined } }) => (
        <Card className="flex flex-col">
            <CardHeader>
                 <CardTitle>{studentChallenge.details?.name}</CardTitle>
                 <CardDescription>
                    接受於 {formatDistanceToNow(new Date(studentChallenge.acceptedDate), { addSuffix: true, locale: zhTW })}
                 </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-sm">{studentChallenge.details?.description}</p>
            </CardContent>
             <CardFooter className="flex justify-between items-center bg-muted/50 p-4">
                 <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <Coins className="h-5 w-5" />
                    <span>+{studentChallenge.details?.points.toLocaleString()}</span>
                </div>
                {studentChallenge.status === 'in_progress' && (
                     <Button onClick={() => handleSubmitChallenge(studentChallenge.challengeId)}>
                        <CheckCircle className="mr-2" />
                        提交完成
                    </Button>
                )}
                {studentChallenge.status === 'pending_approval' && (
                    <Button variant="outline" disabled>
                        <Hourglass className="mr-2" />
                        等待審核
                    </Button>
                )}
                {studentChallenge.status === 'completed' && (
                    <Button variant="outline" disabled className="text-success border-success/50">
                        <CheckCircle className="mr-2" />
                        已完成
                    </Button>
                )}
            </CardFooter>
        </Card>
    );

    return (
        <div className="animate-in fade-in-0 duration-500">
            <Tabs defaultValue="available">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available">可挑戰的任務</TabsTrigger>
                    <TabsTrigger value="my-challenges">
                        我的挑戰
                        {myChallenges.filter(c => c.status !== 'completed').length > 0 && (
                             <Badge variant="destructive" className="ml-2">
                                {myChallenges.filter(c => c.status !== 'completed').length}
                             </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="mt-6 space-y-8">
                     {availableClassChallenges.length > 0 && (
                        <section>
                            <div className="mb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap/> 班級專屬任務</h2>
                                <p className="text-muted-foreground">由您的班級老師設計的特別挑戰！</p>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableClassChallenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
                            </div>
                        </section>
                    )}
                     {availableSchoolChallenges.length > 0 && (
                        <section>
                            <div className="mb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-2"><Building/> 全校挑戰任務</h2>
                                <p className="text-muted-foreground">由學校發起的挑戰，所有學生都可以參加。</p>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableSchoolChallenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
                            </div>
                        </section>
                    )}
                    {availableClassChallenges.length === 0 && availableSchoolChallenges.length === 0 && (
                         <Card className="text-center p-12">
                            <CardTitle className="mt-4">目前沒有新的挑戰</CardTitle>
                            <CardDescription className="mt-2">
                                請稍後再來看看，或提醒老師發布新任務！
                            </CardDescription>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="my-challenges" className="mt-6">
                     {myChallenges.length === 0 ? (
                         <Card className="text-center p-12">
                            <CardTitle className="mt-4">您尚未接受任何挑戰</CardTitle>
                            <CardDescription className="mt-2">
                                前往「可挑戰的任務」分頁，開始賺取點數吧！
                            </CardDescription>
                        </Card>
                     ) : (
                         <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myChallenges.map(c => <MyChallengeCard key={c.challengeId} studentChallenge={c as any} />)}
                        </div>
                     )}
                </TabsContent>

            </Tabs>

        </div>
    )
}
