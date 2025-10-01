
import type { Student, Reward, Stock, Class, Teacher, Challenge, RedeemedRewardItem, StudentHabit } from "./types";

export const TEACHER_PASSWORD = "001"; // Shared password for all teachers for simplicity

export const classes: Class[] = [
    { id: "6A", name: "六年甲班", announcements: [] },
    { id: "6B", name: "六年乙班", announcements: [] },
    { id: "5A", name: "五年甲班", announcements: [] },
    { id: "5B", name: "五年乙班", announcements: [] },
    { id: "4A", name: "四年甲班", announcements: [] },
    { id: "4B", "name": "四年乙班", announcements: [] },
    { id: "3A", "name": "三年甲班", announcements: [] },
    { id: "3B", "name": "三年乙班", announcements: [] },
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
  { id: "S004", name: "黛安娜·普林斯", classId: "6B", points: 2500, avatar: "https://picsum.photos/seed/S004/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
   // Class 5A
  { id: "S005", name: "伊森·韓特", classId: "5A", points: 950, avatar: "https://picsum.photos/seed/S005/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
   // Class 4A
  { id: "1", name: "同學1", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-1/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "2", name: "同學2", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-2/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "3", name: "同學3", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-3/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "4", name: "同學4", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-4/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "5", name: "同學5", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-5/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "6", name: "同學6", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-6/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "7", name: "同學7", classId: "4A", points: 96, avatar: "https://picsum.photos/seed/4A-7/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "8", name: "同學8", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-8/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "9", name: "同學9", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-9/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "10", name: "同學10", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-10/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "11", name: "同學11", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-11/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "12", name: "同學12", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-12/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "13", name: "同學13", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-13/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "14", name: "同學14", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-14/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "15", name: "同學15", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-15/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "16", name: "同學16", classId: "4A", points: 96, avatar: "https://picsum.photos/seed/4A-16/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "17", name: "同學17", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-17/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "18", name: "同學18", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-18/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "19", name: "同學19", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-19/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "20", name: "同學20", classId: "4A", points: 100, avatar: "https://picsum.photos/seed/4A-20/100", password: "001", portfolio: [], pointHistory: [], redeemedRewards: [] },
];

export const rewards: Reward[] = [];

export const stocks: Stock[] = [
    { ticker: "EDU", name: "學習公司", price: 150.75, change: 2.50, changePercent: 1.68, marketCap: "1.2兆" },
    { ticker: "BOOK", name: "閱讀公司", price: 89.20, change: -1.10, changePercent: -1.22, marketCap: "8000億" },
    { ticker: "SCI", name: "科學解決方案", price: 234.50, change: 5.60, changePercent: 2.45, marketCap: "2.1兆" },
    { ticker: "ART", name: "創意公司", price: 45.30, change: 0.25, changePercent: 0.55, marketCap: "3000億" },
    { ticker: "TECH", name: "創新有限責任公司", price: 550.00, change: -12.30, changePercent: -2.18, marketCap: "5.5兆" },
];

export const challenges: Challenge[] = [];

    
