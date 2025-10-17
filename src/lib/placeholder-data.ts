import type { Student, Reward, Stock, ClassInfo as Class, Teacher, Challenge, RedeemedRewardItem, StudentHabit } from "./types";

export const TEACHER_PASSWORD = "001"; // Shared password for all teachers for simplicity

export const classes: Class[] = [
    { id: "1A", name: "一年甲班", announcements: [] },
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
    { id: "uu", name: "黃雅娟護士", role: "subject_teacher", classIds: ["6A", "6B", "5A", "5B", "4A", "4B", "3A", "3B", "1A", "1B"], password: TEACHER_PASSWORD, pointBalance: 15000, sortOrder: 2 },
    { id: "teacher1A", name: "導師1A", role: "teacher", classIds: ["1A"], password: TEACHER_PASSWORD, pointBalance: 10000 },
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
  // Class 1A
  { id: "S001", name: "王大明", classId: "1A", points: 1200, avatar: "https://picsum.photos/seed/S001-1A/100", password: "1", portfolio: [], pointHistory: [], redeemedRewards: [] },
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


export const rewards: Reward[] = [
    { id: 'reward-1A-1', name: '小點心', description: '餅乾糖果', cost: 50, stock: 50, image: 'https://i.ibb.co/Ld2s022/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-1A-2', name: '免午休卡', description: '午休可以不用趴下，安靜做自己的事一次。', cost: 400, stock: 3, image: 'https://i.ibb.co/cNnsL0t/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-1A-3', name: '點歌卡', description: '早自修或午餐時間可點歌1首。', cost: 200, stock: 10, image: 'https://i.ibb.co/P9gbt2j/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-1A-4', name: '鉛筆', description: '一枝好用的鉛筆。', cost: 20, stock: 10, image: 'https://i.ibb.co/hH0sYnL/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-1A-5', name: '橡皮擦', description: '一塊好用的橡皮擦。', cost: 20, stock: 9, image: 'https://i.ibb.co/SXVx2H9/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-1A-6', name: '彩虹筆', description: '一枝彩虹筆。', cost: 40, stock: 5, image: 'https://i.ibb.co/NTb8KjD/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-1A-7', name: '點數輪盤', description: '輕鬆賺點數的好機會!但也可能得不償失,請謹慎使用。80→20%,90→25%,100→25%;120→11%,140→9%,160→7%,180→5%,200→3%', cost: 100, stock: 5, image: 'https://i.ibb.co/WcSzL26/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-1A-8', name: '口罩', description: '1個普通的口罩', cost: 5, stock: 50, image: 'https://i.ibb.co/2v2Hhng/image.png', scope: 'class', providerId: 'teacher1A' },
    { id: 'reward-school-1', name: '與校長共進午餐', description: '獲得一次與校長共進午餐的榮譽！', cost: 5000, stock: 1, image: 'https://picsum.photos/seed/principal-lunch/200', scope: 'school', providerId: 'school_admin' },
];

export const stocks: Stock[] = [
    { id: "ART", ticker: "ART", name: "創意公司", price: 77.8736190312441, change: 0.06600775319166985, changePercent: 0.08483457094677442, marketCap: "3000億" },
    { id: "BOOK", ticker: "BOOK", name: "閱讀公司", price: 342.966265843318, change: -1.8431795645573175, changePercent: -0.5345501955078461, marketCap: "8000億" },
    { id: "EDU", ticker: "EDU", name: "學習公司", price: 444.47281579873237, change: 3.306771862324979, changePercent: 0.7495526701963579, marketCap: "1.2兆" },
    { id: "SCI", ticker: "SCI", name: "科學解決方案", price: 553.6537686178709, change: -0.362525375174755, changePercent: -0.06543586878318522, marketCap: "2.1兆" },
    { id: "TECH", ticker: "TECH", name: "創新有限責任公司", price: 1105.0936452644073, change: 4.6620332314646475, changePercent: 0.42365497142089414, marketCap: "5.5兆" },
];

export const challenges: Challenge[] = [];
