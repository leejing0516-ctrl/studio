
import type { Student, Teacher, Class, Reward, Stock } from "@/store/school-store";

export const mockClasses: Class[] = [
  { id: "class-1", name: "五年甲班" },
  { id: "class-2", name: "五年乙班" },
  { id: "class-3", name: "六年甲班" },
];

export const mockTeachers: Teacher[] = [
  { id: "teacher-1", name: "王老師" },
  { id: "teacher-2", name: "李老師" },
];

export const mockStudentData: Student[] = [
  {
    id: 'S001',
    name: '陳小明',
    classId: 'class-1',
    points: 1250,
    assets: [
      { stockId: 'stock-1', quantity: 10, purchasePrice: 100 },
      { stockId: 'stock-2', quantity: 5, purchasePrice: 150 },
    ],
  },
  {
    id: 'S002',
    name: '林美麗',
    classId: 'class-1',
    points: 800,
    assets: [
      { stockId: 'stock-3', quantity: 20, purchasePrice: 20 },
    ],
  },
  {
    id: 'S003',
    name: '黃大為',
    classId: 'class-2',
    points: 1500,
    assets: [
       { stockId: 'stock-1', quantity: 8, purchasePrice: 90 },
       { stockId: 'stock-4', quantity: 15, purchasePrice: 30 },
    ],
  },
];

export const mockRewards: Reward[] = [
    { id: 'reward-1', name: '作業PASS券', cost: 500, stock: 10 },
    { id: 'reward-2', name: '額外下課15分鐘', cost: 1000, stock: 5 },
    { id: 'reward-3', name: '當一天老師的小幫手', cost: 2000, stock: 1 },
    { id: 'reward-4', name: '披薩派對兌換券', cost: 5000, stock: 2 },
];

export const mockStocks: Stock[] = [
    { id: 'stock-1', name: '科技創新公司', ticker: 'TII', price: 110.50, history: [100, 102, 105, 103, 110.50] },
    { id: 'stock-2', name: '綠色能源', ticker: 'GEC', price: 155.25, history: [150, 152, 148, 151, 155.25] },
    { id: 'stock-3', name: '未來食品', ticker: 'FFD', price: 22.75, history: [20, 21, 23, 22, 22.75] },
    { id: 'stock-4', name: '太空探索', ticker: 'SPV', price: 35.00, history: [30, 32, 31, 33, 35.00] },
];
