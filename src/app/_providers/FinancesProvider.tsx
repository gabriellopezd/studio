
'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode, useCallback, useEffect } from 'react';
import { collection, query, where, orderBy, doc, Timestamp, serverTimestamp, getDocs, writeBatch, increment, getDoc, arrayUnion, collectionGroup, limit } from 'firebase/firestore';
import { useFirebase, useCollectionData, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUI } from './UIProvider';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';
import { useTasks } from './TasksProvider';

interface FinancesContextState {
    firestore: any;
    user: any;
    transactions: any[] | null;
    transactionsLoading: boolean;
    annualTransactions: any[] | null;
    annualTransactionsLoading: boolean;
    budgets: any[] | null;
    budgetsLoading: boolean;
    shoppingLists: any[] | null;
    shoppingListsLoading: boolean;
    shoppingListItems: any[] | null;
    shoppingListItemsLoading: boolean;
    activeShoppingLists: any[];
    recurringExpenses: any[] | null;
    recurringExpensesLoading: boolean;
    recurringIncomes: any[] | null;
    recurringIncomesLoading: boolean;
    financesLoading: boolean;

    currentMonth: Date;
    setCurrentMonth: (date: Date | ((prev: Date) => Date)) => void;

    // Derived State
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyBalance: number;
    monthlySavingsRate: number;
    projectedMonthlyIncome: number;
    projectedMonthlyExpense: number;
    projectedMonthlyBalance: number;
    projectedMonthlySavingsRate: number;
    budget503020: any | null;
    upcomingPayments: any[];
    pendingRecurringExpenses: any[];
    paidRecurringExpenses: any[];
    pendingRecurringIncomes: any[];
    receivedRecurringIncomes: any[];
    pendingExpensesTotal: number;
    pendingIncomesTotal: number;
    expenseCategories: string[];
    incomeCategories: string[];
    categoriesWithoutBudget: string[];
    
    annualFlowData: any[];
    annualCategorySpending: any[];
    monthlySummaryData: any[];
    annualTotalIncome: number;
    annualTotalExpense: number;
    annualNetSavings: number;
    annualSavingsRate: number;
    annualProjectedIncome: number;
    annualProjectedExpense: number;
    annualProjectedSavings: number;
    annualProjectedSavingsRate: number;
    annualIncomeCategorySpending: any[];

    // Actions
    handleSaveTransaction: () => Promise<void>;
    handleDeleteTransaction: () => Promise<void>;
    handleSaveBudget: () => Promise<void>;
    handleSaveRecurringItem: () => Promise<void>;
    handleDeleteRecurringItem: () => Promise<void>;
    handlePayRecurringItem: (item: any, type: 'income' | 'expense') => Promise<void>;
    handleRevertRecurringItem: (item: any, type: 'income' | 'expense') => Promise<void>;
    handleOmitRecurringItem: (item: any, type: 'income' | 'expense') => Promise<void>;
    handleUpdateList: () => Promise<void>;
    handleSaveShoppingListItem: (categoryName: string) => Promise<void>;
    handleConfirmPurchase: () => Promise<void>;
    handleDeleteShoppingListItem: (itemId: string) => Promise<void>;
    handleRevertPurchase: (itemToRevert: any) => Promise<void>;
    handleResetVariableData: () => Promise<void>;
    handleResetFixedData: () => Promise<void>;
    handleToggleShoppingList: (listName: string, currentStatus: boolean) => Promise<void>;
    handleDeleteList: (listId: string) => Promise<void>;
}

const FinancesContext = createContext<FinancesContextState | undefined>(undefined);

export const useFinances = () => {
    const context = useContext(FinancesContext);
    if (!context) {
        throw new Error('useFinances must be used within a FinancesProvider');
    }
    return context;
};

export const FinancesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const { formState, setFormState, handleCloseModal } = useUI();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const monthIdentifier = useMemo(() => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`, [currentMonth]);

    // --- Data Fetching ---
    const transactionsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
        return query(
            collection(firestore, 'users', user.uid, 'transactions'),
            where('date', '>=', start.toISOString()),
            where('date', '<=', end.toISOString()),
            orderBy('date', 'desc')
        );
    }, [user, firestore, currentMonth]);
    const { data: transactions, isLoading: transactionsLoading } = useCollectionData(transactionsQuery);

    const annualTransactionsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const year = currentMonth.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        return query(
            collection(firestore, 'users', user.uid, 'transactions'),
            where('date', '>=', startOfYear.toISOString()),
            where('date', '<=', endOfYear.toISOString()),
        );
    }, [user, firestore, currentMonth]);
    const { data: annualTransactions, isLoading: annualTransactionsLoading } = useCollectionData(annualTransactionsQuery);
    
    const budgetsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'budgets'));
    }, [user, firestore]);
    const { data: budgets, isLoading: budgetsLoading } = useCollectionData(budgetsQuery);

    const shoppingListsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/shoppingLists`));
    }, [user, firestore]);
    const { data: shoppingLists, isLoading: shoppingListsLoading } = useCollectionData(shoppingListsQuery);
    
    const shoppingListItemsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/shoppingListItems`),
            where('month', '==', monthIdentifier)
        );
    }, [user, firestore, monthIdentifier]);
    const { data: shoppingListItems, isLoading: shoppingListItemsLoading } = useCollectionData(shoppingListItemsQuery);

    const recurringExpensesQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/recurringExpenses`), orderBy('dayOfMonth'));
    }, [user, firestore]);
    const { data: recurringExpenses, isLoading: recurringExpensesLoading } = useCollectionData(recurringExpensesQuery);

    const recurringIncomesQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/recurringIncomes`), orderBy('dayOfMonth'));
    }, [user, firestore]);
    const { data: recurringIncomes, isLoading: recurringIncomesLoading } = useCollectionData(recurringIncomesQuery);


    // --- Derived State ---
    const derivedState = useMemo(() => {
        const allTransactionsData = transactions || [];
        const allAnnualTransactionsData = annualTransactions || [];
        const allBudgetsData = budgets || [];
        const allShoppingListsData = shoppingLists || [];
        const allRecurringExpensesData = recurringExpenses || [];
        const allRecurringIncomesData = recurringIncomes || [];
        
        const expenseCategoriesFromBudgets = allBudgetsData.map((b:any) => b.categoryName);
        const expenseCategoriesFromShoppingLists = allShoppingListsData.map((l:any) => l.name);
        const expenseCategoriesFromRecurring = allRecurringExpensesData.map((e:any) => e.category);
        const expenseCategoriesFromTransactions = allTransactionsData.filter(t => t.type === 'expense').map((t:any) => t.category);
        const expenseCategories = [...new Set([...expenseCategoriesFromBudgets, ...expenseCategoriesFromShoppingLists, ...expenseCategoriesFromRecurring, ...expenseCategoriesFromTransactions, ...PRESET_EXPENSE_CATEGORIES])].filter(Boolean).sort();

        const currentMonthFBIdentifier = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const monthlyIncome = allTransactionsData.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
        const monthlyExpenses = allTransactionsData.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
        const monthlyBalance = monthlyIncome - monthlyExpenses;
        const monthlySavingsRate = monthlyIncome > 0 ? (monthlyBalance / monthlyIncome) * 100 : 0;
        
        const activeMonthIndex = currentMonth.getMonth();
        
        const pendingRecurringExpenses = allRecurringExpensesData.filter((e: any) => 
            e.lastInstanceCreated !== currentMonthFBIdentifier &&
            (!e.activeMonths || e.activeMonths.includes(activeMonthIndex)) &&
            !e.overriddenMonths?.includes(currentMonthFBIdentifier)
        );
        const paidRecurringExpenses = allRecurringExpensesData.filter((e: any) => e.lastInstanceCreated === currentMonthFBIdentifier);
        const pendingRecurringIncomes = allRecurringIncomesData.filter((i: any) => 
            i.lastInstanceCreated !== currentMonthFBIdentifier &&
            (!i.activeMonths || i.activeMonths.includes(activeMonthIndex)) &&
            !i.overriddenMonths?.includes(currentMonthFBIdentifier)
        );
        const receivedRecurringIncomes = allRecurringIncomesData.filter((i: any) => i.lastInstanceCreated === currentMonthFBIdentifier);
        
        const pendingIncomesTotal = pendingRecurringIncomes.reduce((s: number, i: any) => s + i.amount, 0);
        const pendingExpensesFromRecurring = pendingRecurringExpenses.reduce((s: number, e: any) => s + e.amount, 0);
        const pendingShoppingListExpenses = (shoppingListItems || []).filter((item: any) => !item.isPurchased).reduce((sum: number, item: any) => sum + (item.estimatedPrice || 0), 0);
        const pendingExpensesTotal = pendingExpensesFromRecurring + pendingShoppingListExpenses;
        
        const projectedMonthlyIncome = monthlyIncome + pendingIncomesTotal;
        const projectedMonthlyExpense = monthlyExpenses + pendingExpensesTotal;
        const projectedMonthlyBalance = projectedMonthlyIncome - projectedMonthlyExpense;
        const projectedMonthlySavingsRate = projectedMonthlyIncome > 0 ? (projectedMonthlyBalance / projectedMonthlyIncome) * 100 : 0;
        
        let budget503020 = null;
        if (projectedMonthlyIncome > 0) {
            const needsSpend = allTransactionsData.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Necesidades').reduce((s: number, t: any) => s + t.amount, 0);
            const wantsSpend = allTransactionsData.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Deseos').reduce((s: number, t: any) => s + t.amount, 0);
            const savingsSpend = allTransactionsData.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Ahorros y Deudas').reduce((s: number, t: any) => s + t.amount, 0);
            budget503020 = {
                needs: { budget: projectedMonthlyIncome * 0.5, spend: needsSpend, progress: (needsSpend / (projectedMonthlyIncome * 0.5)) * 100 },
                wants: { budget: projectedMonthlyIncome * 0.3, spend: wantsSpend, progress: (wantsSpend / (projectedMonthlyIncome * 0.3)) * 100 },
                savings: { budget: projectedMonthlyIncome * 0.2, spend: savingsSpend, progress: (savingsSpend / (projectedMonthlyIncome * 0.2)) * 100 },
            };
        }
        
        const upcomingPayments = allRecurringExpensesData.filter((e: any) => {
            const isPaidThisMonth = e.lastInstanceCreated === `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
            return !isPaidThisMonth && (e.activeMonths?.includes(currentMonth.getMonth()) ?? true) && !e.overriddenMonths?.includes(`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`);
        }).sort((a: any, b: any) => a.dayOfMonth - b.dayOfMonth);

        const incomeCategories = [...new Set(["Salario", "Bonificación", "Otro", ...allRecurringIncomesData.map((i: any) => i.category), ...allTransactionsData.filter((t: any) => t.type === 'income').map((t: any) => t.category)])].filter(Boolean).sort();
        const categoriesWithoutBudget = expenseCategories.filter(cat => !allBudgetsData.some((b: any) => b.categoryName === cat));

        // Annual Analytics
        const annualTotalIncome = allAnnualTransactionsData.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
        const annualTotalExpense = allAnnualTransactionsData.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
        const annualNetSavings = annualTotalIncome - annualTotalExpense;
        const annualSavingsRate = annualTotalIncome > 0 ? (annualNetSavings / annualTotalIncome) * 100 : 0;
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const annualFlowData = Array.from({length: 12}, (_, i) => ({ name: monthNames[i], ingresos: 0, gastos: 0 }));
        allAnnualTransactionsData.forEach((t: any) => {
            const monthIndex = new Date(t.date).getMonth();
            if (t.type === 'income') {
                annualFlowData[monthIndex].ingresos += t.amount;
            } else {
                annualFlowData[monthIndex].gastos += t.amount;
            }
        });
        const annualCategorySpendingMap = allAnnualTransactionsData.filter((t: any) => t.type === 'expense').reduce((acc: any, t: any) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
        const annualCategorySpending = Object.entries(annualCategorySpendingMap).map(([name, value]) => ({ name, value }));
        
        const annualIncomeCategorySpendingMap = allAnnualTransactionsData.filter((t: any) => t.type === 'income').reduce((acc: any, t: any) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
        const annualIncomeCategorySpending = Object.entries(annualIncomeCategorySpendingMap).map(([name, value]) => ({ name, value }));

        const monthlySummaryData = monthNames.map((name, i) => {
            const ingresos = annualFlowData[i].ingresos;
            const gastos = annualFlowData[i].gastos;
            return { month: name, ingresos, gastos, balance: ingresos - gastos };
        });

        // Projected Annual Analytics
        const totalAnnualRecurringIncome = allRecurringIncomesData.reduce((total: number, item: any) => total + (item.amount * (item.activeMonths?.length ?? 12)), 0);
        const nonRecurringAnnualIncome = allAnnualTransactionsData.filter((t: any) => t.type === 'income' && !allRecurringIncomesData.some(ri => ri.name === t.description)).reduce((s: number, t: any) => s + t.amount, 0);
        const annualProjectedIncome = totalAnnualRecurringIncome + nonRecurringAnnualIncome;

        const totalAnnualRecurringExpense = allRecurringExpensesData.reduce((total: number, item: any) => total + (item.amount * (item.activeMonths?.length ?? 12)), 0);
        const nonRecurringAnnualExpense = allAnnualTransactionsData.filter((t: any) => t.type === 'expense' && !allRecurringExpensesData.some(re => re.name === t.description)).reduce((s: number, t: any) => s + t.amount, 0);
        const annualProjectedExpense = totalAnnualRecurringExpense + nonRecurringAnnualExpense;

        const annualProjectedSavings = annualProjectedIncome - annualProjectedExpense;
        const annualProjectedSavingsRate = annualProjectedIncome > 0 ? (annualProjectedSavings / annualProjectedIncome) * 100 : 0;
        
        const activeShoppingLists = (allShoppingListsData || []).filter(list => list.isActive && (!list.activeMonths || list.activeMonths.includes(currentMonth.getMonth())));


        return { monthlyIncome, monthlyExpenses, monthlyBalance, monthlySavingsRate, projectedMonthlyIncome, projectedMonthlyExpense, projectedMonthlyBalance, projectedMonthlySavingsRate, budget503020, upcomingPayments, pendingRecurringExpenses, paidRecurringExpenses, pendingRecurringIncomes, receivedRecurringIncomes, pendingExpensesTotal, pendingIncomesTotal, expenseCategories, incomeCategories, categoriesWithoutBudget, annualFlowData, annualCategorySpending, monthlySummaryData, annualTotalIncome, annualTotalExpense, annualNetSavings, annualSavingsRate, annualProjectedIncome, annualProjectedExpense, annualProjectedSavings, annualProjectedSavingsRate, annualIncomeCategorySpending, activeShoppingLists };
    }, [transactions, annualTransactions, budgets, shoppingLists, shoppingListItems, recurringExpenses, recurringIncomes, currentMonth]);

    // --- Actions ---

    const handleSaveTransaction = useCallback(async () => {
        if (!user || !firestore || !formState.description || !formState.amount || !formState.category || !formState.date) return;
        
        const { id, ...data } = formState;
        const amount = parseFloat(data.amount);
        if (isNaN(amount)) return;
        
        const batch = writeBatch(firestore);
        
        const serializableData = { ...data, amount, date: new Date(data.date).toISOString(), budgetFocus: data.type === 'expense' ? data.budgetFocus : null, userId: user.uid };

        if (id) {
            const originalTransaction = transactions?.find(t => t.id === id);
            if (!originalTransaction) return;

            const transactionRef = doc(firestore, 'users', user.uid, 'transactions', id);
            batch.update(transactionRef, serializableData);

            const amountDifference = amount - originalTransaction.amount;
            if (originalTransaction.type === 'expense' && serializableData.type === 'expense') {
                 if (originalTransaction.category === serializableData.category) {
                    const budget = budgets?.find(b => b.categoryName === serializableData.category);
                    if (budget) batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(amountDifference) });
                 } else {
                    const oldBudget = budgets?.find(b => b.categoryName === originalTransaction.category);
                    if (oldBudget) batch.update(doc(firestore, 'users', user.uid, 'budgets', oldBudget.id), { currentSpend: increment(-originalTransaction.amount) });
                    const newBudget = budgets?.find(b => b.categoryName === serializableData.category);
                    if (newBudget) batch.update(doc(firestore, 'users', user.uid, 'budgets', newBudget.id), { currentSpend: increment(amount) });
                 }
            } else if (originalTransaction.type === 'expense' && serializableData.type === 'income') {
                const oldBudget = budgets?.find(b => b.categoryName === originalTransaction.category);
                if (oldBudget) batch.update(doc(firestore, 'users', user.uid, 'budgets', oldBudget.id), { currentSpend: increment(-originalTransaction.amount) });
            } else if (originalTransaction.type === 'income' && serializableData.type === 'expense') {
                const newBudget = budgets?.find(b => b.categoryName === serializableData.category);
                if (newBudget) batch.update(doc(firestore, 'users', user.uid, 'budgets', newBudget.id), { currentSpend: increment(amount) });
            }
        } else {
            const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
            batch.set(newTransactionRef, { ...serializableData, createdAt: serverTimestamp() });
            
            if (serializableData.type === 'expense') {
                const budget = budgets?.find(b => b.categoryName === serializableData.category);
                if (budget) batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(amount) });
            }
        }

        await batch.commit();
        handleCloseModal('transaction');
    }, [user, firestore, formState, transactions, budgets, handleCloseModal]);

    const handleDeleteTransaction = useCallback(async () => {
        if (!formState?.id || !user || !firestore) return;
      
        const batch = writeBatch(firestore);
        const transactionToDelete = transactions?.find(t => t.id === formState.id);
        if (!transactionToDelete) return;
      
        batch.delete(doc(firestore, 'users', user.uid, 'transactions', transactionToDelete.id));
      
        if (transactionToDelete.type === 'expense') {
          const budget = budgets?.find(b => b.categoryName === transactionToDelete.category);
          if (budget) batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(-transactionToDelete.amount) });
      
          const shoppingListItem = shoppingListItems?.find(item => item.transactionId === transactionToDelete.id);
          if(shoppingListItem) {
            batch.update(doc(firestore, 'users', user.uid, 'shoppingListItems', shoppingListItem.id), {
                isPurchased: false,
                finalPrice: null,
                transactionId: null,
            });
          }
      
          const recurringExpense = recurringExpenses?.find(re => re.lastTransactionId === transactionToDelete.id);
          if (recurringExpense) batch.update(doc(firestore, 'users', user.uid, 'recurringExpenses', recurringExpense.id), { lastInstanceCreated: null, lastTransactionId: null });
        
        } else {
          const recurringIncome = recurringIncomes?.find(ri => ri.lastTransactionId === transactionToDelete.id);
          if (recurringIncome) batch.update(doc(firestore, 'users', user.uid, 'recurringIncomes', recurringIncome.id), { lastInstanceCreated: null, lastTransactionId: null });
        }
      
        await batch.commit();
        toast({ title: 'Transacción eliminada' });
        handleCloseModal('deleteTransaction');
    }, [user, firestore, formState, transactions, budgets, shoppingListItems, recurringExpenses, recurringIncomes, handleCloseModal, toast]);

    const handleSaveBudget = useCallback(async () => {
        if (!user || !firestore || !formState.categoryName || !formState.monthlyLimit) return;
        const { id, categoryName, monthlyLimit } = formState;
        const limit = parseFloat(monthlyLimit);
        if (isNaN(limit)) return;
        
        if (!id && budgets?.some(b => b.categoryName.toLowerCase() === categoryName.toLowerCase())) {
            toast({ variant: "destructive", title: "Categoría Duplicada", description: `El presupuesto para "${categoryName}" ya existe.` });
            return;
        }
        
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'budgets', id), { monthlyLimit: limit });
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'budgets'), { categoryName, monthlyLimit: limit, currentSpend: 0, userId: user.uid });
        }
        handleCloseModal('budget');
    }, [user, firestore, formState, budgets, handleCloseModal, toast]);

    const handleSaveRecurringItem = useCallback(async () => {
        if (!user || !firestore || !formState.name || !formState.amount || !formState.category || !formState.dayOfMonth || !formState.type) {
            toast({ variant: "destructive", title: "Datos inválidos", description: "Todos los campos son obligatorios." });
            return;
        }

        const { id, type, ...data } = formState;
        const amount = parseFloat(data.amount);
        const dayOfMonth = parseInt(data.dayOfMonth, 10);

        if (isNaN(amount) || isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
            toast({ variant: "destructive", title: "Datos numéricos inválidos." });
            return;
        }

        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const serializableData = { ...data, amount, dayOfMonth, userId: user.uid };

        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, collectionName, id), serializableData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, collectionName), serializableData);
        }
        handleCloseModal('recurringItem');
    }, [user, firestore, formState, handleCloseModal, toast]);

    const handleDeleteRecurringItem = useCallback(async () => {
        if (!formState.id || !user || !firestore) return;
        const collectionName = formState.type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, collectionName, formState.id));
        handleCloseModal('deleteRecurring');
    }, [user, firestore, formState, handleCloseModal]);

    const handlePayRecurringItem = useCallback(async (item: any, type: 'income' | 'expense') => {
        if (!user || !firestore) return;
        const batch = writeBatch(firestore);
        const currentMonthIdentifier = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

        const transactionData = { type, description: item.name, category: item.category, date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), item.dayOfMonth).toISOString(), amount: item.amount, budgetFocus: type === 'expense' ? item.budgetFocus : null, userId: user.uid, createdAt: serverTimestamp() };
        const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
        batch.set(newTransactionRef, transactionData);
        
        if (type === 'expense' && budgets?.find(b => b.categoryName === item.category)) {
            const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budgets.find(b => b.categoryName === item.category)!.id);
            batch.update(budgetRef, { currentSpend: increment(item.amount) });
        }
        
        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
        batch.update(itemRef, { lastInstanceCreated: currentMonthIdentifier, lastTransactionId: newTransactionRef.id });

        await batch.commit();
        toast({ title: `Registro exitoso`, description: `${item.name} ha sido registrado.` });
    }, [user, firestore, currentMonth, budgets, toast]);

    const handleRevertRecurringItem = useCallback(async (item: any, type: 'income' | 'expense') => {
        if (!user || !item.lastTransactionId || !firestore) return;
        const batch = writeBatch(firestore);
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', item.lastTransactionId);
        const transactionSnap = await getDoc(transactionRef);

        if (transactionSnap.exists()) {
            const transactionData = transactionSnap.data();
            batch.delete(transactionRef);
            if (type === 'expense') {
                const budget = budgets?.find(b => b.categoryName === transactionData.category);
                if (budget) batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(-transactionData.amount) });
            }
        }

        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
        batch.update(itemRef, { lastInstanceCreated: null, lastTransactionId: null });
        await batch.commit();
        toast({ title: 'Reversión exitosa', description: `Se ha deshecho el registro de ${item.name}.` });
    }, [user, firestore, budgets, toast]);

    const handleOmitRecurringItem = useCallback(async (item: any, type: 'income' | 'expense') => {
        if (!user || !firestore) return;
        
        const currentMonthIdentifier = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);

        await updateDocumentNonBlocking(itemRef, {
            overriddenMonths: arrayUnion(currentMonthIdentifier)
        });

        toast({ title: 'Item Omitido', description: `${item.name} ha sido omitido para este mes.` });
    }, [user, firestore, currentMonth, toast]);
    
    const handleUpdateList = useCallback(async () => {
        if (!user || !firestore || !formState.id || !formState.name) return;
        const { id, name, activeMonths } = formState;
        await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'shoppingLists', id), { name, activeMonths });
        handleCloseModal('editList');
    }, [user, firestore, formState, handleCloseModal]);

    const handleSaveShoppingListItem = useCallback(async (categoryName: string) => {
        if (!categoryName || !user || !firestore || !formState.itemName || !formState.itemAmount) return;
        const list = shoppingLists?.find(l => l.name === categoryName);
        if (!list) return;

        const newItem = {
            month: monthIdentifier,
            categoryName: categoryName,
            budgetFocus: list.budgetFocus,
            name: formState.itemName,
            estimatedPrice: parseFloat(formState.itemAmount),
            finalPrice: null,
            isPurchased: false,
            transactionId: null,
            createdAt: serverTimestamp(),
            userId: user.uid,
        };
        await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'shoppingListItems'), newItem);
        setFormState({});
    }, [user, firestore, formState, monthIdentifier, shoppingLists, setFormState]);

    const handleConfirmPurchase = useCallback(async () => {
        if (!user || !firestore || !formState.id || !formState.purchasePrice) return;
      
        const itemToPurchase = shoppingListItems?.find(i => i.id === formState.id);
        if (!itemToPurchase) return;
      
        const price = parseFloat(formState.purchasePrice);
        if (isNaN(price)) return;
      
        const batch = writeBatch(firestore);
      
        // 1. Create the new transaction
        const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
        const transactionData = {
          type: 'expense' as const,
          description: itemToPurchase.name,
          category: itemToPurchase.categoryName,
          amount: price,
          date: new Date().toISOString(),
          budgetFocus: itemToPurchase.budgetFocus,
          userId: user.uid,
          createdAt: serverTimestamp(),
        };
        batch.set(newTransactionRef, transactionData);
      
        // 2. Update the shopping list item
        const itemRef = doc(firestore, 'users', user.uid, 'shoppingListItems', itemToPurchase.id);
        batch.update(itemRef, {
          isPurchased: true,
          finalPrice: price,
          transactionId: newTransactionRef.id,
        });
      
        // 3. Update the corresponding budget
        const budget = budgets?.find(b => b.categoryName === itemToPurchase.categoryName);
        if (budget) {
          const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
          batch.update(budgetRef, { currentSpend: increment(price) });
        }
      
        await batch.commit();
        handleCloseModal('purchaseItem');
        toast({ title: 'Compra registrada', description: `${itemToPurchase.name} se ha marcado como comprado.` });
      
    }, [user, firestore, formState, shoppingListItems, budgets, handleCloseModal, toast]);

    const handleDeleteShoppingListItem = useCallback(async (itemId: string) => {
        if (!itemId || !user || !firestore) return;
        const itemToDelete = shoppingListItems?.find((i: any) => i.id === itemId);
        if (!itemToDelete) return;

        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'users', user.uid, 'shoppingListItems', itemId));
        
        if (itemToDelete.isPurchased && itemToDelete.transactionId) {
            batch.delete(doc(firestore, 'users', user.uid, 'transactions', itemToDelete.transactionId));
            const budget = budgets?.find(b => b.categoryName === itemToDelete.categoryName);
            if (budget && itemToDelete.finalPrice) {
                batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(-itemToDelete.finalPrice) });
            }
        }
        await batch.commit();
    }, [user, firestore, shoppingListItems, budgets]);

    const handleRevertPurchase = useCallback(async (itemToRevert: any) => {
        if (!itemToRevert || !user || !firestore) return;
        
        const batch = writeBatch(firestore);
        
        const itemRef = doc(firestore, 'users', user.uid, 'shoppingListItems', itemToRevert.id);
        batch.update(itemRef, { isPurchased: false, finalPrice: null, transactionId: null });

        if (itemToRevert.transactionId) {
            batch.delete(doc(firestore, 'users', user.uid, 'transactions', itemToRevert.transactionId));
            const budget = budgets?.find(b => b.categoryName === itemToRevert.categoryName);
            if (budget && itemToRevert.finalPrice) {
                batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(-itemToRevert.finalPrice) });
            }
        }
        await batch.commit();
    }, [user, firestore, budgets]);
    
    const handleResetVariableData = useCallback(async () => {
        if (!user || !firestore) return;
        handleCloseModal('resetVariableFinance');
        
        try {
            const batch = writeBatch(firestore);
            
            const collectionsToDelete = ['shoppingListItems', 'budgets'];
            for (const col of collectionsToDelete) {
                const snapshot = await getDocs(collection(firestore, 'users', user.uid, col));
                snapshot.forEach(doc => batch.delete(doc.ref));
            }
            
            await batch.commit();

            toast({ title: 'Planificación Variable Reiniciada', description: 'Tus listas de compra y presupuestos han sido reiniciados.' });
        } catch (error) {
            console.error("Error resetting variable data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reiniciar la planificación variable.' });
        }
    }, [user, firestore, handleCloseModal, toast]);
    
    const handleResetFixedData = useCallback(async () => {
        if (!user || !firestore) return;
        handleCloseModal('resetFixedFinance');
        
        try {
            const batch = writeBatch(firestore);
            
            const collectionsToDelete = ['recurringIncomes', 'recurringExpenses'];
            for (const col of collectionsToDelete) {
                const snapshot = await getDocs(collection(firestore, 'users', user.uid, col));
                snapshot.forEach(doc => batch.delete(doc.ref));
            }

            await batch.commit();

            toast({ title: 'Datos Fijos Reiniciados', description: 'Tus ingresos y gastos fijos han sido eliminados.' });
        } catch (error) {
            console.error("Error resetting fixed data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron reiniciar los datos fijos.' });
        }
    }, [user, firestore, handleCloseModal, toast]);
    
    const handleToggleShoppingList = useCallback(async (listName: string, currentStatus: boolean) => {
        if (!user || !firestore) return;
        
        const q = query(collection(firestore, 'users', user.uid, 'shoppingLists'), where('name', '==', listName));
        const listSnap = await getDocs(q);
        
        if (listSnap.empty) {
             await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'shoppingLists'), { 
                name: listName,
                isActive: true, 
                userId: user.uid,
                createdAt: serverTimestamp(),
                order: 99,
                budgetFocus: 'Necesidades',
            });
        } else {
             const listRef = listSnap.docs[0].ref;
             await updateDocumentNonBlocking(listRef, { isActive: !currentStatus });
        }
    }, [user, firestore]);
    
    const handleDeleteList = useCallback(async (listId: string) => {
        if (!user || !firestore || !listId) return;
        const listRef = doc(firestore, 'users', user.uid, 'shoppingLists', listId);
        await updateDocumentNonBlocking(listRef, { isActive: false });
        toast({ title: 'Categoría Desactivada' });
        handleCloseModal('deleteList');
    }, [user, firestore, toast, handleCloseModal]);

    return (
        <FinancesContext.Provider value={{
            firestore,
            user,
            transactions,
            transactionsLoading,
            annualTransactions,
            annualTransactionsLoading,
            budgets,
            budgetsLoading,
            shoppingLists,
            shoppingListsLoading,
            shoppingListItems,
            shoppingListItemsLoading,
            recurringExpenses,
            recurringExpensesLoading,
            recurringIncomes,
            recurringIncomesLoading,
            financesLoading: recurringExpensesLoading || recurringIncomesLoading || shoppingListsLoading || budgetsLoading || transactionsLoading,
            currentMonth,
            setCurrentMonth,
            ...derivedState,
            handleSaveTransaction,
            handleDeleteTransaction,
            handleSaveBudget,
            handleSaveRecurringItem,
            handleDeleteRecurringItem,
            handlePayRecurringItem,
            handleRevertRecurringItem,
            handleOmitRecurringItem,
            handleUpdateList,
            handleSaveShoppingListItem,
            handleConfirmPurchase,
            handleDeleteShoppingListItem,
            handleRevertPurchase,
            handleResetVariableData,
            handleResetFixedData,
            handleToggleShoppingList,
            handleDeleteList,
        }}>
            {children}
        </FinancesContext.Provider>
    );
};
