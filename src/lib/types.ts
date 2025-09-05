

export type RedeemedRewardItem = {
  redemptionId: string; // A unique ID for this specific instance of the reward
  reward: Reward;
  status: 'collected' | 'pending_use';
};

export type PointRecord = {
    points: number;
    date: string; // ISO date string of when the points were awarded
}

export type Loan = {
  id: string;
  amount: number;
  reason: string;
  requestDate: string; // ISO date string
  repaymentDate: string; // ISO date string
  status: 'pending' | 'active' | 'repaid' | 'rejected' | 'overdue';
  interest: number;
  approvalDate?: string; // ISO date string, set when loan is approved
  lastInterestAccruedDate?: string; // ISO date string, last time interest was calculated
}

export type Student = {
  id: string; // Student ID within the class
  name: string;
  classId: string; // Links to the Class object
  points: number;
  avatar: string;
  password?: string;
  portfolio: PortfolioItem[];
  redeemedRewards: RedeemedRewardItem[];
  loans: Loan[];
  pointHistory: PointRecord[];
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

export type Class = {
    id: string;
    name: string;
}

export type Teacher = {
    id: string;
    name: string;
    role: 'teacher' | 'admin'; // admin is the principal
    classId?: string | null; // classId for teachers, null for unassigned, undefined for admin
    password?: string; 
}

export type PlatformConfig = {
    id: 'main';
    schoolFunds?: number;
    platformLogoUrl?: string;
    sponsorLogoUrls?: (string | null)[];
    teacherPassword?: string;
}
