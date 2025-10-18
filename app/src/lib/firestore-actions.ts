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
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export const addStudent = (firestore: Firestore, studentData: Omit<Student, 'id'>) => {
    addDoc(collection(firestore, "students"), studentData)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: 'students',
                operation: 'create',
                requestResourceData: studentData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
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
        // This is a read operation, permission errors will be caught by useCollection/useDoc's onSnapshot listener
        console.error("Error getting student by name: ", e);
        return null;
    }
};

export const awardPoints = (firestore: Firestore, studentId: string, amount: number) => {
    const studentRef = doc(firestore, "students", studentId);
    const updateData = { points: increment(amount) };
    updateDoc(studentRef, updateData)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: studentRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const redeemReward = async (firestore: Firestore, studentId: string, rewardId: string) => {
    const studentRef = doc(firestore, "students", studentId);
    const rewardRef = doc(firestore, "rewards", rewardId);

    try {
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
    } catch (error: any) {
        // Re-throw the original error to be caught by the calling UI
        throw error;
    }
};

export const addReward = (firestore: Firestore, rewardData: Omit<Reward, 'id'>) => {
    addDoc(collection(firestore, "rewards"), rewardData)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: 'rewards',
                operation: 'create',
                requestResourceData: rewardData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const updateReward = (firestore: Firestore, rewardId: string, rewardData: Partial<Omit<Reward, 'id'>>) => {
    const rewardRef = doc(firestore, "rewards", rewardId);
    updateDoc(rewardRef, rewardData)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: rewardRef.path,
                operation: 'update',
                requestResourceData: rewardData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
};

export const updateStockPrices = (firestore: Firestore) => {
    const stocksRef = collection(firestore, "stocks");
    getDocs(stocksRef).then(snapshot => {
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

        batch.commit().catch(serverError => {
             // Note: It's hard to provide specific failing data for a batch write error.
             // We can signal which collection was affected.
            const permissionError = new FirestorePermissionError({
                path: 'stocks',
                operation: 'update',
                requestResourceData: { note: 'Batch update failed for multiple documents.' },
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: 'stocks',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
};
