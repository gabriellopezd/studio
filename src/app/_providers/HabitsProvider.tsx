'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from 'react';
import { collection, doc, query, Timestamp, serverTimestamp, writeBatch, where, getDocs } from 'firebase/firestore';
import { useFirebase, useCollectionData, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { isHabitCompletedToday, calculateStreak, checkHabitStreak, resetStreak } from '@/lib/habits';
import { useToast } from '@/hooks/use-toast';
import { useUI } from './UIProvider';
import { PresetHabits } from '@/lib/preset-habits';
import type { Habit } from './types';

interface HabitsContextState {
    allHabits: Habit[] | null;
    habitsLoading: boolean;
    presetHabits: any[] | null;
    presetHabitsLoading: boolean;
    routines: any[] | null;
    routinesLoading: boolean;
    
    // Derived state
    analyticsLoading: boolean;
    groupedHabits: { [key: string]: Habit[] };
    dailyHabits: Habit[];
    weeklyHabits: Habit[];
    completedDaily: number;
    completedWeekly: number;
    longestStreak: number;
    topLongestStreakHabits: string[];
    longestCurrentStreak: number;
    topCurrentStreakHabits: string[];
    habitCategoryData: { name: string, value: number }[];
    topHabitsByStreak: { name: string, racha: number }[];
    topHabitsByTime: { name: string, minutos: number }[];
    monthlyCompletionData: { day: number, value: number }[];
    routineTimeAnalytics: { name: string, minutos: number }[];
    routineCompletionAnalytics: { name: string, completionRate: number }[];

    // Actions
    handleToggleHabit: (habitId: string) => void;
    handleSaveHabit: () => Promise<void>;
    handleDeleteHabit: () => Promise<void>;
    handleResetAllStreaks: () => Promise<void>;
    handleResetHabitStreak: () => Promise<void>;
    handleResetTimeLogs: () => Promise<void>;
    handleResetMoods: () => Promise<void>;
    handleSaveRoutine: () => Promise<void>;
    handleDeleteRoutine: () => Promise<void>;
    handleCompleteRoutine: (routine: any) => Promise<void>;
}

const HabitsContext = createContext<HabitsContextState | undefined>(undefined);

export const useHabits = () => {
    const context = useContext(HabitsContext);
    if (!context) {
        throw new Error('useHabits must be used within a HabitsProvider');
    }
    return context;
};

export const HabitsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const { formState, handleCloseModal } = useUI();
    const { toast } = useToast();
    const [streaksChecked, setStreaksChecked] = useState(false);

    // --- Data Fetching ---
    const allHabitsQuery = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/habits`);
    }, [user, firestore]);
    const { data: allHabits, isLoading: habitsLoading } = useCollectionData<Habit>(allHabitsQuery);

    const routinesQuery = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/routines`);
    }, [user, firestore]);
    const { data: routines, isLoading: routinesLoading } = useCollectionData(routinesQuery);
    
    const timeLogsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return query(collection(firestore, `users/${user.uid}/timeLogs`), where("createdAt", ">=", thirtyDaysAgo));
    }, [user, firestore]);
    const { data: timeLogs, isLoading: timeLogsLoading } = useCollectionData(timeLogsQuery);

    // --- Streak Checking ---
    useEffect(() => {
        if (user && firestore && allHabits && !habitsLoading && !streaksChecked) {
            const batch = writeBatch(firestore);
            let updatesMade = false;
            allHabits.forEach(habit => {
                const streakUpdate = checkHabitStreak(habit);
                if (streakUpdate) {
                    batch.update(doc(firestore, 'users', user.uid, 'habits', habit.id), streakUpdate);
                    updatesMade = true;
                }
            });
            if (updatesMade) batch.commit().catch(console.error);
            setStreaksChecked(true);
        }
    }, [user, firestore, allHabits, habitsLoading, streaksChecked]);

    // --- Actions ---
    const handleToggleHabit = (habitId: string) => {
        if (!user || !allHabits || !firestore) return;
        const habit = allHabits.find((h) => h.id === habitId);
        if (!habit) return;
        
        const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);
        if (isHabitCompletedToday(habit)) {
             const batch = writeBatch(firestore);
             batch.update(habitRef, { lastCompletedAt: habit.previousLastCompletedAt ?? null, currentStreak: habit.previousStreak ?? 0, longestStreak: habit.previousLongestStreak ?? habit.longestStreak ?? 0, lastTimeLogId: null });
             if (habit.lastTimeLogId) batch.delete(doc(firestore, 'users', user.uid, 'timeLogs', habit.lastTimeLogId));
             batch.commit();
        } else {
            const streakData = calculateStreak(habit);
            updateDocumentNonBlocking(habitRef, { lastCompletedAt: Timestamp.now(), ...streakData, previousStreak: habit.currentStreak || 0, previousLongestStreak: habit.longestStreak || 0, previousLastCompletedAt: habit.lastCompletedAt ?? null });
        }
    };

    const handleSaveHabit = async () => {
        if (!formState.name?.trim() || !formState.icon?.trim() || !user || !formState.category || !firestore) return;
        const { id, ...data } = formState;
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', id), data);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'habits'), { ...data, currentStreak: 0, longestStreak: 0, createdAt: serverTimestamp(), lastCompletedAt: null, userId: user.uid, isActive: true });
        }
        handleCloseModal('habit');
    };

    const handleDeleteHabit = async () => {
        if (!formState?.id || !user || !firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', formState.id));
        handleCloseModal('deleteHabit');
    };
    
    const handleResetAllStreaks = async () => {
        if (!user || !firestore || !allHabits) return;
        try {
            const batch = writeBatch(firestore);
            allHabits.forEach((habit) => {
                batch.update(doc(firestore, 'users', user.uid, 'habits', habit.id), resetStreak());
            });
            await batch.commit();
            toast({ title: 'Rachas reiniciadas' });
        } catch (error) {
            console.error("Error resetting streaks:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron reiniciar las rachas.' });
        }
        handleCloseModal('resetStreaks');
    };
    
    const handleResetHabitStreak = async () => {
        if (!formState?.id || !user || !firestore) return;
        await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', formState.id), resetStreak());
        handleCloseModal('resetHabit');
    };

    const handleResetTimeLogs = async () => {
        if (!user || !firestore || !timeLogs) return;
        try {
            const batch = writeBatch(firestore);
            timeLogs.forEach(log => batch.delete(doc(firestore, 'users', user.uid, 'timeLogs', log.id)));
            await batch.commit();
            toast({ title: 'Registros de tiempo eliminados' });
        } catch (error) {
            console.error("Error resetting time logs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron eliminar los registros.' });
        }
        handleCloseModal('resetTimeLogs');
    };

    const handleResetMoods = async () => {
        if (!user || !firestore) return;
        try {
            const batch = writeBatch(firestore);
            const moodsSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'moods'));
            moodsSnapshot.forEach(moodDoc => batch.delete(moodDoc.ref));
            await batch.commit();
            toast({ title: 'Historial de ánimo eliminado' });
        } catch (error) {
            console.error("Error resetting moods:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el historial.' });
        }
        handleCloseModal('resetMoods');
    };


    const handleSaveRoutine = async () => {
        if (!user || !firestore || !formState.name) return;
        const { id, ...data } = formState;
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'routines', id), data);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'routines'), { ...data, userId: user.uid, createdAt: serverTimestamp() });
        }
        handleCloseModal('routine');
    };

    const handleDeleteRoutine = async () => {
        if (!user || !firestore || !formState.id) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'routines', formState.id));
        handleCloseModal('deleteRoutine');
    };

    const handleCompleteRoutine = async (routine: any) => {
        if (!user || !firestore || !allHabits) return;
        const habitsToComplete = allHabits.filter(h => routine.habitIds.includes(h.id) && !isHabitCompletedToday(h));
        if (habitsToComplete.length === 0) return;

        const batch = writeBatch(firestore);
        habitsToComplete.forEach(habit => {
            const habitRef = doc(firestore, 'users', user.uid, 'habits', habit.id);
            const streakData = calculateStreak(habit);
            batch.update(habitRef, { lastCompletedAt: Timestamp.now(), ...streakData, previousStreak: habit.currentStreak || 0, previousLongestStreak: habit.longestStreak || 0, previousLastCompletedAt: habit.lastCompletedAt ?? null });
        });
        await batch.commit();
        toast({ title: 'Rutina completada', description: `Se marcaron ${habitsToComplete.length} hábitos como completados.`})
    };

    // --- Derived State ---
    const derivedState = useMemo(() => {
        const allHabitsData = allHabits || [];
        const allTimeLogsData = timeLogs || [];
        const allRoutinesData = routines || [];

        const analyticsLoading = habitsLoading || timeLogsLoading || routinesLoading;

        const activeHabits = allHabitsData.filter((h: any) => h.isActive);
        const groupedHabits = activeHabits.reduce((acc: any, habit: any) => {
            const category = habit.category || 'Sin Categoría';
            if (!acc[category]) acc[category] = [];
            acc[category].push(habit);
            return acc;
        }, {});

        const dailyHabits = activeHabits.filter((h: any) => h.frequency === 'Diario');
        const weeklyHabits = activeHabits.filter((h: any) => h.frequency === 'Semanal');
        const completedDaily = dailyHabits.filter(isHabitCompletedToday).length;
        const completedWeekly = weeklyHabits.filter(isHabitCompletedToday).length;
        
        const longestStreak = activeHabits.reduce((max: number, h: any) => Math.max(max, h.longestStreak || 0), 0);
        const topLongestStreakHabits = longestStreak > 0 ? activeHabits.filter((h: any) => (h.longestStreak || 0) === longestStreak).map((h: any) => h.name) : [];
        const longestCurrentStreak = activeHabits.reduce((max: number, h: any) => Math.max(max, h.currentStreak || 0), 0);
        const topCurrentStreakHabits = longestCurrentStreak > 0 ? activeHabits.filter((h: any) => (h.currentStreak || 0) === longestCurrentStreak).map((h: any) => h.name) : [];

        const habitLogs = allTimeLogsData.filter((log: any) => log.referenceType === 'habit');
        const habitCategoryTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = activeHabits.find((h: any) => h.id === log.referenceId);
            if (habit) {
                const category = habit.category || 'Sin Categoría';
                habitCategoryTotals[category] = (habitCategoryTotals[category] || 0) + log.durationSeconds;
            }
        });
        const habitCategoryData = Object.entries(habitCategoryTotals).map(([name, value]) => ({ name, value: Math.round(value / 60) })).filter(item => item.value > 0);

        const topHabitsByStreak = [...activeHabits].sort((a,b) => (b.longestStreak || 0) - (a.longestStreak || 0)).slice(0, 5).map(h => ({ name: h.name, racha: h.longestStreak || 0 }));

        const habitTimeTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = activeHabits.find((h: any) => h.id === log.referenceId);
            if (habit) habitTimeTotals[habit.name] = (habitTimeTotals[habit.name] || 0) + log.durationSeconds;
        });
        const topHabitsByTime = Object.entries(habitTimeTotals).map(([name, time]) => ({ name, minutos: Math.round(time / 60) })).sort((a, b) => b.minutos - a.minutos).slice(0, 5);
        
        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const month = todayDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyHabitsForMonth = activeHabits.filter((h: any) => h.frequency === 'Diario');
        const completionByDay: Record<number, {completed: number, total: number}> = {};
        if (dailyHabitsForMonth.length > 0) {
            activeHabits.forEach(habit => {
                if (habit.lastCompletedAt?.toDate) {
                    const completedDate = habit.lastCompletedAt.toDate();
                    if (completedDate.getFullYear() === year && completedDate.getMonth() === month) {
                        const dayOfMonth = completedDate.getDate();
                        if (!completionByDay[dayOfMonth]) completionByDay[dayOfMonth] = { completed: 0, total: dailyHabitsForMonth.length};
                        completionByDay[dayOfMonth].completed += 1;
                    }
                }
            });
        }
        const monthlyCompletionData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const data = completionByDay[day];
            return { day, value: data ? Math.round((data.completed / data.total) * 100) : 0 };
        });

        const habitTimeMap: Record<string, number> = {};
        allTimeLogsData.filter((log: any) => log.referenceType === 'habit').forEach((log: any) => {
            habitTimeMap[log.referenceId] = (habitTimeMap[log.referenceId] || 0) + log.durationSeconds;
        });
    
        const routineTimeTotals: Record<string, number> = {};
        allRoutinesData.forEach((routine: any) => {
            routine.habitIds.forEach((habitId: string) => {
                if (habitTimeMap[habitId]) {
                    routineTimeTotals[routine.name] = (routineTimeTotals[routine.name] || 0) + habitTimeMap[habitId];
                }
            });
        });
        const routineTimeAnalytics = Object.entries(routineTimeTotals)
            .map(([name, time]) => ({ name, minutos: Math.round(time / 60) }))
            .sort((a, b) => b.minutos - a.minutos);
    
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const routineCompletionAnalytics = allRoutinesData.map((routine: any) => {
            const routineHabits = activeHabits.filter((h: any) => routine.habitIds.includes(h.id));
            if (routineHabits.length === 0) return { name: routine.name, completionRate: 0 };
            
            let totalPossibleCompletions = 0;
            let actualCompletions = 0;

            routineHabits.forEach(habit => {
                if (!habit.createdAt) return;
                const createdAt = habit.createdAt.toDate();
                const daysSinceCreation = Math.floor((new Date().getTime() - Math.max(createdAt.getTime(), thirtyDaysAgo.getTime())) / (1000 * 60 * 60 * 24));
                
                if (habit.frequency === 'Diario') {
                    totalPossibleCompletions += daysSinceCreation;
                } else if (habit.frequency === 'Semanal') {
                    totalPossibleCompletions += Math.floor(daysSinceCreation / 7);
                }
                
                const completionsInPeriod = allTimeLogsData.filter(l => l.referenceId === habit.id && l.startTime.toDate() > thirtyDaysAgo).length;
                actualCompletions += completionsInPeriod;

            });
            const rate = totalPossibleCompletions > 0 ? (actualCompletions / totalPossibleCompletions) * 100 : 0;
            return { name: routine.name, completionRate: Math.min(100, rate) };
        }).filter(r => r.completionRate > 0).sort((a, b) => b.completionRate - a.completionRate);
        
        return { 
            analyticsLoading,
            groupedHabits, 
            dailyHabits, 
            weeklyHabits, 
            completedDaily, 
            completedWeekly, 
            longestStreak, 
            topLongestStreakHabits, 
            longestCurrentStreak, 
            topCurrentStreakHabits,
            habitCategoryData,
            topHabitsByStreak,
            topHabitsByTime,
            monthlyCompletionData,
            routineTimeAnalytics,
            routineCompletionAnalytics,
        };
    }, [allHabits, routines, timeLogs, habitsLoading, routinesLoading, timeLogsLoading]);

    return (
        <HabitsContext.Provider value={{
            allHabits,
            habitsLoading,
            presetHabits: PresetHabits,
            presetHabitsLoading: false,
            routines,
            routinesLoading,
            ...derivedState,
            handleToggleHabit,
            handleSaveHabit,
            handleDeleteHabit,
            handleResetAllStreaks,
            handleResetHabitStreak,
            handleResetTimeLogs,
            handleResetMoods,
            handleSaveRoutine,
            handleDeleteRoutine,
            handleCompleteRoutine,
        }}>
            {children}
        </HabitsContext.Provider>
    );
};

    