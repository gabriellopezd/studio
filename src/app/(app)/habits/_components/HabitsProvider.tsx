'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { calculateStreak, isHabitCompletedToday, resetStreak } from '@/lib/habits';

interface Habit {
    id?: string;
    name: string;
    icon: string;
    frequency: string;
    category: string;
}

interface HabitsContextType {
    firestore: any;
    user: any;
    allHabits: any[] | null;
    habitsLoading: boolean;
    groupedHabits: { [key: string]: any[] };
    dailyHabits: any[];
    weeklyHabits: any[];
    completedDaily: number;
    completedWeekly: number;
    longestStreak: number;
    longestCurrentStreak: number;
    handleToggleHabit: (habitId: string) => void;
    handleCreateOrUpdateHabit: (habitData: Habit) => Promise<void>;
    handleDeleteHabit: (habitId: string) => Promise<void>;
    handleResetStreak: (habitId: string) => Promise<void>;
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export const HabitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();

    const habitsQuery = useMemo(
        () => (user ? collection(firestore, 'users', user.uid, 'habits') : null),
        [firestore, user]
    );
    const { data: allHabits, isLoading: habitsLoading } = useCollection(habitsQuery);

    const groupedHabits = useMemo(() => {
        if (!allHabits) return {};
        return allHabits.reduce((acc, habit) => {
            const category = habit.category || 'Sin Categoría';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(habit);
            return acc;
        }, {} as { [key: string]: any[] });
    }, [allHabits]);
    
    const { dailyHabits, weeklyHabits, completedDaily, completedWeekly } = useMemo(() => {
        if (!allHabits) return { dailyHabits: [], weeklyHabits: [], completedDaily: 0, completedWeekly: 0 };
        
        const daily = allHabits.filter(h => h.frequency === 'Diario');
        const weekly = allHabits.filter(h => h.frequency === 'Semanal');

        const completedD = daily.filter(h => isHabitCompletedToday(h)).length;
        const completedW = weekly.filter(h => isHabitCompletedToday(h)).length;

        return {
        dailyHabits: daily,
        weeklyHabits: weekly,
        completedDaily: completedD,
        completedWeekly: completedW
        };
    }, [allHabits]);

    const longestStreak = useMemo(() => allHabits?.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0) || 0, [allHabits]);
    const longestCurrentStreak = useMemo(() => allHabits?.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0) || 0, [allHabits]);


    const handleToggleHabit = (habitId: string) => {
        if (!user || !allHabits) return;

        const habit = allHabits.find((h) => h.id === habitId);
        if (!habit) return;

        const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);
        const isCompleted = isHabitCompletedToday(habit);

        if (isCompleted) {
            updateDocumentNonBlocking(habitRef, {
                lastCompletedAt: habit.previousLastCompletedAt ?? null,
                currentStreak: habit.previousStreak ?? 0,
                previousStreak: null,
                previousLastCompletedAt: null,
            });
        } else {
            const streakData = calculateStreak(habit);
            updateDocumentNonBlocking(habitRef, {
                lastCompletedAt: Timestamp.fromDate(new Date()),
                ...streakData,
                previousStreak: habit.currentStreak || 0,
                previousLastCompletedAt: habit.lastCompletedAt ?? null,
            });
        }
    };

    const handleCreateOrUpdateHabit = async (habitData: Habit) => {
        if (!habitData.name.trim() || !habitData.icon.trim() || !user || !habitData.category) return;

        const { id, ...data } = habitData;

        if (id) {
            const habitRef = doc(firestore, 'users', user.uid, 'habits', id);
            await updateDocumentNonBlocking(habitRef, data);
        } else {
            const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
            await addDocumentNonBlocking(habitsColRef, {
                ...data,
                currentStreak: 0,
                longestStreak: 0,
                createdAt: serverTimestamp(),
                lastCompletedAt: null,
                userId: user.uid,
            });
        }
    };

    const handleDeleteHabit = async (habitId: string) => {
        if (!user) return;
        const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);
        await deleteDocumentNonBlocking(habitRef);
    };

    const handleResetStreak = async (habitId: string) => {
        if (!user) return;
        const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);
        await updateDocumentNonBlocking(habitRef, resetStreak());
    };


    const value = {
        firestore,
        user,
        allHabits,
        habitsLoading,
        groupedHabits,
        dailyHabits,
        weeklyHabits,
        completedDaily,
        completedWeekly,
        longestStreak,
        longestCurrentStreak,
        handleToggleHabit,
        handleCreateOrUpdateHabit,
        handleDeleteHabit,
        handleResetStreak
    };

    return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
};

export const useHabits = () => {
    const context = useContext(HabitsContext);
    if (context === undefined) {
        throw new Error('useHabits must be used within a HabitsProvider');
    }
    return context;
};
