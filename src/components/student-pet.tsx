
"use client";

import { useMemo, useContext } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AppDataContext } from '@/context/AppDataContext';
import type { PetStage } from '@/lib/types';

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


const StudentPet = ({ points }: { points: number }) => {
  const { platformConfig } = useContext(AppDataContext);
  
  const petStages = useMemo(() => {
    return platformConfig?.petStages && platformConfig.petStages.length > 0 
      ? platformConfig.petStages 
      : defaultPetStages;
  }, [platformConfig]);

  const currentStage = useMemo(() => {
    let stage = petStages[0];
    for (let i = petStages.length - 1; i >= 0; i--) {
      if (points >= petStages[i].pointsRequired) {
        stage = petStages[i];
        break;
      }
    }
    return stage;
  }, [points, petStages]);
  
  const nextStage = petStages.find(s => s.level === currentStage.level + 1);

  const progress = useMemo(() => {
    if (!nextStage) return 100;
    const pointsInCurrentStage = points - currentStage.pointsRequired;
    const pointsForNextStage = nextStage.pointsRequired - currentStage.pointsRequired;
    if (pointsForNextStage <= 0) return 100;
    return Math.min((pointsInCurrentStage / pointsForNextStage) * 100, 100);
  }, [points, currentStage, nextStage]);

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
                src={currentStage.image}
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
        {nextStage && (
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
