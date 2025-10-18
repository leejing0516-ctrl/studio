"use client";

import { useState, useEffect } from 'react';

type UserType = 'student' | 'teacher';

type User = {
    id: string;
    name: string;
    type: UserType;
};

export function useSimpleUser(expectedType?: UserType) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // sessionStorage is only available on the client.
        // This effect will run after the component mounts.
        const userType = sessionStorage.getItem('userType') as UserType;
        const userId = sessionStorage.getItem(userType === 'teacher' ? 'teacherId' : 'userId');
        const userName = sessionStorage.getItem('userName');
        
        if (userId && userName && userType && (!expectedType || expectedType === userType)) {
            setUser({ id: userId, name: userName, type: userType });
        } else {
            setUser(null);
        }

        setIsLoading(false);
    }, [expectedType]);

    return { user, isLoading };
}
