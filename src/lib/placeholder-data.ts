

import type { Student, Reward, Stock, Class, Teacher, Challenge, RedeemedRewardItem, StudentHabit } from "./types";

export const TEACHER_PASSWORD = "001"; // Shared password for all teachers for simplicity

export const classes: Class[] = [
    { id: "1B", name: "一年乙班", announcements: [] },
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
    { id: "uu", name: "黃雅娟護士", role: "subject_teacher", classIds: ["6A", "6B", "5A", "5B", "4A", "4B", "3A", "3B", "1B"], password: TEACHER_PASSWORD, pointBalance: 15000, sortOrder: 2 },
    { id: "teacher1B", name: "導師1B", role: "teacher", classIds: ["1B"], password: TEACHER_PASSWORD, pointBalance: 10000 },
    { id: "teacher6A", name: "高老師", role: "teacher", classIds: ["6A"], password: TEACHER_PASSWORD, pointBalance: 10000 },
    { id: "teacher6B", name: "李老師", role: "teacher", classIds: ["6B"], password: TEACHER_PASSWORD, pointBalance: 10000 },
    { id: "teacher5A", name: "王老師", role: "teacher", classIds: ["5A"], password: TEACHER_PASSWORD, pointBalance: 8000 },
    { id: "teacher5B", name: "陳老師", role: "teacher", classIds: ["5B"], password: TEACHER_PASSWORD, pointBalance: 8000 },
    { id: "teacher4A", name: "林老師", role: "teacher", classIds: ["4A"], password: TEACHER_PASSWORD, pointBalance: 5000 },
    { id: "teacherUnassigned", name: "吳老師", role: "teacher", classIds: [], password: TEACHER_PASSWORD, pointBalance: 0 },
    { id: "subjectTeacher1", name: "張老師", role: "subject_teacher", classIds: ["6A", "6B", "5A"], password: TEACHER_PASSWORD, pointBalance: 15000 },
];

export const students: Student[] = [
  // Class 1B
  { id: "S001", name: "陳容德", classId: "1B", points: 600, avatar: "https://picsum.photos/seed/S001/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S002", name: "方崇恩", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S002/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S003", name: "林桐佑", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S003/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S004", name: "盧宥宇", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S004/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S005", name: "吳義塏", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S005/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S006", name: "蘇品祐", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S006/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S007", name: "阮經言", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S007/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S008", name: "王楨之", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S008/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S009", name: "李瑄然", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S009/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S010", name: "張荷曼", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S010/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S011", name: "楊亘昀", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S011/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S012", name: "顏瑋珺", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S012/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S013", name: "李宇蕎", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S013/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S014", name: "徐偌晨", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S014/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
  { id: "S015", name: "羅羿晴", classId: "1B", points: 100, avatar: "https://picsum.photos/seed/S015/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
];


export const rewards: Reward[] = [];

export const stocks: Stock[] = [
    { id: "ART", ticker: "ART", name: "創意公司", price: 78, change: 0, changePercent: 0, marketCap: "3000億" },
    { id: "BOOK", ticker: "BOOK", name: "閱讀公司", price: 343, change: 0, changePercent: 0, marketCap: "8000億" },
    { id: "EDU", ticker: "EDU", name: "學習公司", price: 444, change: 0, changePercent: 0, marketCap: "1.2兆" },
    { id: "SCI", ticker: "SCI", name: "科學解決方案", price: 554, change: 0, changePercent: 0, marketCap: "2.1兆" },
    { id: "TECH", ticker: "TECH", name: "創新有限責任公司", price: 1105, change: 0, changePercent: 0, marketCap: "5.5兆" },
];

export const challenges: Challenge[] = [];

    
