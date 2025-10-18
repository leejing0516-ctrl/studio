'use client';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc,
    increment,
    runTransaction,
    writeBatch
} from "firebase/firestore";
import type { Student, Stock, Reward } from "@/store/school-store";
import { initializeFirebase } from "@/firebase";

const { firestore } = initializeFirebase();

// Student Actions
export const addStudent = async (studentData: Omit<Student, 'id'>) => {
    try {
        const docRef = await addDoc(collection(firestore, "students"), studentData);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        return null;
    }
};

export const getStudentByName = async (name: string): Promise<Student | null> => {
    const q = query(collection(firestore, "students"), where("name", "==", name));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }
    const studentDoc = querySnapshot.docs[0];
    return { id: studentDoc.id, ...studentDoc.data() } as Student;
};

export const awardPoints = (studentId: string, amount: number) => {
    const studentRef = doc(firestore, "students", studentId);
    updateDoc(studentRef, {
        points: increment(amount)
    }).catch(e => console.error("Error awarding points: ", e));
};

// Reward Actions
export const redeemReward = async (studentId: string, rewardId: string) => {
    const studentRef = doc(firestore, "students", studentId);
    const rewardRef = doc(firestore, "rewards", rewardId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const studentDoc = await transaction.get(studentRef);
            const rewardDoc = await transaction.get(rewardRef);

            if (!studentDoc.exists()) {
                throw new Error("Student not found.");
            }
            if (!rewardDoc.exists()) {
                throw new Error("Reward not found.");
            }
            
            const studentData = studentDoc.data();
            const rewardData = rewardDoc.data();

            if (rewardData.stock <= 0) {
                throw new Error("Reward is out of stock.");
            }
            if (studentData.points < rewardData.cost) {
                throw new Error("Not enough points.");
            }

            transaction.update(studentRef, { points: increment(-rewardData.cost) });
            transaction.update(rewardRef, { stock: increment(-1) });
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
        if (e instanceof Error) {
            throw e; // re-throw the specific error
        }
        throw new Error("Could not redeem reward.");
    }
};

export const addReward = async (rewardData: Omit<Reward, 'id'>) => {
    try {
        await addDoc(collection(firestore, "rewards"), rewardData);
    } catch (e) {
        console.error("Error adding reward: ", e);
    }
};

export const updateReward = async (rewardId: string, rewardData: Partial<Reward>) => {
    const rewardRef = doc(firestore, "rewards", rewardId);
    try {
        await updateDoc(rewardRef, rewardData);
    } catch (e) {
        console.error("Error updating reward: ", e);
    }
};


// Stock Actions (simulation) - This simulates a cloud function.
export const updateStockPrices = async () => {
    if (!firestore) {
        console.error("Firestore not initialized for stock update");
        return;
    }
    const stocksRef = collection(firestore, "stocks");
    const snapshot = await getDocs(stocksRef);
    if (snapshot.empty) return;

    const batch = writeBatch(firestore);

    snapshot.docs.forEach(stockDoc => {
        const stock = stockDoc.data() as Stock;
        const change = (Math.random() - 0.5) * (stock.price * 0.1); // Fluctuate by up to 10%
        const newPrice = Math.max(1, stock.price + change); // Ensure price doesn't go below 1
        const newHistory = [...(stock.history || []).slice(-99), newPrice];
        
        batch.update(stockDoc.ref, {
            price: newPrice,
            history: newHistory,
        });
    });

    try {
        await batch.commit();
    } catch (e) {
        console.error("Error updating stock prices in batch: ", e);
    }
};
