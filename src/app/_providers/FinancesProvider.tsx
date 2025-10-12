
'use client';

import React, { createContext, useContext, useMemo, useState, ReactNode, useCallback, useEffect } from 'react';
import { collection, query, where, orderBy, doc, Timestamp, serverTimestamp, getDocs, writeBatch, increment, getDoc, arrayUnion, collectionGroup, limit, setDoc } from 'firebase/firestore';
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
    budgets: any | null; // This will hold the single budget document for the month
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
    const { taskCategories } = useTasks();

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
    
    // Budgets are now a single document per month.
    const budgetsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'budgets'), where('month', '==', monthIdentifier), limit(1));
    }, [user, firestore, monthIdentifier]);
    const { data: monthlyBudgetDoc, isLoading: budgetsLoading } = useCollectionData(budgetsQuery);
    const budgets = useMemo(() => {
        if (!monthlyBudgetDoc || monthlyBudgetDoc.length === 0 || !transactions) return null;
        const budgetData = monthlyBudgetDoc[0];
        const spends = (transactions || []).filter(t => t.type === 'expense').reduce((acc, t) => {
            if (budgetData.categories[t.category] !== undefined) {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
            }
            return acc;
        }, {} as Record<string, number>);
        return { ...budgetData, spends };
    }, [monthlyBudgetDoc, transactions]);


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

     // Effect to auto-create budget for the current month if it doesn't exist
    useEffect(() => {
        if (user && firestore && !budgetsLoading && monthlyBudgetDoc?.length === 0) {
            const createNewMonthBudget = async () => {
                const newBudgetRef = doc(firestore, 'users', user.uid, 'budgets', monthIdentifier);
                
                // Try to get last month's budget to use as a template
                const lastMonth = new Date(currentMonth);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                const lastMonthId = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
                const lastBudgetRef = doc(firestore, 'users', user.uid, 'budgets', lastMonthId);
                const lastBudgetSnap = await getDoc(lastBudgetRef);
                
                let categories: { [key: string]: number } = {};
                if (lastBudgetSnap.exists()) {
                    categories = lastBudgetSnap.data().categories;
                } else {
                    // Fallback to default categories if no previous month found
                    PRESET_EXPENSE_CATEGORIES.forEach(cat => {
                        categories[cat] = 100000; // Default limit
                    });
                }
                
                await setDoc(newBudgetRef, {
                    month: monthIdentifier,
                    categories: categories,
                    userId: user.uid,
                });
            };
            createNewMonthBudget();
        }
    }, [user, firestore, budgetsLoading, monthlyBudgetDoc, monthIdentifier, currentMonth]);


    // --- Derived State ---
    const derivedState = useMemo(() => {
        const allTransactionsData = transactions || [];
        const allAnnualTransactionsData = annualTransactions || [];
        const allBudgetsData = budgets;
        const allShoppingListsData = shoppingLists || [];
        const allRecurringExpensesData = recurringExpenses || [];
        const allRecurringIncomesData = recurringIncomes || [];
        
        const expenseCategoriesFromRecurring = allRecurringExpensesData.map((e:any) => e.category);
        const expenseCategoriesFromTransactions = allTransactionsData.filter(t => t.type === 'expense').map((t:any) => t.category);
        const expenseCategories = [...new Set([...Object.keys(allBudgetsData?.categories || {}), ...expenseCategoriesFromRecurring, ...expenseCategoriesFromTransactions, ...PRESET_EXPENSE_CATEGORIES])].filter(Boolean).sort();

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
            const allSpendableTransactions = [...allTransactionsData, ...pendingRecurringExpenses.map(p => ({...p, type: 'expense'}))];
            const needsSpend = allSpendableTransactions.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Necesidades').reduce((s: number, t: any) => s + t.amount, 0);
            const wantsSpend = allSpendableTransactions.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Deseos').reduce((s: number, t: any) => s + t.amount, 0);
            const savingsSpend = allSpendableTransactions.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Ahorros y Deudas').reduce((s: number, t: any) => s + t.amount, 0);
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
        const categoriesWithoutBudget = expenseCategories.filter(cat => !(allBudgetsData?.categories && allBudgetsData.categories[cat] !== undefined));

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

        if (id) { // This part is complex due to budget model change. For now, we simplify it.
            const transactionRef = doc(firestore, 'users', user.uid, 'transactions', id);
            batch.update(transactionRef, serializableData);
        } else {
            const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
            batch.set(newTransactionRef, { ...serializableData, createdAt: serverTimestamp() });
        }

        await batch.commit();
        handleCloseModal('transaction');
    }, [user, firestore, formState, transactions, handleCloseModal]);

    const handleDeleteTransaction = useCallback(async () => {
        if (!formState?.id || !user || !firestore) return;
      
        const batch = writeBatch(firestore);
        const transactionToDelete = transactions?.find(t => t.id === formState.id);
        if (!transactionToDelete) return;
      
        batch.delete(doc(firestore, 'users', user.uid, 'transactions', transactionToDelete.id));
      
        if (transactionToDelete.type === 'expense') {
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
    }, [user, firestore, formState, transactions, shoppingListItems, recurringExpenses, recurringIncomes, handleCloseModal, toast]);

    const handleSaveBudget = useCallback(async () => {
        if (!user || !firestore || !formState.categoryName || !formState.monthlyLimit) return;
        const { categoryName, monthlyLimit } = formState;
        const limit = parseFloat(monthlyLimit);
        if (isNaN(limit)) return;
    
        const budgetRef = doc(firestore, 'users', user.uid, 'budgets', monthIdentifier);
    
        // Use dot notation to update a specific field in the map
        await updateDocumentNonBlocking(budgetRef, {
            [`categories.${categoryName}`]: limit
        });
    
        handleCloseModal('budget');
    }, [user, firestore, formState, monthIdentifier, handleCloseModal]);
    

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
        
        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
        batch.update(itemRef, { lastInstanceCreated: currentMonthIdentifier, lastTransactionId: newTransactionRef.id });

        await batch.commit();
        toast({ title: `Registro exitoso`, description: `${item.name} ha sido registrado.` });
    }, [user, firestore, currentMonth, toast]);

    const handleRevertRecurringItem = useCallback(async (item: any, type: 'income' | 'expense') => {
        if (!user || !item.lastTransactionId || !firestore) return;
        const batch = writeBatch(firestore);
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', item.lastTransactionId);

        batch.delete(transactionRef);

        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
        batch.update(itemRef, { lastInstanceCreated: null, lastTransactionId: null });
        await batch.commit();
        toast({ title: 'Reversión exitosa', description: `Se ha deshecho el registro de ${item.name}.` });
    }, [user, firestore, toast]);

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
      
        await batch.commit();
        handleCloseModal('purchaseItem');
        toast({ title: 'Compra registrada', description: `${itemToPurchase.name} se ha marcado como comprado.` });
      
    }, [user, firestore, formState, shoppingListItems, handleCloseModal, toast]);

    const handleDeleteShoppingListItem = useCallback(async (itemId: string) => {
        if (!itemId || !user || !firestore) return;
        const itemToDelete = shoppingListItems?.find((i: any) => i.id === itemId);
        if (!itemToDelete) return;

        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, 'users', user.uid, 'shoppingListItems', itemId));
        
        if (itemToDelete.isPurchased && itemToDelete.transactionId) {
            batch.delete(doc(firestore, 'users', user.uid, 'transactions', itemToDelete.transactionId));
        }
        await batch.commit();
    }, [user, firestore, shoppingListItems]);

    const handleRevertPurchase = useCallback(async (itemToRevert: any) => {
        if (!itemToRevert || !user || !firestore) return;
        
        const batch = writeBatch(firestore);
        
        const itemRef = doc(firestore, 'users', user.uid, 'shoppingListItems', itemToRevert.id);
        batch.update(itemRef, { isPurchased: false, finalPrice: null, transactionId: null });

        if (itemToRevert.transactionId) {
            batch.delete(doc(firestore, 'users', user.uid, 'transactions', itemToRevert.transactionId));
        }
        await batch.commit();
    }, [user, firestore]);
    
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
            
            // Re-initialize the budget for the current month
            const newBudgetRef = doc(firestore, 'users', user.uid, 'budgets', monthIdentifier);
            const defaultCategories = PRESET_EXPENSE_CATEGORIES.reduce((acc: {[key: string]: number}, cat) => {
                acc[cat] = 100000;
                return acc;
            }, {});
            batch.set(newBudgetRef, { month: monthIdentifier, categories: defaultCategories, userId: user.uid });


            await batch.commit();

            toast({ title: 'Planificación Variable Reiniciada', description: 'Tus listas de compra y presupuestos han sido reiniciados.' });
        } catch (error) {
            console.error("Error resetting variable data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reiniciar la planificación variable.' });
        }
    }, [user, firestore, handleCloseModal, toast, monthIdentifier]);
    
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

    const allExpenseCategories = useMemo(() => {
        const fromRecurring = recurringExpenses?.map(r => r.category) || [];
        const fromTransactions = transactions?.filter(t => t.type === 'expense').map(t => t.category) || [];
        const fromShoppingLists = shoppingLists?.map(l => l.name) || [];
        return [...new Set([...PRESET_EXPENSE_CATEGORIES, ...fromRecurring, ...fromTransactions, ...fromShoppingLists, ...Object.keys(budgets?.categories || {})])].filter(Boolean).sort();
    }, [recurringExpenses, transactions, shoppingLists, budgets]);

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
            expenseCategories: allExpenseCategories,
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
