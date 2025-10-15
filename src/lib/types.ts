
export type Feedback = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  message: string;
  date: string; // ISO date string
  isRead: boolean;
};

export type Donation = {
  studentId: string;
  studentName: string;
  classId: string;
  amount: number;
  date: string; // ISO date string
};

export type FundraisingProject = {
  id: string;
  _docId?: string;
  title: string;
  description: string;
  image: string;
  goal: number;
  currentAmount: number;
  status: 'active' | 'completed';
  creatorId: string; // Should be 'school_admin'
  donations: Donation[];
  deadline: string; // ISO date string
};

export type RedeemedRewardItem = {
  redemptionId: string; // A unique ID for this specific instance of the reward
  reward: Reward;
  status: 'collected' | 'pending_use' | 'used';
  redemptionDate: string; // ISO date string
};

export type PointRecord = {
    points: number;
    date: string; // ISO date string of when the points were awarded
    reason: string;
    teacherId?: string; // ID of the teacher who performed the action
}

export type FixedDeposit = {
  id: string;
  amount: number;
  startDate: string; // ISO date string
  maturityDate: string; // ISO date string
  status: 'active' | 'matured';
  interestRate: number; // The daily rate at the time of deposit
  interestEarned: number;
};

export type Loan = {
  id: string;
  amount: number;
  reason: string;
  requestDate: string; // ISO date string
  repaymentDate: string; // ISO date string
  status: 'pending' | 'active' | 'repaid' | 'rejected' | 'overdue';
  interest: number;
  interestRate: number; // The daily rate for this loan
  approvalDate?: string; // ISO date string, set when loan is approved
  approverId?: string; // ID of the teacher/admin who approved the loan
  lastInterestAccruedDate?: string; // ISO date string, last time interest was calculated
}

export type StudentChallenge = {
    challengeId: string;
    status: 'in_progress' | 'pending_approval' | 'completed';
    acceptedDate: string; // ISO date string
    completedDate?: string; // ISO date string
};

export type HabitCheckIn = {
  date: string; // ISO date string of the check-in
  note?: string;
};

export type StudentHabit = {
  id: string;
  title: string;
  description: string;
  status: 'pending_approval' | 'active' | 'completed' | 'rejected';
  requestDate: string; // ISO date string
  approvalDate?: string; // ISO date string
  rejectionReason?: string; // If rejected
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  points: number; // Set by teacher
  checkIns: HabitCheckIn[]; // Array of check-in records
};

export type AvatarCustomization = {
    body: string;
    eyes: string;
    mouth: string;
    hair: string;
    accessory: string;
    background: string;
}

export type Student = {
  id: string;
  _docId?: string;
  name: string;
  classId: string;
  password?: string;
  points: number;
  pointHistory: PointRecord[];
  portfolio: PortfolioItem[];
  redeemedRewards: RedeemedRewardItem[];
  loans?: Loan[];
  fixedDeposits?: FixedDeposit[];
  challenges?: StudentChallenge[];
  habits?: StudentHabit[];
  lastAnnouncementsView?: string;
  lastPointHistoryView?: string;
  lastDailyReward?: string; // YYYY-MM-DD
  readingEnergy?: number;
  buKeMonth?: number;
  buKeEnergyThisMonth?: number;
  buKeBooksThisMonth?: number;
  buKeLevel?: number;
  buKeTotalEnergy?: number;
  buKeTotalBooks?: number;
  [k: string]: any;
};

export type Reward = {
  id: string;
  _docId?: string;
  name: string;
  description: string;
  cost: number;
  image: string;
  stock: number;
  scope: 'school' | 'class';
  providerId: string; // 'school_admin' or teacher's id
};

export type Challenge = {
  id:string;
  _docId?: string;
  name:string;
  description: string;
  points: number;
  scope: 'school' | 'class';
  providerId: string; // 'school_admin' or teacher's id
};

export type PortfolioItem = {
    ticker: string;
    name: string;
    shares: number;
    avgCost: number;
    lastPurchaseDate?: string; // ISO date string
}

export type Stock = {
  id: string; // Ticker is the ID
  _docId?: string;
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
};

export type ClassGroup = {
    id: string;
    name: string;
}

export type ClassInfo = {
  id: string;
  _docId?: string;
  name: string;
  announcements?: Announcement[];
  groups?: {
    [teacherId: string]: ClassGroup[];
  }
  [k: string]: any;
};

export type Teacher = {
  id: string;
  _docId?: string;
  name: string;
  role: "admin" | "teacher" | "subject_teacher" | string;
  password?: string;
  classIds: string[];
  pointBalance: number;
  [k: string]: any;
};

export type Announcement = {
    id: string;
    title: string;
    content: string;
    date: string; // ISO date string
    teacherId: string;
    teacherName: string;
};

export type PetStage = {
  level: number;
  name: string;
  image: string;
  description: string;
  pointsRequired: number;
  aiHint: string;
};

export type CustomTheme = {
  [key: string]: string;
};

export type DashboardCardConfig = {
  totalPoints: { title: string; description: string; backgroundColor: string; textColor: string; };
  portfolioValue: { title: string; description: string; backgroundColor: string; textColor: string; };
  fixedDeposits: { title: string; description: string; backgroundColor: string; textColor: string; };
  totalAssets: { title: string; description: string; backgroundColor: string; textColor: string; };
  classRank: { title: string; description: string; backgroundColor: string; textColor: string; };
  schoolRank: { title: string; description: string; backgroundColor: string; textColor: string; };
  myGroups: { title: string; description: string; backgroundColor: string; textColor: string; };
  buKeXingQiu: { title: string; description: string; backgroundColor: string; textColor: string; };
  myPet: { title: string; description: string; backgroundColor: string; textColor: string; };
  pointsTrend: { title: string; description: string; backgroundColor: string; textColor: string; };
  cardTitleSize: string;
  cardValueSize: string;
  cardDescriptionSize: string;
}

export type PlatformConfig = {
  id: 'main';
  schoolFunds: number;
  fixedDepositInterestRate: number;
  loanInterestRate: number;
  rewards: Reward[];
  challenges: Challenge[];
  stocks: Stock[];
  announcements: Announcement[];
  stockMarketNews: Announcement[];
  stockMarqueeMessages: string[];
  petStages: PetStage[];
  feedback: Feedback[];
  fundraisingProjects: FundraisingProject[];
  homeTitle: string;
  homeSubtitle: string;
  homeIllustrationUrl: string;
  logoUrl: string;
  appIconUrl: string;
  sponsorLogoUrls: string[];
  teacherPassword?: string;
  theme?: string;
  customTheme?: CustomTheme;
  customThemes?: Theme[];
  marketOpenHour?: number;
  marketCloseHour?: number;
  dashboardCards?: DashboardCardConfig;
  buKeXingQiuDescription?: string;
  dailyRewardJackpotChance?: number;
  dailyRewardJackpotMin?: number;
  dailyRewardJackpotMax?: number;
  dailyRewardStandardChance?: number;
  dailyRewardStandardMin?: number;
  dailyRewardStandardMax?: number;
  [k: string]: any;
};

export type ConfigMain = PlatformConfig;
