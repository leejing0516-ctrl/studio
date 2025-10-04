
"use client";

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function useFirebaseStorage() {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = async (file: File, path: string): Promise<string | null> => {
        setIsUploading(true);
        setError(null);

        if (!file || !path) {
            setError('缺少檔案或路徑。');
            setIsUploading(false);
            return null;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError(`檔案大小不能超過 ${MAX_FILE_SIZE / 1024 / 1024}MB。`);
            setIsUploading(false);
            return null;
        }

        try {
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file, { contentType: file.type });
            const downloadURL = await getDownloadURL(storageRef);
            setIsUploading(false);
            return downloadURL;
        } catch (e: any) {
            console.error("File upload failed in hook:", e);
            setError(e.message || '檔案上傳時發生未知錯誤。');
            setIsUploading(false);
            return null;
        }
    };

    return { uploadFile, isUploading, error };
}
