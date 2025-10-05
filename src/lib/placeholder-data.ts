
import type { Student, Reward, Stock, Class, Teacher, Challenge, RedeemedRewardItem, StudentHabit } from "./types";

export const TEACHER_PASSWORD = "001"; // Shared password for all teachers for simplicity

export const classes: Class[] = [
    { id: "6A", name: "六年甲班", announcements: [] },
    { id: "6B", name: "六年乙班", announcements: [] },
    { id: "5A", name: "五年甲班", announcements: [] },
    { id: "5B", name: "五年乙班", announcements: [] },
    { id: "4A", name: "四年甲班", announcements: [] },
    { id: "4B", name: "四年乙班", announcements: [] },
    { id: "3A", name: "三年甲班", announcements: [] },
    { id: "3B", name: "三年乙班", announcements: [] },
];

export const teachers: Teacher[] = [
    { id: "principal", name: "李志軒校長", role: "admin", classIds: [], password: TEACHER_PASSWORD, pointBalance: 0, sortOrder: 1 },
    { id: "uu", name: "黃雅娟護士", role: "subject_teacher", classIds: ["6A", "6B", "5A", "5B", "4A", "4B", "3A", "3B"], password: TEACHER_PASSWORD, pointBalance: 15000, sortOrder: 2 },
    { id: "teacher6A", name: "高老師", role: "teacher", classIds: ["6A"], password: TEACHER_PASSWORD, pointBalance: 10000 },
    { id: "teacher6B", name: "李老師", role: "teacher", classIds: ["6B"], password: TEACHER_PASSWORD, pointBalance: 10000 },
    { id: "teacher5A", name: "王老師", role: "teacher", classIds: ["5A"], password: TEACHER_PASSWORD, pointBalance: 8000 },
    { id: "teacher5B", name: "陳老師", role: "teacher", classIds: ["5B"], password: TEACHER_PASSWORD, pointBalance: 8000 },
    { id: "teacher4A", name: "林老師", role: "teacher", classIds: ["4A"], password: TEACHER_PASSWORD, pointBalance: 5000 },
    { id: "teacherUnassigned", name: "吳老師", role: "teacher", classIds: [], password: TEACHER_PASSWORD, pointBalance: 0 },
    { id: "subjectTeacher1", name: "張老師", role: "subject_teacher", classIds: ["6A", "6B", "5A"], password: TEACHER_PASSWORD, pointBalance: 15000 },
];

export const students: Student[] = [
  // Class 6A
  { id: "S001", name: "陳囿嘉", classId: "6A", points: 1250, avatar: "https://picsum.photos/seed/S001/100", password: "001", portfolio: [
      { ticker: "EDU", name: "學習公司", shares: 10, avgCost: 140.00, lastPurchaseDate: "2023-10-26T10:00:00Z" },
      { ticker: "SCI", name: "科學解決方案", shares: 5, avgCost: 220.00, lastPurchaseDate: "2023-10-27T10:00:00Z" },
  ], pointHistory: [], redeemedRewards: [] },
  { id: "S002", name: "鮑伯·威廉斯", classId: "6A", points: 800, avatar: "https://picsum.photos/seed/S002/100", password: "001", portfolio: [
      { ticker: "TECH", name: "創新有限責任公司", shares: 2, avgCost: 560.00, lastPurchaseDate: "2023-10-28T10:00:00Z" },
  ], pointHistory: [], redeemedRewards: [] },
  // Class 6B
  { id: "S003", name: "查理·布朗", classId: "6B", points: 1500, avatar: "https://picsum.photos/seed/S003/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
];

export const rewards: Reward[] = [];

export const stocks: Stock[] = [
    { id: "EDU", ticker: "EDU", name: "學習公司", price: 150.75, change: 2.50, changePercent: 1.68, marketCap: "1.2兆" },
    { id: "BOOK", ticker: "BOOK", name: "閱讀公司", price: 89.20, change: -1.10, changePercent: -1.22, marketCap: "8000億" },
    { id: "SCI", ticker: "SCI", name: "科學解決方案", price: 234.50, change: 5.60, changePercent: 2.45, marketCap: "2.1兆" },
    { id: "ART", ticker: "ART", name: "創意公司", price: 45.30, change: 0.25, changePercent: 0.55, marketCap: "3000億" },
    { id: "TECH", ticker: "TECH", name: "創新有限責任公司", price: 550.00, change: -12.30, changePercent: -2.18, marketCap: "5.5兆" },
];

export const challenges: Challenge[] = [];
