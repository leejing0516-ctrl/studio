export type RedeemedRewardItem = {
  redemptionId: string; // A unique ID for this specific instance of the reward
  reward: Reward;
  status: 'collected' | 'pending_use';
};

export type Student = {
  id: string;
  name: string;
  points: number;
  avatar: string;
  password?: string;
  portfolio: PortfolioItem[];
  redeemedRewards: RedeemedRewardItem[];
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
};
