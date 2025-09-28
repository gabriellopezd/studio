'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { useFirebase, useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, serverTimestamp, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

interface Mood {
    moodLevel: number;
    moodLabel: string;
    emoji: string;
    feelings: string[];
    influences: string[];
}

interface MoodsContextType {
    currentMonth: Date;
    setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
    moods: any[] | null;
    moodsLoading: boolean;
    feelingStats: [string, number][];
    influenceStats: [string, number][];
    todayMood: any;
    handleSaveMood: (moodData: Mood) => Promise<void>;
}

const MoodsContext = createContext<MoodsContextType | undefined>(undefined);

export const MoodsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const moodsQuery = useMemo(() => {
        if (!user) return null;
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        return query(
            collection(firestore, 'users', user.uid, 'moods'),
            where('date', '>=', start.toISOString()),
            where('date', '<=', end.toISOString())
        );
    }, [firestore, user, currentMonth]);

    const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);

    const feelingStats = useMemo(() => {
        if (!moods) return [];
        const counts = moods.flatMap(m => m.feelings).reduce((acc, feeling) => {
            acc[feeling] = (acc[feeling] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
    }, [moods]);

    const influenceStats = useMemo(() => {
        if (!moods) return [];
        const counts = moods.flatMap(m => m.influences).reduce((acc, influence) => {
            acc[influence] = (acc[influence] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
    }, [moods]);
    
    const todayMood = useMemo(() => {
        return moods?.find(m => new Date(m.date).toDateString() === new Date().toDateString());
    }, [moods]);

    const handleSaveMood = async (moodData: Mood) => {
        if (!user) return;

        const today = new Date();
        const todayISO = today.toISOString().split('T')[0];

        const fullMoodData = {
            ...moodData,
            date: new Date().toISOString(),
            userId: user.uid
        };

        const moodsColRef = collection(firestore, 'users', user.uid, 'moods');
        const q = query(moodsColRef, where('date', '>=', `${todayISO}T00:00:00.000Z`), where('date', '<=', `${todayISO}T23:59:59.999Z`));

        try {
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const existingDocRef = querySnapshot.docs[0].ref;
                await updateDocumentNonBlocking(existingDocRef, fullMoodData);
            } else {
                await addDocumentNonBlocking(moodsColRef, {
                    ...fullMoodData,
                    createdAt: serverTimestamp(),
                });
            }
        } catch (e) {
            console.error("Error saving mood", e);
        }
    };


    const value = {
        currentMonth,
        setCurrentMonth,
        moods,
        moodsLoading,
        feelingStats,
        influenceStats,
        todayMood,
        handleSaveMood,
    };

    return <MoodsContext.Provider value={value}>{children}</MoodsContext.Provider>;
};

export const useMoods = () => {
    const context = useContext(MoodsContext);
    if (context === undefined) {
        throw new Error('useMoods must be used within a MoodsProvider');
    }
    return context;
};
