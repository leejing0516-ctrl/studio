
export interface StudentAsset {
  stockId: string;
  quantity: number;
  purchasePrice: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  points: number;
  assets: StudentAsset[];
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Class {
  id: string;
  name: string;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  stock: number;
}

export interface Stock {
  id: string;
  name: string;
  ticker: string;
  price: number;
  history: number[];
}
