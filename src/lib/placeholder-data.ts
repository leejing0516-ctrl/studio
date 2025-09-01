import type { Student, Reward, Stock, PortfolioItem } from "./types";

export const students: Student[] = [
  { id: 1, name: "Alice Johnson", points: 1250, avatar: "https://picsum.photos/seed/alice/100" },
  { id: 2, name: "Bob Williams", points: 800, avatar: "https://picsum.photos/seed/bob/100" },
  { id: 3, name: "Charlie Brown", points: 1500, avatar: "https://picsum.photos/seed/charlie/100" },
  { id: 4, name: "Diana Miller", points: 950, avatar: "https://picsum.photos/seed/diana/100" },
  { id: 5, name: "Ethan Davis", points: 2000, avatar: "https://picsum.photos/seed/ethan/100" },
];

export const rewards: Reward[] = [
  { id: 1, name: "Homework Pass", description: "Skip one homework assignment.", cost: 500, image: "https://picsum.photos/seed/pass/600/400", stock: 10 },
  { id: 2, name: "Pizza Party Ticket", description: "Get a slice of pizza at the class party.", cost: 250, image: "https://picsum.photos/seed/pizza/600/400", stock: 20 },
  { id: 3, name: "Classroom VIP", description: "Choose your seat for a week.", cost: 1000, image: "https://picsum.photos/seed/vip/600/400", stock: 5 },
  { id: 4, name: "Teacher's Assistant", description: "Be the teacher's assistant for a day.", cost: 750, image: "https://picsum.photos/seed/assistant/600/400", stock: 8 },
  { id: 5, name: "Bonus Points", description: "Get 100 bonus points added to your total.", cost: 1000, image: "https://picsum.photos/seed/bonus/600/400", stock: 15 },
  { id: 6, name: "Mystery Box", description: "A box with a surprise reward inside!", cost: 1200, image: "https://picsum.photos/seed/mystery/600/400", stock: 3 },
];

export const stocks: Stock[] = [
    { ticker: "EDU", name: "Learn Corp.", price: 150.75, change: 2.50, changePercent: 1.68, marketCap: "1.2T" },
    { ticker: "BOOK", name: "Read Inc.", price: 89.20, change: -1.10, changePercent: -1.22, marketCap: "800B" },
    { ticker: "SCI", name: "Science Solutions", price: 234.50, change: 5.60, changePercent: 2.45, marketCap: "2.1T" },
    { ticker: "ART", name: "Creative Co.", price: 45.30, change: 0.25, changePercent: 0.55, marketCap: "300B" },
    { ticker: "TECH", name: "Innovate LLC", price: 550.00, change: -12.30, changePercent: -2.18, marketCap: "5.5T" },
];

export const portfolio: PortfolioItem[] = [
    { ticker: "EDU", name: "Learn Corp.", shares: 10, avgCost: 140.00, currentValue: 1507.50, totalGain: 107.50, totalGainPercent: 7.68 },
    { ticker: "SCI", name: "Science Solutions", shares: 5, avgCost: 220.00, currentValue: 1172.50, totalGain: 72.50, totalGainPercent: 6.59 },
    { ticker: "TECH", name: "Innovate LLC", shares: 2, avgCost: 560.00, currentValue: 1100.00, totalGain: -20.00, totalGainPercent: -1.79 },
];
