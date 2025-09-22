
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
    { id: "principal", name: "李志軒校長", role: "admin", classIds: [], password: TEACHER_PASSWORD, pointBalance: 0 },
    { id: "s-nurse1", name: "健康中心護理師", role: "subject_teacher", classIds: ["6A", "6B", "5A", "5B", "4A", "4B", "3A", "3B"], password: TEACHER_PASSWORD, pointBalance: 15000 },
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
  { id: "S001", name: "陳囿嘉", classId: "6A", points: 1250, avatar: "https://picsum.photos/seed/alice/100", password: "001", portfolio: [
      { ticker: "EDU", name: "學習公司", shares: 10, avgCost: 140.00 },
      { ticker: "SCI", name: "科學解決方案", shares: 5, avgCost: 220.00 },
  ], pointHistory: [] },
  { id: "S002", name: "鮑伯·威廉斯", classId: "6A", points: 800, avatar: "https://picsum.photos/seed/bob/100", password: "001", portfolio: [
      { ticker: "TECH", name: "創新有限責任公司", shares: 2, avgCost: 560.00 },
  ], pointHistory: [] },
  // Class 6B
  { id: "S003", name: "查理·布朗", classId: "6B", points: 1500, avatar: "https://picsum.photos/seed/charlie/100", password: "001", portfolio: [], pointHistory: [] },
  { id: "S004", name: "黛安娜·普林斯", classId: "6B", points: 2500, avatar: "https://picsum.photos/seed/diana/100", password: "001", portfolio: [], pointHistory: [] },
   // Class 5A
  { id: "S005", name: "伊森·韓特", classId: "5A", points: 950, avatar: "https://picsum.photos/seed/ethan/100", password: "001", portfolio: [], pointHistory: [] },
];

export const rewards: Reward[] = [];

export const stocks: Stock[] = [
    { ticker: "EDU", name: "學習公司", price: 150.75, change: 2.50, changePercent: 1.68, marketCap: "1.2兆" },
    { ticker: "BOOK", name: "閱讀公司", price: 89.20, change: -1.10, changePercent: -1.22, marketCap: "8000億" },
    { ticker: "SCI", name: "科學解決方案", price: 234.50, change: 5.60, changePercent: 2.45, marketCap: "2.1兆" },
    { ticker: "ART", name: "創意公司", price: 45.30, change: 0.25, changePercent: 0.55, marketCap: "3000億" },
    { ticker: "TECH", name: "創新有限責任公司", price: 550.00, change: -12.30, changePercent: -2.18, marketCap: "5.5兆" },
];

export const challenges: Challenge[] = [
    { id: 'challenge-1', name: '閱讀冠軍', description: '一個月內閱讀 5 本書並撰寫心得。', points: 500, scope: 'school', providerId: 'school_admin' },
    { id: 'challenge-2', name: '數學達人', description: '完成 10 份數學練習卷並達到 90% 正確率。', points: 300, scope: 'class', providerId: 'teacher6A' },
    { id: 'challenge-3', name: '小小科學家', description: '完成一項科學實驗並提交報告。', points: 400, scope: 'class', providerId: 'teacher6A' },
];
