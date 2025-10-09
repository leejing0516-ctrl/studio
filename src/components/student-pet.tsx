
"use client";

import { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { Student, PetStage } from '@/lib/types';
import { Button } from './ui/button';
import { AppDataContext } from '@/context/AppDataContext';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { evolvePet } from '@/ai/flows/evolve-pet';


const StudentPet = ({ student }: { student: Student }) => {
    const { platformConfig, setStudents } = useContext(AppDataContext);
    const { toast } = useToast();
    const [isEvolving, setIsEvolving] = useState(false);

    const petStages = useMemo(() => platformConfig?.petStages || [], [platformConfig]);

    const currentStage = useMemo(() => {
        if (!student || !petStages.length) return petStages[0] || null;
        // Iterate backwards to find the highest stage the student qualifies for
        for (let i = petStages.length - 1; i >= 0; i--) {
            if (student.points >= petStages[i].pointsRequired) {
                return petStages[i];
            }
        }
        return petStages[0] || null;
    }, [student, petStages]);

    // This is a simplified version of the pet display.
    // It will be replaced with the AI evolution logic.
    return (
        <div className="flex flex-col items-center gap-4 text-center">
        {currentStage && (
            <>
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
                <h3 className="text-xl font-bold">{currentStage.name}</h3>
                <p className="text-sm text-muted-foreground">{currentStage.description}</p>
            </div>
            </>
        )}
        </div>
    );
};

export default StudentPet;
