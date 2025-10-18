import type { Student, Teacher, Class, Reward, Stock } from "@/store/school-store";

export const mockClasses: Class[] = [
  { id: "class-1", name: "Grade 5 - Section A" },
  { id: "class-2", name: "Grade 5 - Section B" },
  { id: "class-3", name: "Grade 6 - Section A" },
];

export const mockTeachers: Teacher[] = [
  { id: "teacher-1", name: "Mr. Harrison" },
  { id: "teacher-2", name: "Ms. Davis" },
];

export const mockStudentData: Student[] = [
  {
    id: 'student-1',
    name: 'Alice Johnson',
    classId: 'class-1',
    points: 1250,
    assets: [
      { stockId: 'stock-1', quantity: 10, purchasePrice: 100 },
      { stockId: 'stock-2', quantity: 5, purchasePrice: 150 },
    ],
  },
  {
    id: 'student-2',
    name: 'Bob Williams',
    classId: 'class-1',
    points: 800,
    assets: [
      { stockId: 'stock-3', quantity: 20, purchasePrice: 20 },
    ],
  },
  {
    id: 'student-3',
    name: 'Charlie Brown',
    classId: 'class-2',
    points: 1500,
    assets: [
       { stockId: 'stock-1', quantity: 8, purchasePrice: 90 },
       { stockId: 'stock-4', quantity: 15, purchasePrice: 30 },
    ],
  },
];

export const mockRewards: Reward[] = [
    { id: 'reward-1', name: 'Homework Pass', cost: 500, stock: 10 },
    { id: 'reward-2', name: 'Extra 15min Recess', cost: 1000, stock: 5 },
    { id: 'reward-3', name: 'Sit at Teacher\'s Desk', cost: 2000, stock: 1 },
    { id: 'reward-4', name: 'Pizza Party Coupon', cost: 5000, stock: 2 },
];

export const mockStocks: Stock[] = [
    { id: 'stock-1', name: 'Tech Innovations Inc.', ticker: 'TII', price: 110.50, history: [100, 102, 105, 103, 110.50] },
    { id: 'stock-2', name: 'Green Energy Co.', ticker: 'GEC', price: 155.25, history: [150, 152, 148, 151, 155.25] },
    { id: 'stock-3', name: 'Future Foods', ticker: 'FFD', price: 22.75, history: [20, 21, 23, 22, 22.75] },
    { id: 'stock-4', name: 'Space Ventures', ticker: 'SPV', price: 35.00, history: [30, 32, 31, 33, 35.00] },
];
