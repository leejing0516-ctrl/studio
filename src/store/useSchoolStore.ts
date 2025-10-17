import { create } from "zustand";
import { ConfigMain, Student, Teacher, ClassInfo } from "@/lib/types";

type SchoolState = {
  loading: boolean;
  config?: ConfigMain;
  students: Student[];
  teachers: Teacher[];
  classes: ClassInfo[];
  setLoading: (v: boolean) => void;
  setConfig: (v: ConfigMain) => void;
  setStudents: (v: Student[]) => void;
  setTeachers: (v: Teacher[]) => void;
  setClasses: (v: ClassInfo[]) => void;
  reset: () => void;
};

export const useSchoolStore = create<SchoolState>((set) => ({
  loading: true, // Start with loading: true
  config: undefined,
  students: [],
  teachers: [],
  classes: [],
  setLoading: (v) => set({ loading: v }),
  setConfig: (v) => set({ config: v }),
  setStudents: (v) => set({ students: v }),
  setTeachers: (v) => set({ teachers: v }),
  setClasses: (v) => set({ classes: v }),
  reset: () => set({
    loading: false, config: undefined, students: [], teachers: [], classes: [],
  }),
}));
