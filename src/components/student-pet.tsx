
"use client";

import { useMemo, useContext, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AppDataContext } from '@/context/AppDataContext';
import { StudentDataContext } from '@/context/StudentDataContext';
import type { PetStage, Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { evolvePet } from '@/ai/flows/evolve-pet';
import { useToast } from '@/hooks/use-toast';

const defaultPetStages: PetStage[] = [
  {
    level: 1,
    name: "點點蛋",
    image: "https://i.imgur.com/2Ofa3a5.png",
    description: "一顆神秘的蛋，似乎對點數有反應。",
    pointsRequired: 0,
    aiHint: "mysterious egg",
  },
  {
    level: 2,
    name: "點點幼龍",
    image: "https://i.imgur.com/s6geD3w.png",
    description: "蛋孵化了！是隻活潑的幼龍，對世界充滿好奇。",
    pointsRequired: 500,
    aiHint: "cute baby dragon",
  },
  {
    level: 3,
    name: "點點巨龍",
    image: "https://i.imgur.com/N5NCt3I.png",
    description: "在充足的點數滋養下，牠成長為威風凜凜的巨龍！",
    pointsRequired: 2000,
    aiHint: "majestic dragon",
  },
];


const StudentPet = ({ student }: { student: Student }) => {
  const { platformConfig, setStudents } = useContext(AppDataContext);
  const { toast } = useToast();
  const [isEvolving, setIsEvolving] = useState(false);
  
  const petStages = useMemo(() => {
    return platformConfig?.petStages && platformConfig.petStages.length > 0 
      ? [...platformConfig.petStages].sort((a,b) => a.pointsRequired - b.pointsRequired)
      : defaultPetStages;
  }, [platformConfig]);

  const currentStage = useMemo(() => {
    let stage = petStages[0];
    for (let i = petStages.length - 1; i >= 0; i--) {
      if (student.points >= petStages[i].pointsRequired) {
        stage = petStages[i];
        break;
      }
    }
    return stage;
  }, [student.points, petStages]);
  
  const nextStage = petStages.find(s => s.level === currentStage.level + 1);
  
  const canEvolve = useMemo(() => {
    if (!nextStage || !student) return false;
    return student.points >= nextStage.pointsRequired && student.petLevel !== nextStage.level;
  }, [nextStage, student]);

  const progress = useMemo(() => {
    if (!nextStage) return 100;
    const pointsInCurrentStage = student.points - currentStage.pointsRequired;
    const pointsForNextStage = nextStage.pointsRequired - currentStage.pointsRequired;
    if (pointsForNextStage <= 0) return 100;
    return Math.min((pointsInCurrentStage / pointsForNextStage) * 100, 100);
  }, [student.points, currentStage, nextStage]);

  const handleEvolve = async () => {
    if (!canEvolve || !nextStage || !student._docId) return;

    setIsEvolving(true);
    toast({ title: '進化中...', description: '您的寵物正在吸收點數的力量！' });
    try {
        const result = await evolvePet({ 
            studentId: student.id,
            currentPetImage: student.petImage || currentStage.image,
            evolutionPrompt: nextStage.aiHint,
        });

        if (result.imageUrl) {
            await setStudents(prev => prev.map(s => {
                if (s._docId === student._docId) {
                    return { ...s, petImage: result.imageUrl, petLevel: nextStage.level };
                }
                return s;
            }));
            toast({ title: '進化成功！', description: `您的寵物進化成了${nextStage.name}！` });
        } else {
            throw new Error('AI沒有回傳圖片。');
        }
    } catch(e: any) {
        console.error(e);
        toast({ title: '進化失敗', description: e.message || '發生未知錯誤。', variant: 'destructive'});
    } finally {
        setIsEvolving(false);
    }
  };
  
  const displayImage = student.petImage || currentStage.image;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
        <motion.div 
            key={currentStage.level}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative w-40 h-40"
        >
            <Image 
                src={displayImage}
                alt={currentStage.name}
                fill
                className="object-contain"
                data-ai-hint={currentStage.aiHint}
                sizes="(max-width: 768px) 100vw, 160px"
            />
        </motion.div>
        <div>
            <h3 className="text-xl font-bold text-primary">{currentStage.name}</h3>
            <p className="text-sm text-muted-foreground">{currentStage.description}</p>
        </div>
        {canEvolve && (
             <Button onClick={handleEvolve} disabled={isEvolving}>
                {isEvolving ? (
                    <Loader2 className="mr-2 animate-spin" />
                ) : (
                    <Sparkles className="mr-2" />
                )}
                進化成 {nextStage?.name}！
            </Button>
        )}
        {nextStage && !canEvolve && (
            <div className="w-full space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Lv. {currentStage.level}</span>
                    <span>下一階段: {nextStage.pointsRequired.toLocaleString()} 點</span>
                    <span>Lv. {nextStage.level}</span>
                </div>
                 <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                    <motion.div 
                        className="bg-primary h-2.5 rounded-full" 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                </div>
            </div>
        )}
    </div>
  );
};

export default StudentPet;
