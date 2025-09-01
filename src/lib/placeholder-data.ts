import type { Student, Reward, Stock, PortfolioItem } from "./types";

export const students: Student[] = [
  { id: "S001", name: "愛麗絲·強森", points: 1250, avatar: "https://picsum.photos/seed/alice/100", password: "password123" },
  { id: "S002", name: "鮑伯·威廉斯", points: 800, avatar: "https://picsum.photos/seed/bob/100", password: "password123" },
  { id: "S003", name: "查理·布朗", points: 1500, avatar: "https://picsum.photos/seed/charlie/100", password: "password123" },
];

export const rewards: Reward[] = [
  { id: 1, name: "作業通行證", description: "跳過一次作業。", cost: 500, image: "https://picsum.photos/seed/pass/600/400", stock: 10 },
  { id: 2, name: "披薩派對券", description: "在班級派對上獲得一片披薩。", cost: 250, image: "https://picsum.photos/seed/pizza/600/400", stock: 20 },
  { id: 3, name: "教室 VIP", description: "選擇一周的座位。", cost: 1000, image: "https://picsum.photos/seed/vip/600/400", stock: 5 },
  { id: 4, name: "老師的小幫手", description: "當一天老師的助理。", cost: 750, image: "https://picsum.photos/seed/assistant/600/400", stock: 8 },
  { id: 5, name: "額外點數", description: "總點數增加 100 點。", cost: 1000, image: "https://picsum.photos/seed/bonus/600/400", stock: 15 },
  { id: 6, name: "神秘盒子", description: "一個裝有驚喜獎勵的盒子！", cost: 1200, image: "https://picsum.photos/seed/mystery/600/400", stock: 3 },
];

export const stocks: Stock[] = [
    { ticker: "EDU", name: "學習公司", price: 150.75, change: 2.50, changePercent: 1.68, marketCap: "1.2兆" },
    { ticker: "BOOK", name: "閱讀公司", price: 89.20, change: -1.10, changePercent: -1.22, marketCap: "8000億" },
    { ticker: "SCI", name: "科學解決方案", price: 234.50, change: 5.60, changePercent: 2.45, marketCap: "2.1兆" },
    { ticker: "ART", name: "創意公司", price: 45.30, change: 0.25, changePercent: 0.55, marketCap: "3000億" },
    { ticker: "TECH", name: "創新有限責任公司", price: 550.00, change: -12.30, changePercent: -2.18, marketCap: "5.5兆" },
];

export const portfolio: PortfolioItem[] = [
    { ticker: "EDU", name: "學習公司", shares: 10, avgCost: 140.00, currentValue: 1507.50, totalGain: 107.50, totalGainPercent: 7.68 },
    { ticker: "SCI", name: "科學解決方案", shares: 5, avgCost: 220.00, currentValue: 1172.50, totalGain: 72.50, totalGainPercent: 6.59 },
    { ticker: "TECH", name: "創新有限責任公司", shares: 2, avgCost: 560.00, currentValue: 1100.00, totalGain: -20.00, totalGainPercent: -1.79 },
];
