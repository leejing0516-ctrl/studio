
import {
  collection, doc, getDoc, getDocs, query, where,
} from "firebase/firestore";
import { db } from "./firebase";
import { ConfigMain, Student, Teacher, ClassInfo } from "./types";

export async function fetchConfigMain(): Promise<ConfigMain> {
  const snap = await getDoc(doc(db, "config", "main"));
  if (!snap.exists()) throw new Error("config/main 不存在");
  return { ...(snap.data() as ConfigMain) };
}

export async function fetchAllStudents(): Promise<Student[]> {
  const col = collection(db, "students");
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Student, "id">) }));
}

export async function fetchStudentsByClass(classId: string): Promise<Student[]> {
  const q = query(collection(db, "students"), where("classId", "==", classId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Student, "id">) }));
}

export async function fetchAllTeachers(): Promise<Teacher[]> {
  const col = collection(db, "teachers");
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Teacher, "id">) }));
}

export async function fetchAllClasses(): Promise<ClassInfo[]> {
  const col = collection(db, "classes");
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ClassInfo, "id">) }));
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
