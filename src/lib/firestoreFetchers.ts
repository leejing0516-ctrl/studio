
import {
  collection, doc, getDoc, getDocs, query, where,
} from "firebase/firestore";
import { db } from "./firebase";
import { PlatformConfig, Student, Teacher, ClassInfo } from "./types";
import { students as placeholderStudents, teachers as placeholderTeachers, classes as placeholderClasses, stocks as placeholderStocks, rewards as placeholderRewards, challenges as placeholderChallenges } from './placeholder-data';


export async function fetchConfigMain(): Promise<PlatformConfig> {
  if (!db) {
    console.warn("Firestore is not initialized, falling back to placeholder config.");
    return { 
        id: 'main', 
        schoolFunds: 100000, 
        stocks: placeholderStocks, 
        rewards: placeholderRewards, 
        challenges: placeholderChallenges 
    } as PlatformConfig;
  }
  const snap = await getDoc(doc(db, "config", "main"));
  if (!snap.exists()) {
    console.warn("config/main not found in Firestore, returning default.");
    return { 
        id: 'main', 
        schoolFunds: 100000, 
        stocks: placeholderStocks, 
        rewards: placeholderRewards, 
        challenges: placeholderChallenges 
    } as PlatformConfig;
  }
  return { ...(snap.data() as PlatformConfig) };
}

export async function fetchAllStudents(): Promise<Student[]> {
  if (!db) {
    console.warn("Firestore is not initialized, falling back to placeholder students.");
    return placeholderStudents.map(s => ({...s, _docId: s.id}));
  }
  try {
    const col = collection(db, "students");
    const snap = await getDocs(col);
    if (snap.empty) {
      console.log("No students found in Firestore, using placeholder data.");
      return placeholderStudents.map(s => ({...s, _docId: s.id}));
    }
    return snap.docs.map(d => ({ ...d.data(), _docId: d.id } as Student));
  } catch (error) {
    console.error("Error fetching students from Firestore, falling back to placeholders:", error);
    return placeholderStudents.map(s => ({...s, _docId: s.id}));
  }
}

export async function fetchAllTeachers(): Promise<Teacher[]> {
   if (!db) {
    console.warn("Firestore is not initialized, falling back to placeholder teachers.");
    return placeholderTeachers.map(t => ({...t, _docId: t.id}));
  }
   try {
    const col = collection(db, "teachers");
    const snap = await getDocs(col);
    if (snap.empty) {
        console.log("No teachers found in Firestore, using placeholder data.");
        return placeholderTeachers.map(t => ({...t, _docId: t.id}));
    }
    return snap.docs.map(d => ({ ...d.data(), _docId: d.id } as Teacher));
  } catch (error) {
    console.error("Error fetching teachers from Firestore, falling back to placeholders:", error);
    return placeholderTeachers.map(t => ({...t, _docId: t.id}));
  }
}

export async function fetchAllClasses(): Promise<ClassInfo[]> {
   if (!db) {
    console.warn("Firestore is not initialized, falling back to placeholder classes.");
    return placeholderClasses.map(c => ({...c, _docId: c.id}));
  }
  try {
    const col = collection(db, "classes");
    const snap = await getDocs(col);
    if (snap.empty) {
        console.log("No classes found in Firestore, using placeholder data.");
        return placeholderClasses.map(c => ({...c, _docId: c.id}));
    }
    return snap.docs.map(d => ({ ...d.data(), _docId: d.id } as ClassInfo));
  } catch (error) {
     console.error("Error fetching classes from Firestore, falling back to placeholders:", error);
    return placeholderClasses.map(c => ({...c, _docId: c.id}));
  }
}


/** 一鍵同步：把所有遠端資料抓回來（不含 Storage 檔案） */
export async function syncAll() {
  const [config, students, teachers, classes] = await Promise.all([
    fetchConfigMain(),
    fetchAllStudents(),
    fetchAllTeachers(),
    fetchAllClasses(),
  ]);
  return { config, students, teachers, classes };
}
