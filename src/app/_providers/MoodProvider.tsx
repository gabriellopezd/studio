
'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { collection, query, where, Timestamp, serverTimestamp, getDocs } from 'firebase/firestore';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Mood } from './types';
import { useUI } from './UIProvider';
import { defaultFeelings, defaultInfluences } from '@/lib/moods';

interface MoodContextState {
    moods: any[] | null;
    moodsLoading: boolean;
    todayMood: any | null;
    feelings: any[] | null;
    feelingsLoading: boolean;
    influences: any[] | null;
    influencesLoading: boolean;
    feelingStats: [string, any][];
    influenceStats: [string, any][];
    monthlyCompletionData: { day: number; value: number }[];
    handleSaveMood: (moodData: Mood) => Promise<void>;
    currentMonth: Date;
    setCurrentMonth: (date: Date | ((prev: Date) => Date)) => void;
}

const MoodContext = createContext<MoodContextState | undefined>(undefined);

export const useMood = () => {
    const context = useContext(MoodContext);
    if (!context) {
        throw new Error('useMood must be used within a MoodProvider');
    }
    return context;
};

export const MoodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const { handleCloseModal } = useUI();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // --- Data Fetching ---
    const moodsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return query(collection(firestore, 'users', user.uid, 'moods'), where('date', '>=', start.toISOString()), where('date', '<=', end.toISOString()));
    }, [user, firestore, currentMonth]);
    const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);

    const todayMoodQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        return query(collection(firestore, 'users', user.uid, 'moods'), where('date', '>=', startOfDay.toISOString()), where('date', '<=', endOfDay.toISOString()), where('limit', '==', 1));
    }, [user, firestore]);
    const { data: todayMoodData } = useCollection(todayMoodQuery);
    
    const feelingsQuery = useMemo(() => user ? collection(firestore, 'users', user.uid, 'feelings') : null, [user, firestore]);
    const { data: feelings, isLoading: feelingsLoading } = useCollection(feelingsQuery, {
        fallbackData: defaultFeelings,
    });
    
    const influencesQuery = useMemo(() => user ? collection(firestore, 'users', user.uid, 'influences') : null, [user, firestore]);
    const { data: influences, isLoading: influencesLoading } = useCollection(influencesQuery, {
        fallbackData: defaultInfluences,
    });

    // --- Actions ---
    const handleSaveMood = async (moodData: Mood) => {
        if (!user || !firestore) return;
        const { date, ...dataToSave } = moodData;
        const dateToSave = date || new Date();
        const startOfDay = new Date(dateToSave.getFullYear(), dateToSave.getMonth(), dateToSave.getDate());
        const endOfDay = new Date(dateToSave.getFullYear(), dateToSave.getMonth(), dateToSave.getDate(), 23, 59, 59, 999);
        const fullMoodData = { ...dataToSave, date: dateToSave.toISOString(), userId: user.uid };

        const q = query(collection(firestore, 'users', user.uid, 'moods'), where('date', '>=', startOfDay.toISOString()), where('date', '<=', endOfDay.toISOString()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            await updateDocumentNonBlocking(snapshot.docs[0].ref, fullMoodData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'moods'), { ...fullMoodData, createdAt: serverTimestamp() });
        }
    };

    // --- Derived State ---
    const derivedState = useMemo(() => {
        const allMoodsData = moods || [];
        const feelingsCount = allMoodsData.flatMap((m: any) => m.feelings).reduce((acc: any, f: any) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {} as Record<string, number>);
        const influencesCount = allMoodsData.flatMap((m: any) => m.influences).reduce((acc: any, i: any) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {} as Record<string, number>);

        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const monthlyCompletionData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const mood = allMoodsData.find(m => new Date(m.date).getDate() === day);
            return { day, value: mood ? (mood.moodLevel / 7) * 100 : 0 };
        });

        return {
            todayMood: todayMoodData?.[0] || null,
            feelingStats: (Object.entries(feelingsCount) as [string, any][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            influenceStats: (Object.entries(influencesCount) as [string, any][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            monthlyCompletionData,
        };
    }, [moods, todayMoodData, currentMonth]);

    return (
        <MoodContext.Provider value={{
            moods,
            moodsLoading,
            feelings,
            feelingsLoading,
            influences,
            influencesLoading,
            currentMonth,
            setCurrentMonth,
            ...derivedState,
            handleSaveMood,
        }}>
            {children}
        </MoodContext.Provider>
    );
};
