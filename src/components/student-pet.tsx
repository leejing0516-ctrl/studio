
"use client";

import { useMemo } from 'react';
import Image from 'next/image';
import type { Student, PetAttributes } from '@/lib/types';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from './ui/card';

const attributeMapping: { key: keyof PetAttributes; label: string }[] = [
  { key: 'grit', label: '堅毅' },
  { key: 'socialIntelligence', label: '社交' },
  { key: 'gratitude', label: '感恩' },
  { key: 'optimism', label: '樂觀' },
  { key: 'curiosity', label: '好奇' },
  { key: 'selfControl', label: '自制' },
  { key: 'passion', label: '熱情' },
];

const StudentPet = ({ student }: { student: Student }) => {
  const petData = useMemo(() => {
    if (!student.petAttributes) return [];
    
    return attributeMapping.map(attr => ({
      subject: attr.label,
      value: student.petAttributes[attr.key] ?? 0,
      fullMark: 100, // Assuming a max value of 100 for radar chart scaling
    }));
  }, [student.petAttributes]);

  const highestAttribute = useMemo(() => {
    if (!student.petAttributes) return null;

    let maxVal = -1;
    let maxAttr: string | null = null;

    for (const attr of attributeMapping) {
      const value = student.petAttributes[attr.key] ?? 0;
      if (value > maxVal) {
        maxVal = value;
        maxAttr = attr.label;
      }
    }
    
    if (maxVal === 0) {
      return "均衡發展中";
    }

    return maxAttr;
  }, [student.petAttributes]);


  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={petData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 14 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name={student.name} dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="text-xl font-bold text-primary">寵物品格雷達</h3>
        <p className="text-sm text-muted-foreground">
          你最強的品格特質是：<span className="font-semibold">{highestAttribute}</span>
        </p>
      </div>
    </div>
  );
};

export default StudentPet;
