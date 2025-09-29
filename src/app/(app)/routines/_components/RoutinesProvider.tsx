'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';

interface RoutinesContextType {
    firestore: any;
    user: any;
    routines: any[] | null;
    routinesLoading: boolean;
    allHabits: any[] | null;
    habitsLoading: boolean;
    timeLogs: any[] | null;
    timeLogsLoading: boolean;
    analyticsLoading: boolean;
    routineTimeAnalytics: { name: string; minutos: number }[];
}

const RoutinesContext = createContext<RoutinesContextType | undefined>(undefined);

export const RoutinesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();

    const routinesQuery = useMemo(
        () => (user ? collection(firestore, 'users', user.uid, 'routines') : null),
        [firestore, user]
    );
    const { data: routines, isLoading: routinesLoading } = useCollection(routinesQuery);

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

    const analyticsLoading = routinesLoading || habitsLoading || timeLogsLoading;

    const routineTimeAnalytics = useMemo(() => {
        if (!routines || !allHabits || !timeLogs) return [];

        const habitTimeTotals: Record<string, number> = {};
        timeLogs.filter(log => log.referenceType === 'habit').forEach(log => {
            habitTimeTotals[log.referenceId] = (habitTimeTotals[log.referenceId] || 0) + log.durationSeconds;
        });

        const routineTotals: Record<string, number> = {};
        routines.forEach(routine => {
            routine.habitIds.forEach((habitId: string) => {
                if (habitTimeTotals[habitId]) {
                    routineTotals[routine.name] = (routineTotals[routine.name] || 0) + habitTimeTotals[habitId];
                }
            });
        });

        return Object.entries(routineTotals)
            .map(([name, time]) => ({ name, minutos: Math.round(time / 60) }))
            .sort((a, b) => b.minutos - a.minutos);

    }, [routines, allHabits, timeLogs]);


    const value = {
        firestore,
        user,
        routines,
        routinesLoading,
        allHabits,
        habitsLoading,
        timeLogs,
        timeLogsLoading,
        analyticsLoading,
        routineTimeAnalytics,
    };

    return <RoutinesContext.Provider value={value}>{children}</RoutinesContext.Provider>;
};

export const useRoutines = () => {
    const context = useContext(RoutinesContext);
    if (context === undefined) {
        throw new Error('useRoutines must be used within a RoutinesProvider');
    }
    return context;
};
