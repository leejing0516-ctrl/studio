import { Timestamp } from "firebase/firestore";

export interface Student {
    _docId: string;
    id: string;
    name: string;
    classId: string;
    seatNumber: number;
    points: number;
    avatarUrl?: string;
    deposits: { amount: number; date: Timestamp; description: string; rate: number; type: 'current' | 'fixed'; maturityDate?: Timestamp }[];
    loans: { amount: number; date: Timestamp; description: string; interestRate: number; repaid: boolean }[];
    transactions: { date: Timestamp; description: string; amount: number; type: 'earn' | 'spend' }[];
    petId?: string;
}

export interface Teacher {
    _docId: string;
    id: string;
    name: string;
    role: 'admin' | 'teacher' | 'subject_teacher';
    classId?: string; // For 'teacher' role
    subject?: string; // For 'subject_teacher' role
    password?: string;
    managedClasses?: string[];
}

export interface Class {
    _docId: string;
    id: string;
    name: string;
    teacherId: string;
}

export interface Announcement {
    _docId: string;
    id: string;
    title: string;
    content: string;
    date: Timestamp;
    author: string;
    targetUser: ('all' | 'student' | 'teacher' | string)[]; // string can be classId
}

export interface Challenge {
    _docId: string;
    id: string;
    title: string;
    description: string;
    points: number;
    availableCount: number;
    createdBy: string;
    completedBy: string[]; // list of studentIds
}

export interface Reward {
    _docId: string;
    id: string;
    name: string;
    description: string;
    cost: number;
    stock: number;
    imageUrl?: string;
}

export interface Habit {
    _docId: string;
    id: string;
    studentId: string;
    name: string;
    description: string;
    pointsPerCheck: number;
    status: 'pending' | 'active' | 'completed' | 'rejected';
    checkIns: { date: Timestamp; approved: boolean }[];
    rejectionReason?: string;
    createdAt: Timestamp;
}

export interface Pet {
    _docId: string;
    id: string;
    name: string;
    type: string;
    level: number;
    xp: number;
    xpToNextLevel: number;
    imageUrl: string;
    skills: { name: string; description: string }[];
}

export interface Stock {
    _docId: string;
    id: string;
    name: string;
    ticker: string;
    price: number;
    history: { date: Timestamp; price: number }[];
    marketCap: number;
    volume: number;
}

export interface StudentStock {
    stockId: string;
    shares: number;
    avgBuyPrice: number;
}

export interface Fundraising {
    _docId: string;
    id: string;
    title: string;
    description: string;
    goal: number;
    currentAmount: number;
    imageUrl?: string;
    donors: { studentId: string; amount: number; date: Timestamp }[];
}

export interface Feedback {
    _docId: string;
    id: string;
    studentId: string;
    studentName: string;
    content: string;
    date: Timestamp;
    isRead: boolean;
    reply?: string;
}

export interface PlatformConfig {
    platformName: string;
    teacherPassword?: string;
    theme: {
        background: string;
        foreground: string;
        primary: string;
        primaryForeground: string;
        card: string;
        cardForeground: string;
        popover: string;
        popoverForeground: string;
        secondary: string;
        secondaryForeground: string;
        muted: string;
        mutedForeground: string;
        accent: string;
        accentForeground: string;
        destructive: string;
        destructiveForeground: string;
        border: string;
        input: string;
        ring: string;
        radius: string;
    },
    homeLinks: { title: string; url: string }[];
    dashboardCards: { title: string; content: string; icon: string }[];
    footerText: string;
    showBuKeXingQiu: boolean;
    feedback: Feedback[];
    logoUrl?: string;
}
