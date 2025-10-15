
"use client";

import { createContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Student, Reward, Class, Teacher, Stock, PlatformConfig } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, runTransaction as firestoreRunTransaction, Transaction, writeBatch, deleteDoc } from 'firebase/firestore';

type SetStateActionWithFunction<S> = S | ((prevState: S) => S);

interface AppDataContextType {
  rewards: Reward[];
  setRewards: (action: SetStateActionWithFunction<Reward[]>) => Promise<void>;
  stocks: Stock[];
  setStocks: (action: SetStateActionWithFunction<Stock[]>) => Promise<void>;
  classes: Class[];
  setClasses: (action: SetStateActionWithFunction<Class[]>) => Promise<void>;
  platformConfig: PlatformConfig | null;
  setPlatformConfig: (dataToUpdate: Partial<PlatformConfig>) => Promise<void>;
  isLoading: boolean;
  isMarketOpen: boolean;
  fetchInitialData: () => () => void;
}

const defaultState: AppDataContextType = {
  rewards: [],
  setRewards: async () => {},
  stocks: [],
  setStocks: async () => {},
  classes: [],
  setClasses: async () => {},
  platformConfig: null,
  setPlatformConfig: async () => {},
  isLoading: true,
  isMarketOpen: false,
  fetchInitialData: () => () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultState);

const checkMarketOpen = (config: PlatformConfig | null) => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const openHour = config?.marketOpenHour ?? 9;
    const closeHour = config?.marketCloseHour ?? 14;
    return day >= 1 && day <= 5 && hour >= openHour && hour < closeHour;
};

const useIdAsDocId = (collectionName: string) => {
  return ['stocks', 'classes', 'rewards'].includes(collectionName);
}

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const [rewards, setRewardsState] = useState<Reward[]>([]);
  const [stocks, setStocksState] = useState<Stock[]>([]);
  const [classes, setClassesState] = useState<Class[]>([]);
  const [platformConfig, setPlatformConfigState] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  
  const createSetterWithBatch = <T extends { _docId?: string; id?: any }>(
    collectionName: string,
    stateSetter: React.Dispatch<React.SetStateAction<T[]>>,
    currentState: T[]
  ) => {
    return async (action: SetStateActionWithFunction<T[]>) => {
      const oldData = currentState;
      const newData = typeof action === 'function' ? action(oldData) : action;
      
      stateSetter(newData); // Optimistic update
      
      const batch = writeBatch(db);
      const useId = useIdAsDocId(collectionName);

      const oldMap = new Map(oldData.map(item => [useId ? item.id : item._docId, item]));
      const newMap = new Map(newData.map(item => [useId ? item.id : item._docId, item]));
      
      oldMap.forEach((_, key) => {
        if (!newMap.has(key)) {
            if (key) batch.delete(doc(db, collectionName, key));
        }
      });
      
      newMap.forEach((newItem, key) => {
        const oldItem = oldMap.get(key);
        if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
           const { _docId, ...itemData } = newItem;
           const docId = useId ? newItem.id : key;
           if (!docId) return;
           const docRef = doc(db, collectionName, docId);
           batch.set(docRef, itemData, { merge: true });
        }
      });
      
      try {
        await batch.commit();
      } catch (error) {
        console.error(`Batch update for ${collectionName} failed:`, error);
        stateSetter(oldData); // Revert on failure
      }
    };
  };

  const setPlatformConfig = async (dataToUpdate: Partial<PlatformConfig>) => {
      const configRef = doc(db, 'config', 'main');
      await firestoreRunTransaction(db, async (transaction) => {
          transaction.set(configRef, dataToUpdate, { merge: true });
      });
  };

  const fetchInitialData = useCallback(() => {
    const collectionsToListen: { name: string, setter: React.Dispatch<React.SetStateAction<any>> }[] = [
        { name: 'classes', setter: setClassesState },
        { name: 'rewards', setter: setRewardsState },
        { name: 'stocks', setter: setStocksState },
    ];

    const unsubs = collectionsToListen.map(c => {
        return onSnapshot(collection(db, c.name), (snapshot) => {
            c.setter(snapshot.docs.map(d => ({ ...d.data(), id: d.id, _docId: d.id })));
            setIsLoading(false);
        });
    });
    
    const unsubConfig = onSnapshot(doc(db, 'config', 'main'), (doc) => {
        if (doc.exists()) {
            setPlatformConfigState(doc.data() as PlatformConfig);
        }
        setIsLoading(false);
    });
    unsubs.push(unsubConfig);

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    setIsMarketOpen(checkMarketOpen(platformConfig));
    const marketInterval = setInterval(() => {
      setIsMarketOpen(checkMarketOpen(platformConfig));
    }, 60000);
    return () => clearInterval(marketInterval);
  }, [platformConfig]);

  return (
    <AppDataContext.Provider value={{ 
        rewards, 
        setRewards: createSetterWithBatch('rewards', setRewardsState, rewards),
        stocks,
        setStocks: createSetterWithBatch('stocks', setStocksState, stocks),
        classes, 
        setClasses: createSetterWithBatch('classes', setClassesState, classes),
        platformConfig,
        setPlatformConfig,
        isLoading,
        isMarketOpen,
        fetchInitialData,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
