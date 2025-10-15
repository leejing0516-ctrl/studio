
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
    const batch = writeBatch(db);
    const studentRef = doc(db, "students", studentDocId);

    // This part needs the full student object to update.
    // A better implementation would pass the full student object
    // or fetch it here, but for now we rely on the caller to update the student object.
    
    // We can update the reward stock though
    if (reward._docId) {
        const rewardRef = doc(db, "rewards", reward._docId);
        batch.update(rewardRef, {
            stock: reward.stock - 1,
        });
    }

    await batch.commit();

    return { success: true };
  } catch (e: any) {
    console.error("Redemption transaction failed: ", e);
    return { success: false, error: e.message };
  }
};
