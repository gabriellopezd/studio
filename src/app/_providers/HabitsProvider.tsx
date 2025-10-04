'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode, useEffect } from 'react';
import { collection, doc, query, Timestamp, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirebase, useCollectionData, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { isHabitCompletedToday, calculateStreak, checkHabitStreak, resetStreak } from '@/lib/habits';
import { useToast } from '@/hooks/use-toast';
import { useUI } from './UIProvider';
import { PresetHabits } from '@/lib/preset-habits';

interface HabitsContextState {
    allHabits: any[] | null;
    habitsLoading: boolean;
    presetHabits: any[] | null;
    presetHabitsLoading: boolean;
    routines: any[] | null;
    routinesLoading: boolean;
    
    // Derived state
    groupedHabits: { [key: string]: any[] };
    dailyHabits: any[];
    weeklyHabits: any[];
    completedDaily: number;
    completedWeekly: number;
    longestStreak: number;
    topLongestStreakHabits: string[];
    longestCurrentStreak: number;
    topCurrentStreakHabits: string[];

    // Actions
    handleToggleHabit: (habitId: string) => void;
    handleSaveHabit: () => Promise<void>;
    handleDeleteHabit: () => Promise<void>;
    handleResetAllStreaks: () => Promise<void>;
    handleResetHabitStreak: () => Promise<void>;
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
    const { data: allHabits, isLoading: habitsLoading } = useCollectionData(allHabitsQuery);

    const routinesQuery = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/routines`);
    }, [user, firestore]);
    const { data: routines, isLoading: routinesLoading } = useCollectionData(routinesQuery);
    
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
    
    const handleResetHabitStreak = async () => {
        if (!formState?.id || !user || !firestore) return;
        await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', formState.id), resetStreak());
        handleCloseModal('resetHabit');
    };

    const handleResetAllStreaks = async () => {
        if (!user || !firestore || !allHabits) return;
        const batch = writeBatch(firestore);
        allHabits.forEach((habit) => batch.update(doc(firestore, 'users', user.uid, 'habits', habit.id), resetStreak()));
        await batch.commit();
        toast({ title: 'Rachas reiniciadas', description: 'Todas las rachas y récords de tus hábitos han sido reiniciados.' });
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
        const activeHabits = allHabits?.filter((h: any) => h.isActive) || [];
        const groupedHabits = activeHabits.reduce((acc: any, habit: any) => {
            const category = habit.category || 'Sin Categoría';
            if (!acc[category]) acc[category] = [];
            acc[category].push(habit);
            return acc;
        }, {});

        const dailyHabits = activeHabits.filter((h: any) => h.frequency === 'Diario');
        const weeklyHabits = activeHabits.filter((h: any) => h.frequency === 'Semanal');
        const completedDaily = dailyHabits.filter((h: any) => isHabitCompletedToday(h)).length;
        const completedWeekly = weeklyHabits.filter((h: any) => isHabitCompletedToday(h)).length;
        
        const longestStreak = activeHabits.reduce((max: number, h: any) => Math.max(max, h.longestStreak || 0), 0);
        const topLongestStreakHabits = longestStreak > 0 ? activeHabits.filter((h: any) => (h.longestStreak || 0) === longestStreak).map((h: any) => h.name) : [];
        const longestCurrentStreak = activeHabits.reduce((max: number, h: any) => Math.max(max, h.currentStreak || 0), 0);
        const topCurrentStreakHabits = longestCurrentStreak > 0 ? activeHabits.filter((h: any) => (h.currentStreak || 0) === longestCurrentStreak).map((h: any) => h.name) : [];
        
        return { groupedHabits, dailyHabits, weeklyHabits, completedDaily, completedWeekly, longestStreak, topLongestStreakHabits, longestCurrentStreak, topCurrentStreakHabits };
    }, [allHabits]);

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
            handleSaveRoutine,
            handleDeleteRoutine,
            handleCompleteRoutine,
        }}>
            {children}
        </HabitsContext.Provider>
    );
};