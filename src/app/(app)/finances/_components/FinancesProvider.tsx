'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';

interface FinancesContextType {
    firestore: any;
    user: any;
    currentMonthName: string;
    currentMonthYear: string;
    transactions: any[] | null;
    transactionsLoading: boolean;
    budgets: any[] | null;
    budgetsLoading: boolean;
    recurringExpenses: any[] | null;
    recurringExpensesLoading: boolean;
    recurringIncomes: any[] | null;
    recurringIncomesLoading: boolean;
    shoppingLists: any[] | null;
    shoppingListsLoading: boolean;
    monthlyIncome: number;
    monthlyExpenses: number;
    balance: number;
    budget503020: {
        needs: { budget: number; spend: number; progress: number; };
        wants: { budget: number; spend: number; progress: number; };
        savings: { budget: number; spend: number; progress: number; };
    } | null;
    pendingRecurringExpenses: any[];
    paidRecurringExpenses: any[];
    pendingRecurringIncomes: any[];
    receivedRecurringIncomes: any[];
    pendingExpensesTotal: number;
    expenseCategories: string[];
    incomeCategories: string[];
    categoriesWithoutBudget: string[];
}

const FinancesContext = createContext<FinancesContextType | undefined>(undefined);

export const FinancesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const [currentMonthName, setCurrentMonthName] = useState('');
    const [currentMonthYear, setCurrentMonthYear] = useState('');

    useEffect(() => {
        const now = new Date();
        const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
        setCurrentMonthName(monthName.charAt(0).toUpperCase() + monthName.slice(1));
        setCurrentMonthYear(`${now.getFullYear()}-${now.getMonth()}`);
    }, []);

    const transactionsQuery = useMemo(() => {
        if (!user) return null;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return query(
            collection(firestore, 'users', user.uid, 'transactions'),
            where('date', '>=', startOfMonth.toISOString()),
            where('date', '<=', endOfMonth.toISOString()),
            orderBy('date', 'desc')
        );
    }, [firestore, user]);
    const { data: transactions, isLoading: transactionsLoading } = useCollection(transactionsQuery);

    const budgetsQuery = useMemo(() => (user ? collection(firestore, 'users', user.uid, 'budgets') : null), [firestore, user]);
    const { data: budgets, isLoading: budgetsLoading } = useCollection(budgetsQuery);

    const recurringExpensesQuery = useMemo(() => user ? query(collection(firestore, 'users', user.uid, 'recurringExpenses'), orderBy('dayOfMonth')) : null, [firestore, user]);
    const { data: recurringExpenses, isLoading: recurringExpensesLoading } = useCollection(recurringExpensesQuery);

    const recurringIncomesQuery = useMemo(() => user ? query(collection(firestore, 'users', user.uid, 'recurringIncomes'), orderBy('dayOfMonth')) : null, [firestore, user]);
    const { data: recurringIncomes, isLoading: recurringIncomesLoading } = useCollection(recurringIncomesQuery);

    const shoppingListsQuery = useMemo(() => user ? query(collection(firestore, 'users', user.uid, 'shoppingLists')) : null, [firestore, user]);
    const { data: shoppingLists, isLoading: shoppingListsLoading } = useCollection(shoppingListsQuery);

    const pendingRecurringExpenses = useMemo(() => {
        if (!recurringExpenses) return [];
        return recurringExpenses.filter(expense => expense.lastInstanceCreated !== currentMonthYear);
    }, [recurringExpenses, currentMonthYear]);

    const paidRecurringExpenses = useMemo(() => {
        if (!recurringExpenses) return [];
        return recurringExpenses.filter(expense => expense.lastInstanceCreated === currentMonthYear);
    }, [recurringExpenses, currentMonthYear]);

    const pendingRecurringIncomes = useMemo(() => {
        if (!recurringIncomes) return [];
        return recurringIncomes.filter(income => income.lastInstanceCreated !== currentMonthYear);
    }, [recurringIncomes, currentMonthYear]);

    const receivedRecurringIncomes = useMemo(() => {
        if (!recurringIncomes) return [];
        return recurringIncomes.filter(income => income.lastInstanceCreated === currentMonthYear);
    }, [recurringIncomes, currentMonthYear]);
    
    const pendingExpensesTotal = useMemo(() => {
        const recurringTotal = pendingRecurringExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const shoppingListTotal = shoppingLists?.reduce((sum, list) => {
            const listTotal = list.items
                .filter((item: any) => !item.isPurchased)
                .reduce((itemSum: number, item: any) => itemSum + (item.amount || 0), 0);
            return sum + listTotal;
        }, 0) || 0;
        return recurringTotal + shoppingListTotal;
      }, [pendingRecurringExpenses, shoppingLists]);
    
    const monthlyIncome = useMemo(() =>
        transactions
            ?.filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0) ?? 0,
        [transactions]);

    const monthlyExpenses = useMemo(() =>
        transactions
            ?.filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0) ?? 0,
        [transactions]);

    const balance = monthlyIncome - monthlyExpenses;

    const budget503020 = useMemo(() => {
        if (monthlyIncome === 0) return null;
        
        const needsBudget = monthlyIncome * 0.5;
        const wantsBudget = monthlyIncome * 0.3;
        const savingsBudget = monthlyIncome * 0.2;

        const needsSpend = transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Necesidades').reduce((sum, t) => sum + t.amount, 0) ?? 0;
        const wantsSpend = transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Deseos').reduce((sum, t) => sum + t.amount, 0) ?? 0;
        const savingsSpend = transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Ahorros y Deudas').reduce((sum, t) => sum + t.amount, 0) ?? 0;

        return {
            needs: { budget: needsBudget, spend: needsSpend, progress: (needsSpend/needsBudget)*100 },
            wants: { budget: wantsBudget, spend: wantsSpend, progress: (wantsSpend/wantsBudget)*100 },
            savings: { budget: savingsBudget, spend: savingsSpend, progress: (savingsSpend/savingsBudget)*100 },
        };
      }, [monthlyIncome, transactions]);

    const expenseCategories = useMemo(() => {
        const fromBudgets = budgets?.map(b => b.categoryName) ?? [];
        const fromTransactions = transactions
            ?.filter((t) => t.type === 'expense')
            .map((t) => t.category) ?? [];
        return [...new Set(["Arriendo", "Servicios", "Transporte", "Salud", ...fromBudgets, ...fromTransactions])].filter(Boolean);
    }, [budgets, transactions]);
    
    const incomeCategories = useMemo(() => {
        const fromTransactions = transactions
            ?.filter((t) => t.type === 'income')
            .map((t) => t.category) ?? [];
        return [...new Set(["Salario", "Bonificación", "Otro", ...fromTransactions])].filter(Boolean);
    }, [transactions]);
    
    const categoriesWithoutBudget = useMemo(() => {
        return expenseCategories.filter(
          (cat) => !budgets?.some((b) => b.categoryName === cat)
        );
    }, [expenseCategories, budgets]);


    const value = {
        firestore,
        user,
        currentMonthName,
        currentMonthYear,
        transactions,
        transactionsLoading,
        budgets,
        budgetsLoading,
        recurringExpenses,
        recurringExpensesLoading,
        recurringIncomes,
        recurringIncomesLoading,
        shoppingLists,
        shoppingListsLoading,
        monthlyIncome,
        monthlyExpenses,
        balance,
        budget503020,
        pendingRecurringExpenses,
        paidRecurringExpenses,
        pendingRecurringIncomes,
        receivedRecurringIncomes,
        pendingExpensesTotal,
        expenseCategories,
        incomeCategories,
        categoriesWithoutBudget
    };

    return <FinancesContext.Provider value={value}>{children}</FinancesContext.Provider>;
};

export const useFinances = () => {
    const context = useContext(FinancesContext);
    if (context === undefined) {
        throw new Error('useFinances must be used within a FinancesProvider');
    }
    return context;
};
