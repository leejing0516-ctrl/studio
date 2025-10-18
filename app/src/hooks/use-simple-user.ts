
"use client";

import { useState, useEffect } from 'react';

type UserType = 'student' | 'teacher';

export type SimpleUser = {
    id: string;
    name: string;
    type: UserType;
};

/**
 * A simple, hydration-safe hook to get user information from sessionStorage.
 * This hook is designed to prevent Next.js hydration errors by delaying
 * the access to sessionStorage until the component has mounted on the client.
 * @param expectedType Optional: The user type ('student' or 'teacher') that is expected on the page.
 * @returns An object containing the user and a loading state.
 */
export function useSimpleUser(expectedType?: UserType) {
    const [user, setUser] = useState<SimpleUser | null>(null);
    // isLoading is crucial. It must start as true.
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // This effect runs ONLY on the client, after the component has mounted.
        // This is the safe place to access browser-specific APIs like sessionStorage.
        try {
            const userType = sessionStorage.getItem('userType') as UserType | null;
            const userId = sessionStorage.getItem(userType === 'teacher' ? 'teacherId' : 'userId');
            const userName = sessionStorage.getItem('userName');
            
            // Check if all required data is present and matches the expected type
            if (userId && userName && userType && (!expectedType || expectedType === userType)) {
                setUser({ id: userId, name: userName, type: userType });
            } else {
                // If info is missing or type doesn't match, user is not authenticated for this page.
                setUser(null);
            }
        } catch (error) {
            // If sessionStorage is unavailable or another error occurs, treat as not logged in.
            console.error("Error reading from sessionStorage:", error);
            setUser(null);
        } finally {
            // Crucially, set loading to false AFTER attempting to read session storage.
            setIsLoading(false);
        }
    }, [expectedType]); // The dependency array ensures this runs once on mount and if expectedType changes.

    return { user, isLoading };
}
