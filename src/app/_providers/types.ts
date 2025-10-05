
'use client';

import type { User } from 'firebase/auth';

export interface Habit {
    id: string;
    name: string;
    icon: string;
    frequency: string;
    category: string;
    currentStreak: number;
    longestStreak: number;
    lastCompletedAt: any;
    previousStreak?: number;
    previousLongestStreak?: number;
    previousLastCompletedAt?: any | null;
    lastTimeLogId?: string | null;
    isActive: boolean;
    presetHabitId?: string | null;
}

export interface Task {
    id?: string;
    name: string;
    dueDate?: Date;
    priority: string;
    category: string;
    completionDate?: Date | null;
}

export interface Mood {
    moodLevel: number;
    moodLabel: string;
    emoji: string;
    feelings: string[];
    influences: string[];
    date?: Date;
}

export interface ActiveSession {
    id: string;
    name: string;
    type: 'habit' | 'task';
    startTime: number;
}
