
"use client";

import { useState } from 'react';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export const uploadImageFromString = async (
    dataUrl: string, 
    path: string
): Promise<string | null> => {
    try {
        const storageRef = ref(storage, path);
        
        // 'data_url' is the correct format string for Data URLs
        const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
    } catch (error: any) {
        console.error("Firebase Storage upload failed:", error);
        // We will let the calling component handle the toast message
        throw new Error(`Failed to upload image: ${error.message}`);
    }
};
