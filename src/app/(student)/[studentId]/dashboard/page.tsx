
"use client";
import { useSchoolStore } from '@/store/useSchoolStore';
import { useAuth } from '@/context/AuthContext';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, PiggyBank, Handshake, Repeat, Flag, LineChart, Building, HeartHandshake, Bone, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function StudentDashboardPage() {
    const { students, classes, pets, challenges, habits, announcements } = useSchoolStore();
    const { student } = useAuth();

    const currentStudent = useMemo(() => {
        return students.find(s => s.id === student?.id);
    }, [students, student]);

    const currentClass = useMemo(() => {
        if (!currentStudent?.classId) return null;
        return classes.find(c => c.id === currentStudent.classId);
    }, [classes, currentStudent]);
    
    const myPet = useMemo(() => {
        if (!currentStudent?.petId) return null;
        return pets.find(p => p.id === currentStudent.petId);
    }, [pets, currentStudent]);

    if (!currentStudent) {
        return <div>載入中...</div>;
    }

    const { name, points, deposits, loans, petId, avatarUrl } = currentStudent;

    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalLoans = loans.reduce((sum, l) => sum + l.amount, 0);
    const netWorth = points + totalDeposits - totalLoans;

    const completedChallenges = challenges.filter(c => c.completedBy.includes(currentStudent.id));
    const ongoingHabits = habits.filter(h => h.studentId === currentStudent.id && h.status === 'active');
    
    const latestAnnouncement = announcements
        .filter(a => a.targetUser.includes('all') || a.targetUser.includes('student') || (currentClass && a.targetUser.includes(currentClass.id)))
        .sort((a, b) => b.date.seconds - a.date.seconds)[0];


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className='flex items-center gap-4'>
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={avatarUrl || `https://picsum.photos/seed/${currentStudent.id}/100`} data-ai-hint="student avatar" />
                                <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{name}</CardTitle>
                                <CardDescription>{currentClass?.name || '未分班'} | {currentStudent.seatNumber}號</CardDescription>
                            </div>
                        </div>
                        {currentClass && (
                             <div className="flex items-center gap-2">
                                <GraduationCap className="text-muted-foreground" />
                                <span className="font-semibold">{currentClass.name}</span>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                       {latestAnnouncement && (
                             <Link href={`/${student?.id}/announcements`} className="block bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 hover:bg-blue-100 transition-colors">
                                <CardTitle className="text-lg mb-1 text-blue-800">最新公告</CardTitle>
                                <p className="text-blue-700 truncate">{latestAnnouncement.title}</p>
                            </Link>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                                <Coins className="h-8 w-8 text-yellow-500 mb-2" />
                                <p className="text-sm text-muted-foreground">現金</p>
                                <p className="text-xl font-bold">{points}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                                <PiggyBank className="h-8 w-8 text-green-500 mb-2" />
                                <p className="text-sm text-muted-foreground">存款</p>
                                <p className="text-xl font-bold">{totalDeposits}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                                <Handshake className="h-8 w-8 text-red-500 mb-2" />
                                <p className="text-sm text-muted-foreground">貸款</p>
                                <p className="text-xl font-bold">{totalLoans}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                                <Building className="h-8 w-8 text-indigo-500 mb-2" />
                                <p className="text-sm text-muted-foreground">總資產</p>
                                <p className="text-xl font-bold">{netWorth}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>我的活動</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4">
                        <Link href={`/${student?.id}/challenges`} className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <Flag className="h-6 w-6 text-green-600" />
                                <div>
                                    <p className="font-semibold text-green-800">已完成挑戰</p>
                                    <p className="text-2xl font-bold text-green-700">{completedChallenges.length}</p>
                                </div>
                            </div>
                        </Link>
                         <Link href={`/${student?.id}/habits`} className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <Repeat className="h-6 w-6 text-purple-600" />
                                <div>
                                    <p className="font-semibold text-purple-800">進行中習慣</p>
                                    <p className="text-2xl font-bold text-purple-700">{ongoingHabits.length}</p>
                                </div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>
            
            <div className="space-y-6">
                {myPet ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bone />
                                我的寵物: {myPet.name}
                            </CardTitle>
                             <CardDescription>
                                {myPet.type} | 等級 {myPet.level}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='flex justify-center mb-4'>
                                <img src={myPet.imageUrl} alt={myPet.name} className="h-32 w-32 object-contain" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">經驗值</p>
                            <Progress value={(myPet.xp / myPet.xpToNextLevel) * 100} className="w-full" />
                            <p className="text-xs text-right mt-1">{myPet.xp} / {myPet.xpToNextLevel} XP</p>
                            <div className='mt-4 flex flex-wrap gap-2'>
                                {myPet.skills.map(skill => (
                                    <Badge key={skill.name} variant="secondary">{skill.name}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                     <Card>
                        <CardHeader>
                            <CardTitle>領養寵物</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>你還沒有寵物，快去看看吧！</p>
                            {/* TODO: Link to pet adoption page */}
                        </CardContent>
                    </Card>
                )}
                 <Card>
                    <CardHeader>
                        <CardTitle>快速連結</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                        <Link href={`/${student?.id}/rewards`} className='text-center p-2 bg-slate-100 rounded-md hover:bg-slate-200'>獎勵</Link>
                        <Link href={`/${student?.id}/invest`} className='text-center p-2 bg-slate-100 rounded-md hover:bg-slate-200'>投資</Link>
                        <Link href={`/${student?.id}/fundraising`} className='text-center p-2 bg-slate-100 rounded-md hover:bg-slate-200'>募資</Link>
                        <Link href={`/${student?.id}/wallet`} className='text-center p-2 bg-slate-100 rounded-md hover:bg-slate-200'>錢包</Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
