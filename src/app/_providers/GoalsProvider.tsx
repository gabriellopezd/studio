
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirebase, useCollectionData, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUI } from './UIProvider';

interface GoalsContextState {
    goals: any[] | null;
    goalsLoading: boolean;
    handleSaveGoal: () => Promise<void>;
    handleDeleteGoal: () => Promise<void>;
    handleUpdateGoalProgress: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextState | undefined>(undefined);

export const useGoals = () => {
    const context = useContext(GoalsContext);
    if (!context) {
        throw new Error('useGoals must be used within a GoalsProvider');
    }
    return context;
};

export const GoalsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const { formState, handleCloseModal } = useUI();

    const goalsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/goals`);
    }, [user, firestore]);
    const { data: goals, isLoading: goalsLoading } = useCollectionData(goalsQuery);

    const handleSaveGoal = async () => {
        if (!user || !firestore || !formState.name || !formState.targetValue) return;

        const { id, dueDate, ...data } = formState;
        const serializableData: any = { 
            ...data,
            targetValue: parseFloat(data.targetValue),
            currentValue: data.currentValue ? parseFloat(data.currentValue) : 0,
            monthlyContribution: data.monthlyContribution ? parseFloat(data.monthlyContribution) : null,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            userId: user.uid
        };
        
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'goals', id), serializableData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'goals'), { ...serializableData, isCompleted: false, createdAt: serverTimestamp() });
        }
        handleCloseModal('goal');
    };

    const handleDeleteGoal = async () => {
        if (!user || !firestore || !formState.id) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'goals', formState.id));
        handleCloseModal('deleteGoal');
    };

    const handleUpdateGoalProgress = async () => {
        if (!user || !firestore || !formState.id || !formState.progressValue) return;

        const newValue = parseFloat(formState.progressValue);
        if (isNaN(newValue)) return;

        const goalRef = doc(firestore, 'users', user.uid, 'goals', formState.id);
        const goalData = goals?.find(g => g.id === formState.id);
        const isCompleted = goalData && newValue >= goalData.targetValue;
        
        await updateDocumentNonBlocking(goalRef, { currentValue: newValue, isCompleted });
        
        handleCloseModal('progressGoal');
        if (isCompleted) {
            toast({ title: '¡Meta Alcanzada!', description: `Felicidades por completar tu meta "${goalData.name}".`});
        }
    };

    return (
        <GoalsContext.Provider value={{ 
            goals, 
            goalsLoading,
            handleSaveGoal, 
            handleDeleteGoal, 
            handleUpdateGoalProgress 
        }}>
            {children}
        </GoalsContext.Provider>
    );
};
