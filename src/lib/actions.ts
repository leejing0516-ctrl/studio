
"use client";
import { doc, runTransaction, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Student, Reward } from "./types";

export const redeemRewardTransaction = async ({
  studentId,
  classId,
  rewardId,
}: {
  studentId: string;
  classId: string;
  rewardId: string;
}) => {
  try {
    await runTransaction(db, async (transaction) => {
      const studentDocId = `${classId}-${studentId}`;
      const studentRef = doc(db, "students", studentDocId);
      const rewardRef = doc(db, "rewards", rewardId);

      const [studentDoc, rewardDoc] = await Promise.all([
        transaction.get(studentRef),
        transaction.get(rewardRef),
      ]);

      if (!studentDoc.exists()) {
        throw new Error("找不到學生資料。");
      }
      if (!rewardDoc.exists()) {
        throw new Error("找不到此獎勵。");
      }

      const student = studentDoc.data() as Student;
      const reward = rewardDoc.data() as Reward;

      if (student.points < reward.cost) {
        throw new Error("點數不足。");
      }
      if (reward.stock <= 0) {
        throw new Error("此獎勵已無庫存。");
      }

      // Perform updates
      transaction.update(studentRef, {
        points: student.points - reward.cost,
        redeemedRewards: [
          ...(student.redeemedRewards || []),
          {
            redemptionId: `redeem-${Date.now()}`,
            reward: reward,
            status: 'collected',
            redemptionDate: new Date().toISOString(),
          },
        ],
      });

      transaction.update(rewardRef, {
        stock: reward.stock - 1,
      });
    });

    return { success: true };
  } catch (e: any) {
    console.error("Redemption Transaction failed: ", e);
    return { success: false, error: e.message };
  }
};

export const useRewardTransaction = async ({
    studentId,
    classId,
    redemptionId,
}: {
    studentId: string;
    classId: string;
    redemptionId: string;
}) => {
    try {
        await runTransaction(db, async (transaction) => {
            const studentDocId = `${classId}-${studentId}`;
            const studentRef = doc(db, "students", studentDocId);
            const studentDoc = await transaction.get(studentRef);

            if (!studentDoc.exists()) {
                throw new Error("找不到學生資料。");
            }

            const student = studentDoc.data() as Student;
            const updatedRewards = (student.redeemedRewards || []).map(r =>
                r.redemptionId === redemptionId
                    ? { ...r, status: 'pending_use' as const }
                    : r
            );

            transaction.update(studentRef, { redeemedRewards: updatedRewards });
        });
        return { success: true };
    } catch (e: any) {
        console.error("Use Reward Transaction failed: ", e);
        return { success: false, error: e.message };
    }
};

    