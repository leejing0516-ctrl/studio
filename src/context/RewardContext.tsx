
"use client";

import { createContext, useState, ReactNode, useEffect } from 'react';
import type { Reward } from '@/lib/types';
import { rewards as initialRewards } from '@/lib/placeholder-data';

interface RewardContextType {
  rewards: Reward[];
  setRewards: React.Dispatch<React.SetStateAction<Reward[]>>;
}

const defaultState: RewardContextType = {
  rewards: initialRewards,
  setRewards: () => {},
};

export const RewardContext = createContext<RewardContextType>(defaultState);

export const RewardProvider = ({ children }: { children: ReactNode }) => {
  const [rewards, setRewards] = useState<Reward[]>(() => {
    if (typeof window !== 'undefined') {
      const savedRewards = localStorage.getItem('rewards');
      return savedRewards ? JSON.parse(savedRewards) : initialRewards;
    }
    return initialRewards;
  });

  useEffect(() => {
    localStorage.setItem('rewards', JSON.stringify(rewards));
  }, [rewards]);

  return (
    <RewardContext.Provider value={{ rewards, setRewards }}>
      {children}
    </RewardContext.Provider>
  );
};
