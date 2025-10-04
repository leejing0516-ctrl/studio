
"use server";

import { suggestRewards, type RewardSuggestionInput } from "@/ai/flows/reward-suggestion";
import { db, storage } from './firebase'; // Switch from admin SDK to client/web SDK
import { doc, runTransaction, getDoc, setDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Student, Reward, Teacher, PlatformConfig, RedeemedRewardItem } from './types';


export async function getRewardSuggestions(input: RewardSuggestionInput) {
    try {
        const result = await suggestRewards(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("AI 錯誤:", error);
        return { success: false, error: "無法取得獎勵建議。" };
    }
}

interface RedeemRewardInput {
    studentId: string;
    classId: string;
    rewardId: string;
}

interface RedeemRewardOutput {
    success: boolean;
    error?: string;
}

export async function redeemRewardTransaction(input: RedeemRewardInput): Promise<RedeemRewardOutput> {
    try {
        await runTransaction(db, async (transaction) => {
            const studentDocId = `${input.classId}-${input.studentId}`;
            const studentRef = doc(db, 'students', studentDocId);
            const rewardRef = doc(db, 'rewards', input.rewardId);

            const [studentDoc, rewardDoc] = await Promise.all([
                transaction.get(studentRef),
                transaction.get(rewardRef)
            ]);

            if (!studentDoc.exists()) {
                throw new Error("找不到該學生。");
            }
            if (!rewardDoc.exists()) {
                throw new Error("找不到該獎勵。");
            }

            const student = studentDoc.data() as Student;
            const reward = rewardDoc.data() as Reward;

            if (student.points < reward.cost) {
                throw new Error("您的點數不足以兌換此獎勵。");
            }
            if (reward.stock <= 0) {
                throw new Error("此獎勵的庫存不足。");
            }
            
            const newRedeemedItem: RedeemedRewardItem = {
                redemptionId: `redeem-${Date.now()}-${Math.random()}`,
                reward: reward,
                status: 'collected',
                redemptionDate: new Date().toISOString(),
            };
            transaction.update(studentRef, {
                points: student.points - reward.cost,
                redeemedRewards: [...(student.redeemedRewards || []), newRedeemedItem]
            });

            transaction.update(rewardRef, {
                stock: reward.stock - 1
            });

            if (reward.scope === 'school') {
                const configRef = doc(db, 'config', 'main');
                const configDoc = await transaction.get(configRef);
                const currentConfig = configDoc.data() as PlatformConfig;
                transaction.update(configRef, {
                    schoolFunds: (currentConfig.schoolFunds || 0) + reward.cost
                });
            } else {
                const teacherRef = doc(db, 'teachers', reward.providerId);
                const teacherDoc = await transaction.get(teacherRef);
                if (teacherDoc.exists()) {
                    const teacher = teacherDoc.data() as Teacher;
                    transaction.update(teacherRef, {
                        pointBalance: (teacher.pointBalance || 0) + reward.cost
                    });
                }
            }
        });

        return { success: true };

    } catch (error: any) {
        console.error("Redeem Reward Transaction failed: ", error);
        return { success: false, error: error.message || "交易失敗，請稍後再試。" };
    }
}


interface UseRewardInput {
    studentId: string;
    classId: string;
    redemptionId: string;
}

interface UseRewardOutput {
    success: boolean;
    error?: string;
}

export async function useRewardTransaction(input: UseRewardInput): Promise<UseRewardOutput> {
     try {
        await runTransaction(db, async (transaction) => {
            const studentDocId = `${input.classId}-${input.studentId}`;
            const studentRef = doc(db, 'students', studentDocId);

            const studentDoc = await transaction.get(studentRef);

            if (!studentDoc.exists()) {
                throw new Error("找不到該學生。");
            }
            
            const student = studentDoc.data() as Student;
            
            const targetReward = (student.redeemedRewards || []).find(r => r.redemptionId === input.redemptionId);
            if (!targetReward) {
                throw new Error("在您的收藏中找不到此獎勵。");
            }
            if (targetReward.status !== 'collected') {
                throw new Error("此獎勵目前無法使用。");
            }

            const updatedRewards = (student.redeemedRewards || []).map(r => 
                r.redemptionId === input.redemptionId ? { ...r, status: 'pending_use' as const } : r
            );

            transaction.update(studentRef, {
                redeemedRewards: updatedRewards
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Use Reward Transaction failed: ", error);
        return { success: false, error: error.message || "請求失敗，請稍後再試。" };
    }
}

export async function uploadFile(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    if (!file || !path) {
      throw new Error('缺少檔案或路徑。');
    }
    
    const storageRef = ref(storage, path);
    
    await uploadBytes(storageRef, file, { contentType: file.type });

    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error("File upload failed:", error);
    return { success: false, error: error.message || '檔案上傳時發生未知錯誤。' };
  }
}

export async function savePlatformSettings(newConfig: Partial<PlatformConfig>): Promise<{success: boolean, error?: string}> {
    try {
        const configDocRef = doc(db, 'config', 'main');
        await updateDoc(configDocRef, newConfig);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to save platform settings:", error);
        return { success: false, error: error.message || "儲存設定時發生未知錯誤。" };
    }
}


export async function removeLogo({ type, index }: { type: 'platform' | 'sponsor'; index?: number }): Promise<{success: boolean, error?: string}> {
     try {
        const configDocRef = doc(db, 'config', 'main');
        const configDoc = await getDoc(configDocRef);
        if (!configDoc.exists()) {
            throw new Error("找不到平台設定。");
        }
        const currentConfig = configDoc.data() as PlatformConfig;
        
        let urlToDelete: string | null | undefined = null;
        let updatePayload: Partial<PlatformConfig> = {};

        if (type === 'platform') {
            urlToDelete = currentConfig.platformLogoUrl;
            updatePayload.platformLogoUrl = '';
        } else if (type === 'sponsor' && index !== undefined) {
            const currentUrls = [...(currentConfig.sponsorLogoUrls || [])];
            urlToDelete = currentUrls[index];
            currentUrls[index] = null;
            updatePayload.sponsorLogoUrls = currentUrls;
        } else {
            throw new Error("無效的移除類型或索引。");
        }
        
        // Update Firestore first
        await updateDoc(configDocRef, updatePayload);
        
        if (urlToDelete) {
            try {
                // To delete from storage, you need to parse the URL to get the path
                const fileRef = ref(storage, urlToDelete);
                await deleteObject(fileRef);
            } catch (storageError: any) {
                // If deletion fails (e.g. file not found), log it but don't fail the whole operation
                // as the URL has already been removed from Firestore.
                console.warn(`Failed to delete old file from storage: ${urlToDelete}`, storageError);
            }
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Failed to remove logo:", error);
        return { success: false, error: error.message || "移除圖片時發生錯誤。" };
    }
}

export async function setStudents(students: Student[]) {
    const batch = writeBatch(db);
    students.forEach(student => {
        const studentDocId = `${student.classId}-${student.id}`;
        const studentRef = doc(db, 'students', studentDocId);
        batch.set(studentRef, student, { merge: true });
    });
    await batch.commit();
}

export async function setRewards(rewards: Reward[]) {
    const batch = writeBatch(db);
    rewards.forEach(reward => {
        const rewardRef = doc(db, 'rewards', reward.id);
        batch.set(rewardRef, reward, { merge: true });
    });
    await batch.commit();
}

export async function setStocks(stocks: Stock[]) {
    const batch = writeBatch(db);
    stocks.forEach(stock => {
        const stockRef = doc(db, 'stocks', stock.ticker);
        batch.set(stockRef, stock, { merge: true });
    });
    await batch.commit();
}
