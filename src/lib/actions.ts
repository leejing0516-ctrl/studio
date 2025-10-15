
"use client";
import { doc, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import type { Student, Reward } from "./types";

export const redeemRewardTransaction = async ({
  studentDocId,
  reward,
}: {
  studentDocId: string;
  reward: Reward;
}) => {
  try {
    await runTransaction(db, async (transaction) => {
      const studentRef = doc(db, "students", studentDocId);
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
        throw new Error("找不到學生資料!");
      }
      
      const student = studentSnap.data() as Student;
      if (student.points < reward.cost) {
        throw new Error("點數不足!");
      }
      
      const newPoints = student.points - reward.cost;
      const newRedeemedReward = {
        redemptionId: `redeem-${Date.now()}`,
        reward: reward,
        status: 'collected' as const,
        redemptionDate: new Date().toISOString(),
      };
      
      const updatedRewards = [...(student.redeemedRewards || []), newRedeemedReward];
      transaction.update(studentRef, { points: newPoints, redeemedRewards: updatedRewards });

      if (reward._docId) {
        const rewardRef = doc(db, "rewards", reward._docId);
        const rewardSnap = await transaction.get(rewardRef);
        if (rewardSnap.exists() && rewardSnap.data().stock > 0) {
            transaction.update(rewardRef, { stock: rewardSnap.data().stock - 1 });
        } else {
            throw new Error("獎勵庫存不足!");
        }
      }
    });

    return { success: true };
  } catch (e: any) {
    console.error("Redemption transaction failed: ", e);
    return { success: false, error: e.message };
  }
};
