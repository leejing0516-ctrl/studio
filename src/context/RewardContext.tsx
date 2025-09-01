"use client";

import { createContext, useState, ReactNode } from 'react';
import type { Reward } from '@/lib/types';
import { rewards as initialRewards } from '@/lib/placeholder-data';

interface RewardContextType {
  rewards: Reward[];
  setRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
}

export const RewardContext = createContext<RewardContextType>({
  rewards: initialRewards,
  setRewards: () => {},
});

export const RewardProvider = ({ children }: { children: ReactNode }) => {
  const [rewards, setRewards] = useState<Reward[]>(initialRewards);

  return (
    <RewardContext.Provider value={{ rewards, setRewards }}>
      {children}
    </RewardContext.Provider>
  );
};
