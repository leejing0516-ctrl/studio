
"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase"; // Assuming you have this export from your firebase config

export const useFirebaseStorage = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const uploadFile = async (file: File, path: string): Promise<string | null> => {
        setIsUploading(true);
        setUploadError(null);

        try {
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            setIsUploading(false);
            return downloadURL;
        } catch (error: any) {
            console.error("Upload failed:", error);
            setUploadError(error.message || "File could not be uploaded.");
            setIsUploading(false);
            return null;
        }
    };

    return { isUploading, uploadError, uploadFile };
};
