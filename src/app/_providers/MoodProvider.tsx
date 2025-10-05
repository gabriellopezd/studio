
'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { collection, query, where, Timestamp, serverTimestamp, getDocs, limit, doc } from 'firebase/firestore';
import { useFirebase, useCollectionData, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { useUI } from './UIProvider';
import { defaultFeelings, defaultInfluences } from '@/lib/moods';
import type { Mood } from './types';

// Helper to get date as YYYY-MM-DD string, adjusted for timezone
const toYYYYMMDD = (date: Date): string => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};

interface MoodContextState {
    moods: any[] | null;
    moodsLoading: boolean;
    todayMood: any | null;
    todayMoodLoading: boolean;
    feelings: any[] | null;
    feelingsLoading: boolean;
    influences: any[] | null;
    influencesLoading: boolean;
    feelingStats: [string, any][];
    influenceStats: [string, any][];
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
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // --- Data Fetching ---
    const moodsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const startOfMonth = toYYYYMMDD(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
        const endOfMonth = toYYYYMMDD(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

        return query(
            collection(firestore, 'users', user.uid, 'moods'), 
            where('date', '>=', startOfMonth), 
            where('date', '<=', endOfMonth)
        );
    }, [user, firestore, currentMonth]);
    const { data: moods, isLoading: moodsLoading } = useCollectionData(moodsQuery);

    const todayMoodQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const todayString = toYYYYMMDD(new Date());
        return query(
            collection(firestore, 'users', user.uid, 'moods'), 
            where('date', '==', todayString),
            limit(1)
        );
    }, [user, firestore]);
    const { data: todayMoodData, isLoading: todayMoodLoading } = useCollectionData(todayMoodQuery);
    
    const feelingsQuery = useMemo(() => user ? collection(firestore, 'users', user.uid, 'feelings') : null, [user, firestore]);
    const { data: feelings, isLoading: feelingsLoading } = useCollectionData(feelingsQuery);
    
    const influencesQuery = useMemo(() => user ? collection(firestore, 'users', user.uid, 'influences') : null, [user, firestore]);
    const { data: influences, isLoading: influencesLoading } = useCollectionData(influencesQuery);

    // --- Actions ---
    const handleSaveMood = async (moodData: Mood) => {
        if (!user || !firestore) return;
        const { date, ...dataToSave } = moodData;
        const dateToSave = date || new Date();
        const dateString = toYYYYMMDD(dateToSave);
        
        const fullMoodData = { ...dataToSave, date: dateString, userId: user.uid };

        const q = query(
            collection(firestore, 'users', user.uid, 'moods'), 
            where('date', '==', dateString),
            limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            await updateDocumentNonBlocking(snapshot.docs[0].ref, fullMoodData);
        } else {
            const newDocRef = doc(collection(firestore, 'users', user.uid, 'moods'));
            await addDocumentNonBlocking(newDocRef, { ...fullMoodData, createdAt: serverTimestamp(), id: newDocRef.id });
        }
    };

    // --- Derived State ---
    const derivedState = useMemo(() => {
        const allMoodsData = moods || [];
        const feelingsCount = allMoodsData.flatMap((m: any) => m.feelings).reduce((acc: any, f: any) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {} as Record<string, number>);
        const influencesCount = allMoodsData.flatMap((m: any) => m.influences).reduce((acc: any, i: any) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {} as Record<string, number>);

        return {
            todayMood: todayMoodData?.[0] || null,
            feelingStats: (Object.entries(feelingsCount) as [string, any][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            influenceStats: (Object.entries(influencesCount) as [string, any][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
        };
    }, [moods, todayMoodData]);

    return (
        <MoodContext.Provider value={{
            moods,
            moodsLoading,
            todayMood: derivedState.todayMood,
            todayMoodLoading,
            feelings: feelings || defaultFeelings,
            feelingsLoading,
            influences: influences || defaultInfluences,
            influencesLoading,
            currentMonth,
            setCurrentMonth,
            feelingStats: derivedState.feelingStats,
            influenceStats: derivedState.influenceStats,
            handleSaveMood,
        }}>
            {children}
        </MoodContext.Provider>
    );
};
