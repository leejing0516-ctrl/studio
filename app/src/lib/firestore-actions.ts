'use client';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc,
    increment,
    runTransaction,
    writeBatch,
    Firestore
} from "firebase/firestore";
import type { Student, Stock, Reward } from "@/lib/mock-data";

export const addStudent = async (firestore: Firestore, studentData: Omit<Student, 'id'>) => {
    try {
        const docRef = await addDoc(collection(firestore, "students"), studentData);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw new Error("Could not add student");
    }
};

export const getStudentByName = async (firestore: Firestore, name: string): Promise<(Student & { id: string }) | null> => {
    const q = query(collection(firestore, "students"), where("name", "==", name));
    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        const studentDoc = querySnapshot.docs[0];
        return { id: studentDoc.id, ...studentDoc.data() } as (Student & { id: string });
    } catch(e) {
        console.error("Error getting student by name: ", e);
        return null;
    }
};

export const awardPoints = (firestore: Firestore, studentId: string, amount: number) => {
    const studentRef = doc(firestore, "students", studentId);
    updateDoc(studentRef, {
        points: increment(amount)
    }).catch(e => console.error("Error awarding points: ", e));
};

export const redeemReward = async (firestore: Firestore, studentId: string, rewardId: string) => {
    const studentRef = doc(firestore, "students", studentId);
    const rewardRef = doc(firestore, "rewards", rewardId);

    await runTransaction(firestore, async (transaction) => {
        const studentDoc = await transaction.get(studentRef);
        const rewardDoc = await transaction.get(rewardRef);

        if (!studentDoc.exists()) {
            throw new Error("找不到學生資料。");
        }
        if (!rewardDoc.exists()) {
            throw new Error("找不到獎勵資料。");
        }
        
        const studentData = studentDoc.data();
        const rewardData = rewardDoc.data();

        if (rewardData.stock <= 0) {
            throw new Error("獎勵已售完。");
        }
        if (studentData.points < rewardData.cost) {
            throw new Error("點數不足。");
        }

        transaction.update(studentRef, { points: increment(-rewardData.cost) });
        transaction.update(rewardRef, { stock: increment(-1) });
    });
};

export const addReward = async (firestore: Firestore, rewardData: Omit<Reward, 'id'>) => {
    try {
        await addDoc(collection(firestore, "rewards"), rewardData);
    } catch (e) {
        console.error("Error adding reward: ", e);
        throw new Error("Could not add reward");
    }
};

export const updateReward = async (firestore: Firestore, rewardId: string, rewardData: Partial<Omit<Reward, 'id'>>) => {
    const rewardRef = doc(firestore, "rewards", rewardId);
    try {
        await updateDoc(rewardRef, rewardData);
    } catch (e) {
        console.error("Error updating reward: ", e);
        throw new Error("Could not update reward");
    }
};

export const updateStockPrices = async (firestore: Firestore) => {
    const stocksRef = collection(firestore, "stocks");
    try {
        const snapshot = await getDocs(stocksRef);
        if (snapshot.empty) return;

        const batch = writeBatch(firestore);

        snapshot.docs.forEach(stockDoc => {
            const stock = stockDoc.data() as Stock;
            const change = (Math.random() - 0.5) * (stock.price * 0.1);
            const newPrice = Math.max(1, stock.price + change);
            const newHistory = [...(stock.history || []).slice(-99), newPrice];
            
            batch.update(stockDoc.ref, {
                price: newPrice,
                history: newHistory,
            });
        });

        await batch.commit();
    } catch (e) {
        console.error("Error updating stock prices in batch: ", e);
    }
};
