export type Student = {
  id: string;
  name: string;
  points: number;
  avatar: string;
  password?: string;
};

export type Reward = {
  id: number;
  name: string;
  description: string;
  cost: number;
  image: string;
  stock: number;
};

export type Stock = {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
};

export type PortfolioItem = {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentValue: number;
  totalGain: number;
  totalGainPercent: number;
};
