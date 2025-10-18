
"use client";

import { useState, useEffect } from 'react';

type UserType = 'student' | 'teacher';

type User = {
    id: string;
    name: string;
    type: UserType;
};

/**
 * A simple, hydration-safe hook to get user information from sessionStorage.
 * This hook is designed to prevent Next.js hydration errors.
 * @param expectedType Optional: The user type ('student' or 'teacher') that is expected.
 * @returns An object containing the user and a loading state.
 */
export function useSimpleUser(expectedType?: UserType) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // sessionStorage is only available on the client.
        // This effect will run only after the component has mounted (hydrated).
        const userType = sessionStorage.getItem('userType') as UserType | null;
        const userId = sessionStorage.getItem(userType === 'teacher' ? 'teacherId' : 'userId');
        const userName = sessionStorage.getItem('userName');
        
        if (userId && userName && userType && (!expectedType || expectedType === userType)) {
            setUser({ id: userId, name: userName, type: userType });
        } else {
            // If information is missing or doesn't match expected type, ensure user is null
            setUser(null);
        }

        // The loading is finished after the first client-side run
        setIsLoading(false);
    }, [expectedType]);

    return { user, isLoading };
}
