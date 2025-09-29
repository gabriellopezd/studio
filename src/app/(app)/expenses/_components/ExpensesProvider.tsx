'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

interface ExpensesContextType {
    firestore: any;
    user: any;
    lists: any[] | null;
    listsLoading: boolean;
    budgets: any[] | null;
    sortedLists: any[];
    spendingByCategory: { name: string; gasto: number }[];
    budgetAccuracy: { name: string; estimado: number; real: number }[];
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();

    const shoppingListsQuery = useMemo(
        () =>
          user
            ? query(
                collection(firestore, 'users', user.uid, 'shoppingLists'),
                orderBy('order')
              )
            : null,
        [firestore, user]
      );
    const { data: lists, isLoading: listsLoading } = useCollection(shoppingListsQuery);

    const budgetsQuery = useMemo(
        () =>
          user ? collection(firestore, 'users', user.uid, 'budgets') : null,
        [firestore, user]
    );
    const { data: budgets } = useCollection(budgetsQuery);
    
    const sortedLists = useMemo(() => {
        return lists ? [...lists].sort((a, b) => a.order - b.order) : [];
    }, [lists]);
    
    const spendingByCategory = useMemo(() => {
        if (!lists) return [];
        return lists.map(list => {
            const totalSpent = list.items
                .filter((item: any) => item.isPurchased && item.price)
                .reduce((sum: number, item: any) => sum + item.price, 0);
            return { name: list.name, gasto: totalSpent };
        }).filter(d => d.gasto > 0);
    }, [lists]);

    const budgetAccuracy = useMemo(() => {
        if (!lists) return [];
        return lists.map(list => {
            const estimado = list.items
                .filter((item: any) => item.isPurchased)
                .reduce((sum: number, item: any) => sum + item.amount, 0);
            const real = list.items
                .filter((item: any) => item.isPurchased && item.price)
                .reduce((sum: number, item: any) => sum + item.price, 0);
            return { name: list.name, estimado, real };
        }).filter(d => d.real > 0 || d.estimado > 0);
    }, [lists]);


    const value = {
        firestore,
        user,
        lists,
        listsLoading,
        budgets,
        sortedLists,
        spendingByCategory,
        budgetAccuracy,
    };

    return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
};

export const useExpenses = () => {
    const context = useContext(ExpensesContext);
    if (context === undefined) {
        throw new Error('useExpenses must be used within a ExpensesProvider');
    }
    return context;
};
