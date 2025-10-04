
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { writeBatch, collection, getDocs } from 'firebase/firestore';
import { handleUserLogin, initializeDefaultBudgets, initializeDefaultTaskCategories } from '@/firebase/user-management';

interface AppContextState {
    firestore: any;
    user: any;
    handleResetAllData: () => Promise<void>;
    handleResetTimeLogs: () => Promise<void>;
    handleResetMoods: () => Promise<void>;
    handleResetCategories: () => Promise<void>;
}

export const AppContext = createContext<AppContextState | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    
    const handleResetAllData = async () => {
        if (!user || !firestore) return;
        try {
            const batch = writeBatch(firestore);
            const collectionsToDelete = ['habits', 'routines', 'tasks', 'taskCategories', 'goals', 'moods', 'feelings', 'influences', 'transactions', 'budgets', 'shoppingLists', 'recurringExpenses', 'recurringIncomes', 'timeLogs'];
            
            for (const col of collectionsToDelete) {
                const snapshot = await getDocs(collection(firestore, 'users', user.uid, col));
                snapshot.forEach(doc => batch.delete(doc.ref));
            }
            
            await handleUserLogin(user, firestore, user.displayName || undefined);

            await batch.commit();
            toast({ title: 'Datos restaurados', description: 'Todos tus datos se han reiniciado a los valores predeterminados.' });
        } catch (error) {
            console.error("Error resetting all data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron reiniciar los datos.' });
        }
    };
    
    const handleResetTimeLogs = async () => {
        if (!user || !firestore) return;
        try {
            const batch = writeBatch(firestore);
            const snapshot = await getDocs(collection(firestore, 'users', user.uid, 'timeLogs'));
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            toast({ title: 'Tiempo de enfoque reiniciado', description: 'Se han eliminado todos los registros de tiempo.' });
        } catch (error) {
            console.error("Error resetting time logs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reiniciar el tiempo de enfoque.' });
        }
    };

    const handleResetMoods = async () => {
        if (!user || !firestore) return;
        try {
            const batch = writeBatch(firestore);
            const snapshot = await getDocs(collection(firestore, 'users', user.uid, 'moods'));
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            toast({ title: 'Historial de ánimo reiniciado', description: 'Se han eliminado todos los registros de ánimo.' });
        } catch (error) {
            console.error("Error resetting moods:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reiniciar el historial de ánimo.' });
        }
    };

    const handleResetCategories = async () => {
        if (!user || !firestore) return;
        try {
            const batch = writeBatch(firestore);

            const collectionsToDelete = ['shoppingLists', 'budgets', 'taskCategories'];
            for (const col of collectionsToDelete) {
                const snapshot = await getDocs(collection(firestore, 'users', user.uid, col));
                snapshot.forEach(doc => batch.delete(doc.ref));
            }

            const newBatch = writeBatch(firestore);
            await initializeDefaultTaskCategories(user, firestore, newBatch);
            await initializeDefaultBudgets(user, firestore, newBatch);

            await batch.commit();
            await newBatch.commit();
            
            toast({ title: 'Categorías Restauradas', description: 'Las categorías se han restaurado a los valores predefinidos.' });
        } catch (error) {
            console.error("Error resetting categories:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron restaurar las categorías.' });
        }
    };

    const value: AppContextState = {
        firestore,
        user,
        handleResetAllData,
        handleResetTimeLogs,
        handleResetMoods,
        handleResetCategories,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
