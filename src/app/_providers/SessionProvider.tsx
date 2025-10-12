
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { doc, Timestamp, serverTimestamp, writeBatch, increment, collection } from 'firebase/firestore';
import { useFirebase, useCollectionData } from '@/firebase';
import { ActiveSession } from './types';
import { Button } from '@/components/ui/button';
import { Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateStreak } from '@/lib/habits';
import type { Habit } from './types';


interface SessionContextState {
    activeSession: ActiveSession | null;
    elapsedTime: number;
    startSession: (id: string, name: string, type: 'habit' | 'task') => void;
    stopSession: () => void;
}

const SessionContext = createContext<SessionContextState | undefined>(undefined);

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};

function TimerDisplay({ activeSession, elapsedTime, stopSession }: { activeSession: ActiveSession | null, elapsedTime: number, stopSession: () => void }) {
    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    if (!activeSession) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="flex items-center gap-4 rounded-lg bg-primary p-4 text-primary-foreground shadow-lg">
                <Timer className="h-6 w-6 animate-pulse" />
                <div className="flex-1">
                    <p className="text-sm font-medium">{activeSession.name}</p>
                    <p className="font-mono text-lg font-bold">{formatTime(elapsedTime)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/80" onClick={stopSession}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const allHabitsQuery = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/habits`);
    }, [user, firestore]);
    const { data: allHabits } = useCollectionData<Habit>(allHabitsQuery);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (activeSession) {
            setElapsedTime(Math.floor((Date.now() - activeSession.startTime) / 1000));
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - (activeSession?.startTime ?? 0)) / 1000));
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeSession]);

    const startSession = (id: string, name: string, type: 'habit' | 'task') => {
        if (activeSession) return;
        setActiveSession({ id, name, type, startTime: Date.now() });
        setElapsedTime(0);
    };

    const stopSession = async () => {
        if (!activeSession || !user || !firestore) return;

        const durationSeconds = Math.floor((Date.now() - activeSession.startTime) / 1000);
        if (durationSeconds < 1) {
            setActiveSession(null);
            return;
        }

        const timeLogRef = doc(collection(firestore, 'users', user.uid, 'timeLogs'));
        const batch = writeBatch(firestore);
        
        batch.set(timeLogRef, {
            referenceId: activeSession.id,
            referenceType: activeSession.type,
            startTime: Timestamp.fromMillis(activeSession.startTime),
            endTime: Timestamp.now(),
            durationSeconds,
            createdAt: serverTimestamp(),
            userId: user.uid,
        });

        if (activeSession.type === 'habit') {
            const habit = allHabits?.find(h => h.id === activeSession!.id);
            if (habit) {
                const habitRef = doc(firestore, 'users', user.uid, 'habits', activeSession.id);
                const streakData = calculateStreak(habit);
                batch.update(habitRef, { 
                    lastCompletedAt: Timestamp.now(),
                    ...streakData,
                    previousStreak: habit.currentStreak || 0,
                    previousLongestStreak: habit.longestStreak || 0,
                    previousLastCompletedAt: habit.lastCompletedAt ?? null,
                    lastTimeLogId: timeLogRef.id,
                });
            }
        } else if (activeSession.type === 'task') {
             const taskRef = doc(firestore, 'users', user.uid, 'tasks', activeSession.id);
             batch.update(taskRef, { 
                isCompleted: true,
                totalTimeSpent: increment(durationSeconds),
                completionDate: Timestamp.now(),
             });
        }
        
        await batch.commit();
        setActiveSession(null);
        setElapsedTime(0);
    };

    return (
        <SessionContext.Provider value={{ activeSession, elapsedTime, startSession, stopSession }}>
            {children}
            <TimerDisplay activeSession={activeSession} elapsedTime={elapsedTime} stopSession={stopSession} />
        </SessionContext.Provider>
    );
};
