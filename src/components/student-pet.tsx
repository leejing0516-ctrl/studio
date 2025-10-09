
"use client";

import { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { Student, PetStage } from '@/lib/types';
import { Button } from './ui/button';
import { AppDataContext } from '@/context/AppDataContext';
import { Wand2, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';


const StudentPet = ({ student }: { student: Student }) => {
    const { platformConfig, setStudents } = useContext(AppDataContext);
    const { toast } = useToast();

    const petStages = useMemo(() => platformConfig?.petStages || [], [platformConfig]);

    const currentStageIndex = useMemo(() => {
        if (!student || !petStages.length) return 0;
        let currentIdx = 0;
        for (let i = 0; i < petStages.length; i++) {
            if (student.points >= petStages[i].pointsRequired) {
                currentIdx = i;
            } else {
                break;
            }
        }
        return currentIdx;
    }, [student, petStages]);

    const currentStage = useMemo(() => petStages[currentStageIndex], [petStages, currentStageIndex]);
    const nextStage = useMemo(() => petStages[currentStageIndex + 1], [petStages, currentStageIndex]);

    const evolutionProgress = useMemo(() => {
        if (!nextStage) return 100; // Already at max level
        const pointsInCurrentStage = student.points - currentStage.pointsRequired;
        const pointsForNextStage = nextStage.pointsRequired - currentStage.pointsRequired;
        if (pointsForNextStage <= 0) return 100;
        return Math.min((pointsInCurrentStage / pointsForNextStage) * 100, 100);
    }, [student.points, currentStage, nextStage]);

    if (!currentStage) {
        return <div className="text-center text-muted-foreground">尚未設定寵物</div>;
    }

    return (
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative w-48 h-48">
                <Image
                    src={currentStage.image}
                    alt={currentStage.name}
                    fill
                    className="object-contain"
                    sizes="200px"
                />
            </div>
            <div>
                 <div className="flex items-center justify-center gap-2">
                    <h3 className="text-xl font-bold">{currentStage.name}</h3>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="h-3 w-3"/>
                        Lv. {currentStage.level}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{currentStage.description}</p>
            </div>

            <div className="w-full pt-2">
                {nextStage ? (
                    <>
                        <Progress value={evolutionProgress} />
                        <p className="text-xs text-muted-foreground mt-2">
                            再賺取 <span className="font-bold text-primary">{(nextStage.pointsRequired - student.points).toLocaleString()}</span> 點即可進化成「{nextStage.name}」！
                        </p>
                    </>
                ) : (
                    <p className="text-sm font-semibold text-primary">已達最高等級！</p>
                )}
            </div>
        </div>
    );
};

export default StudentPet;
