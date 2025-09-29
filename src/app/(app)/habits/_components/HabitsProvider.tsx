'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp, query } from 'firebase/firestore';
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
    habitCategoryData: { name: string; value: number }[];
    dailyProductivityData: { name: string; value: number }[];
    topHabitsByStreak: any[];
    topHabitsByTime: any[];
    monthlyCompletionData: { day: number; value: number }[];
    analyticsLoading: boolean;
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
    
    const timeLogsQuery = useMemo(
        () => (user ? query(collection(firestore, 'users', user.uid, 'timeLogs')) : null),
        [firestore, user]
    );
    const { data: timeLogs, isLoading: timeLogsLoading } = useCollection(timeLogsQuery);

    const analyticsLoading = habitsLoading || timeLogsLoading;

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

    const habitCategoryData = useMemo(() => {
        if (!timeLogs || !allHabits) return [];
        const habitLogs = timeLogs.filter((log) => log.referenceType === 'habit');
        const categoryTotals: Record<string, number> = {};

        habitLogs.forEach((log) => {
        const habit = allHabits.find((h) => h.id === log.referenceId);
        if (habit) {
            const category = habit.category || 'Sin Categoría';
            categoryTotals[category] = (categoryTotals[category] || 0) + log.durationSeconds;
        }
        });

        return Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value: Math.round(value / 60) }))
            .filter(item => item.value > 0);
    }, [timeLogs, allHabits]);

    const dailyProductivityData = useMemo(() => {
        if (!timeLogs) return [];
        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dailyTotals = Array(7).fill(0).map((_, i) => ({ name: daysOfWeek[i], value: 0}));

        timeLogs.forEach((log) => {
        const date = log.startTime.toDate();
        const dayIndex = date.getDay();
        dailyTotals[dayIndex].value += log.durationSeconds;
        });

        return dailyTotals.map(day => ({...day, value: Math.round(day.value / 60)}));
    }, [timeLogs]);
    
    const topHabitsByStreak = useMemo(() => {
        if (!allHabits) return [];
        return [...allHabits]
            .sort((a,b) => (b.longestStreak || 0) - (a.longestStreak || 0))
            .slice(0, 5)
            .map(h => ({ name: h.name, racha: h.longestStreak || 0 }));
    }, [allHabits]);

    const topHabitsByTime = useMemo(() => {
        if (!allHabits || !timeLogs) return [];
        const habitLogs = timeLogs.filter((log) => log.referenceType === 'habit');
        const timeTotals: Record<string, number> = {};

        habitLogs.forEach((log) => {
            const habit = allHabits.find(h => h.id === log.referenceId);
            if (habit) {
                 timeTotals[habit.name] = (timeTotals[habit.name] || 0) + log.durationSeconds;
            }
        });

        return Object.entries(timeTotals)
            .map(([name, time]) => ({ name, minutos: Math.round(time / 60) }))
            .sort((a, b) => b.minutos - a.minutos)
            .slice(0, 5);
    }, [allHabits, timeLogs]);
    
    const monthlyCompletionData = useMemo(() => {
        if (!allHabits) return [];
        
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyHabits = allHabits.filter(h => h.frequency === 'Diario');
        
        if (dailyHabits.length === 0) return [];
        
        const completionByDay: Record<number, {completed: number, total: number}> = {};

        allHabits.forEach(habit => {
            if (habit.lastCompletedAt) {
                const completedDate = habit.lastCompletedAt.toDate();
                if (completedDate.getFullYear() === year && completedDate.getMonth() === month) {
                    const dayOfMonth = completedDate.getDate();
                    if (!completionByDay[dayOfMonth]) {
                        completionByDay[dayOfMonth] = { completed: 0, total: dailyHabits.length};
                    }
                    completionByDay[dayOfMonth].completed += 1;
                }
            }
        });

        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const data = completionByDay[day];
            const value = data ? Math.round((data.completed / data.total) * 100) : 0;
            return { day, value };
        });

    }, [allHabits]);


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
        habitCategoryData,
        dailyProductivityData,
        topHabitsByStreak,
        topHabitsByTime,
        monthlyCompletionData,
        analyticsLoading,
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
