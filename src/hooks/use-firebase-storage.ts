
"use client";

import { useState } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

export const useFirebaseStorage = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const uploadFile = async (file: File, path: string): Promise<string | null> => {
        if (!file) {
            setError("No file provided.");
            return null;
        }

        if (file.size > MAX_FILE_SIZE) {
            const errorMsg = `請選擇小於 ${MAX_FILE_SIZE / 1024 / 1024}MB 的圖片。`;
            setError(errorMsg);
            toast({
                title: "圖片檔案太大",
                description: errorMsg,
                variant: "destructive",
            });
            return null;
        }

        setIsUploading(true);
        setError(null);

        try {
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file, { contentType: file.type });
            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (e: any) {
            console.error("Upload failed", e);
            const errorMsg = "上傳圖片時發生錯誤，請檢查您的網路連線或稍後再試。";
            setError(errorMsg);
            toast({ title: "上傳失敗", description: errorMsg, variant: "destructive" });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    return { uploadFile, isUploading, error };
};
