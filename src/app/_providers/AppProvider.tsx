

'use client';

import React, { useReducer, useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, doc, Timestamp, serverTimestamp, getDocs, writeBatch, increment, getDoc, limit } from 'firebase/firestore';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, type FirebaseServicesAndUser } from '@/firebase';
import { AppState, Habit, Task, Mood, ActiveSession } from './types';
import { isHabitCompletedToday, calculateStreak, checkHabitStreak } from '@/lib/habits';
import { Button } from '@/components/ui/button';
import { Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PresetHabits } from '@/lib/preset-habits';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';
import { AppContext } from './AppContext';

// --- Reducer Logic ---

type Action =
    | { type: 'SET_DATA'; payload: { key: string; data: any; loading: boolean } }
    | { type: 'SET_CURRENT_MONTH'; payload: Date }
    | { type: 'SET_ACTIVE_SESSION'; payload: ActiveSession | null }
    | { type: 'SET_ELAPSED_TIME'; payload: number };

const initialState: Omit<AppState, keyof FirebaseServicesAndUser | 'handleToggleHabit' | 'handleCreateOrUpdateHabit' | 'handleDeleteHabit' | 'handleResetAllStreaks' | 'handleResetTimeLogs' | 'handleResetMoods' | 'handleResetCategories' | 'handleToggleTask' | 'handleSaveTask' | 'handleDeleteTask'| 'handleDeleteTaskCategory' | 'handleSaveMood' | 'handlePayRecurringItem' | 'setCurrentMonth' | 'startSession' | 'stopSession' | 'analyticsLoading' | 'groupedHabits' | 'dailyHabits' | 'weeklyHabits' | 'completedDaily' | 'completedWeekly' | 'longestStreak' | 'topLongestStreakHabits' | 'longestCurrentStreak' | 'topCurrentStreakHabits' | 'habitCategoryData' | 'dailyProductivityData' | 'topHabitsByStreak' | 'topHabitsByTime' | 'monthlyCompletionData' | 'routineTimeAnalytics' | 'routineCompletionAnalytics' |'totalStats' | 'categoryStats' | 'taskTimeAnalytics' | 'overdueTasks' | 'todayTasks' | 'upcomingTasks' | 'tasksForTomorrow' | 'completedWeeklyTasks' | 'totalWeeklyTasks' | 'weeklyTasksProgress' | 'feelingStats' | 'influenceStats' | 'todayMood' | 'currentMonthName' | 'currentMonthYear' | 'monthlyIncome' | 'monthlyExpenses' | 'balance' | 'budget503020' | 'upcomingPayments' | 'pendingRecurringExpenses' | 'paidRecurringExpenses' | 'pendingRecurringIncomes' | 'receivedRecurringIncomes' | 'pendingExpensesTotal' | 'expenseCategories' | 'incomeCategories' | 'categoriesWithoutBudget' | 'sortedLists' | 'spendingByCategory' | 'budgetAccuracy' | 'spendingByFocus' | 'urgentTasks' | 'presetHabitsLoading' | 'presetHabits' | 'completedDailyTasks' | 'totalDailyTasks' | 'dailyTasksProgress' | 'onTimeCompletionRate' | 'dailyCompletionStats' | 'completedTasksByCategory'> = {
    allHabits: null,
    routines: null,
    tasks: null,
    taskCategories: null,
    goals: null,
    moods: null,
    feelings: null,
    influences: null,
    transactions: null,
    budgets: null,
    shoppingLists: null,
    recurringExpenses: null,
    recurringIncomes: null,
    timeLogs: null,
    habitsLoading: true,
    routinesLoading: true,
    tasksLoading: true,
    taskCategoriesLoading: true,
    goalsLoading: true,
    moodsLoading: true,
    feelingsLoading: true,
    influencesLoading: true,
    transactionsLoading: true,
    budgetsLoading: true,
    shoppingListsLoading: true,
    recurringExpensesLoading: true,
    recurringIncomesLoading: true,
    timeLogsLoading: true,
    currentMonth: new Date(),
    activeSession: null,
    elapsedTime: 0,
};

function appReducer(state: typeof initialState, action: Action) {
    switch (action.type) {
        case 'SET_DATA':
            return {
                ...state,
                [action.payload.key]: action.payload.data,
                [`${action.payload.key}Loading`]: action.payload.loading,
            };
        case 'SET_CURRENT_MONTH':
            return { ...state, currentMonth: action.payload };
        case 'SET_ACTIVE_SESSION':
            return { ...state, activeSession: action.payload };
        case 'SET_ELAPSED_TIME':
            return { ...state, elapsedTime: action.payload };
        default:
            return state;
    }
}


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

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const getEndOfWeek = (date: Date) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

// --- Provider Component ---

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [streaksChecked, setStreaksChecked] = useState(false);
    const { toast } = useToast();
    
    // --- Data Fetching using useCollection ---
    const allHabitsQuery = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/habits`);
    }, [user, firestore]);
    const { data: allHabits, isLoading: habitsLoading } = useCollection<Habit>(allHabitsQuery);

    const routinesQuery = useMemo(() => {
      if (!user || !firestore) return null;
      return collection(firestore, `users/${user.uid}/routines`);
    }, [user, firestore]);
    const { data: routines, isLoading: routinesLoading } = useCollection(routinesQuery);
    
    const tasksQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/tasks`), orderBy('createdAt', 'desc'));
    }, [user, firestore]);
    const { data: tasks, isLoading: tasksLoading } = useCollection(tasksQuery);

    const taskCategoriesQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/taskCategories`), orderBy('name'));
    }, [user, firestore]);
    const { data: taskCategories, isLoading: taskCategoriesLoading } = useCollection(taskCategoriesQuery);

    const goalsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/goals`);
    }, [user, firestore]);
    const { data: goals, isLoading: goalsLoading } = useCollection(goalsQuery);

    const timeLogsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return query(collection(firestore, `users/${user.uid}/timeLogs`), where("createdAt", ">=", thirtyDaysAgo));
    }, [user, firestore]);
    const { data: timeLogs, isLoading: timeLogsLoading } = useCollection(timeLogsQuery);

    const budgetsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/budgets`);
    }, [user, firestore]);
    const { data: budgets, isLoading: budgetsLoading } = useCollection(budgetsQuery);

    const shoppingListsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/shoppingLists`));
    }, [user, firestore]);
    const { data: shoppingLists, isLoading: shoppingListsLoading } = useCollection(shoppingListsQuery);

    const recurringExpensesQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/recurringExpenses`), orderBy('dayOfMonth'));
    }, [user, firestore]);
    const { data: recurringExpenses, isLoading: recurringExpensesLoading } = useCollection(recurringExpensesQuery);

    const recurringIncomesQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/recurringIncomes`), orderBy('dayOfMonth'));
    }, [user, firestore]);
    const { data: recurringIncomes, isLoading: recurringIncomesLoading } = useCollection(recurringIncomesQuery);

    const feelingsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'feelings');
    }, [user, firestore]);
    const { data: feelings, isLoading: feelingsLoading } = useCollection(feelingsQuery);
    
    const influencesQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, 'users', user.uid, 'influences');
    }, [user, firestore]);
    const { data: influences, isLoading: influencesLoading } = useCollection(influencesQuery);

    const urgentTasksQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'users', user.uid, 'tasks'),
            where('isCompleted', '==', false),
            limit(3)
          );
    }, [user, firestore]);
    const { data: urgentTasks, isLoading: urgentTasksLoading } = useCollection(urgentTasksQuery);

    const transactionsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const startOfMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
        const endOfMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return query(
            collection(firestore, 'users', user.uid, 'transactions'),
            where('date', '>=', startOfMonth.toISOString()),
            where('date', '<=', endOfMonth.toISOString()),
            orderBy('date', 'desc')
        );
    }, [user, firestore, state.currentMonth]);
    const { data: transactions, isLoading: transactionsLoading } = useCollection(transactionsQuery);

    const moodsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const start = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
        const end = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999); 
        return query(
            collection(firestore, 'users', user.uid, 'moods'),
            where('date', '>=', start.toISOString()),
            where('date', '<=', end.toISOString())
        );
    }, [user, firestore, state.currentMonth]);
    const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);

    const todayMoodQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        return query(
            collection(firestore, 'users', user.uid, 'moods'),
            where('date', '>=', startOfDay.toISOString()),
            where('date', '<=', endOfDay.toISOString()),
            limit(1)
        );
    }, [user, firestore]);
    const { data: todayMoodData } = useCollection(todayMoodQuery);
    
    // --- Streak Checking ---
    useEffect(() => {
        if (user && firestore && allHabits && !habitsLoading && !streaksChecked) {
            const batch = writeBatch(firestore);
            let updatesMade = false;

            allHabits.forEach(habit => {
                const streakUpdate = checkHabitStreak(habit);
                if (streakUpdate) {
                    const habitRef = doc(firestore, 'users', user.uid, 'habits', habit.id);
                    batch.update(habitRef, streakUpdate);
                    updatesMade = true;
                }
            });

            if (updatesMade) {
                batch.commit().catch(console.error);
            }
            setStreaksChecked(true);
        }
    }, [user, firestore, allHabits, habitsLoading, streaksChecked]);


    // --- Actions ---

    const handleToggleHabit = (habitId: string) => {
        if (!user || !allHabits || !firestore) return;
        const habit = allHabits.find((h) => h.id === habitId);
        if (!habit) return;
        const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);

        if (isHabitCompletedToday(habit)) {
             const batch = writeBatch(firestore);
             batch.update(habitRef, { 
                lastCompletedAt: habit.previousLastCompletedAt ?? null,
                currentStreak: habit.previousStreak ?? 0,
                longestStreak: habit.previousLongestStreak ?? habit.longestStreak ?? 0,
                lastTimeLogId: null,
            });

            // If there was a timelog associated with this completion, delete it.
            if (habit.lastTimeLogId) {
                const timeLogRef = doc(firestore, 'users', user.uid, 'timeLogs', habit.lastTimeLogId);
                batch.delete(timeLogRef);
            }
            batch.commit();
        } else {
            const streakData = calculateStreak(habit);
            updateDocumentNonBlocking(habitRef, { 
                lastCompletedAt: Timestamp.now(),
                ...streakData,
                previousStreak: habit.currentStreak || 0,
                previousLongestStreak: habit.longestStreak || 0,
                previousLastCompletedAt: habit.lastCompletedAt ?? null,
            });
        }
    };

    const handleCreateOrUpdateHabit = async (habitData: Habit) => {
        if (!habitData.name.trim() || !habitData.icon.trim() || !user || !habitData.category || !firestore) return;

        const { id, ...data } = habitData;
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', id), data);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'habits'), { ...data, currentStreak: 0, longestStreak: 0, createdAt: serverTimestamp(), lastCompletedAt: null, userId: user.uid, isActive: true });
        }
    };

    const handleDeleteHabit = async (habitId: string) => {
        if (!user || !firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', habitId));
    };

    const handleResetAllStreaks = async () => {
        if (!user || !firestore) return;

        try {
            const batch = writeBatch(firestore);
            const habitsQuery = collection(firestore, 'users', user.uid, 'habits');
            const querySnapshot = await getDocs(habitsQuery);
            
            querySnapshot.forEach((document) => {
                const habitRef = doc(firestore, 'users', user.uid, 'habits', document.id);
                batch.update(habitRef, {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastCompletedAt: null,
                    previousStreak: null,
                    previousLastCompletedAt: null,
                });
            });
            
            await batch.commit();
            toast({ title: 'Rachas reiniciadas', description: 'Todas las rachas y récords de tus hábitos han sido reiniciados.' });
        } catch (error) {
            console.error("Error resetting streaks:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron reiniciar las rachas.' });
        }
    };

    const handleResetTimeLogs = async () => {
        if (!user || !firestore) return;
        try {
            const batch = writeBatch(firestore);
            const timeLogsRef = collection(firestore, 'users', user.uid, 'timeLogs');
            const querySnapshot = await getDocs(timeLogsRef);
            querySnapshot.forEach((doc) => {
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
            const moodsRef = collection(firestore, 'users', user.uid, 'moods');
            const querySnapshot = await getDocs(moodsRef);
            querySnapshot.forEach((doc) => {
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

            // Delete all existing shopping lists
            const listsSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'shoppingLists'));
            listsSnapshot.forEach(doc => batch.delete(doc.ref));

            // Delete all existing budgets
            const budgetsSnapshot = await getDocs(collection(firestore, 'users', user.uid, 'budgets'));
            budgetsSnapshot.forEach(doc => batch.delete(doc.ref));

            // Re-create preset categories
            PRESET_EXPENSE_CATEGORIES.forEach((categoryName, index) => {
                // Create shopping list
                const listsColRef = collection(firestore, 'users', user.uid, 'shoppingLists');
                const listDocRef = doc(listsColRef);
                const budgetFocus = ['Arriendo', 'Servicios', 'Transporte', 'Salud', 'Hogar', 'Impuestos', 'Comida'].includes(categoryName)
                    ? 'Necesidades'
                    : ['Deudas', 'Ahorros'].includes(categoryName) ? 'Ahorros y Deudas' : 'Deseos';
                
                batch.set(listDocRef, {
                    name: categoryName,
                    budgetFocus: budgetFocus,
                    createdAt: serverTimestamp(),
                    items: [],
                    userId: user.uid,
                    order: index,
                    isActive: true, // All presets start as active
                });

                // Create budget
                const budgetsColRef = collection(firestore, 'users', user.uid, 'budgets');
                const budgetDocRef = doc(budgetsColRef);
                batch.set(budgetDocRef, {
                    categoryName: categoryName,
                    monthlyLimit: 1000000, 
                    currentSpend: 0,
                    userId: user.uid,
                });
            });

            await batch.commit();
            toast({ title: 'Categorías Restauradas', description: 'Las listas de compras y presupuestos se han restaurado a los valores predefinidos.' });
        } catch (error) {
            console.error("Error resetting categories:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron restaurar las categorías.' });
        }
    };

    const handleToggleTask = (taskId: string, currentStatus: boolean) => {
        if (!user || !firestore) return;
        const completionDate = !currentStatus ? new Date() : null;
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', taskId), { 
            isCompleted: !currentStatus,
            completionDate: completionDate ? Timestamp.fromDate(completionDate) : null
        });
    };

    const handleSaveTask = async (taskData: Task) => {
        if (!user || !taskData.name || !firestore) return;
        const { id, ...data } = taskData;
        const serializableData:any = { ...data, dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null, userId: user.uid };
        
        // Ensure completionDate is handled correctly
        if ('completionDate' in data && data.completionDate) {
            serializableData.completionDate = Timestamp.fromDate(data.completionDate as any);
        }

        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', id), serializableData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'tasks'), { ...serializableData, isCompleted: false, createdAt: serverTimestamp(), completionDate: null });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!user || !firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', taskId));
    };

    const handleDeleteTaskCategory = async (categoryId: string, categoryName: string) => {
        if (!user || !firestore) return;
    
        const batch = writeBatch(firestore);
    
        // 1. Get all tasks with the category to be deleted
        const tasksToUpdateQuery = query(
          collection(firestore, 'users', user.uid, 'tasks'),
          where('category', '==', categoryName)
        );
        const tasksSnapshot = await getDocs(tasksToUpdateQuery);
    
        // 2. Update their category to "Otro"
        tasksSnapshot.forEach(taskDoc => {
          const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskDoc.id);
          batch.update(taskRef, { category: 'Otro' });
        });
    
        // 3. Delete the category itself
        const categoryRef = doc(firestore, 'users', user.uid, 'taskCategories', categoryId);
        batch.delete(categoryRef);
    
        try {
          await batch.commit();
          toast({
            title: 'Categoría Eliminada',
            description: `Las tareas de "${categoryName}" se han movido a "Otro".`,
          });
        } catch (error) {
          console.error("Error deleting category and updating tasks:", error);
          toast({
            variant: 'destructive',
            title: 'Error al eliminar',
            description: 'No se pudo eliminar la categoría.',
          });
        }
      };
      

    const handleSaveMood = async (moodData: Mood) => {
        if (!user || !firestore) return;
    
        const dateToSave = moodData.date || new Date();
        // Remove the local 'date' property before saving to Firestore
        const { date, ...dataToSave } = moodData;
    
        const startOfDay = new Date(dateToSave.getFullYear(), dateToSave.getMonth(), dateToSave.getDate());
        const endOfDay = new Date(dateToSave.getFullYear(), dateToSave.getMonth(), dateToSave.getDate(), 23, 59, 59, 999);
    
        const fullMoodData = { ...dataToSave, date: dateToSave.toISOString(), userId: user.uid };
    
        const q = query(
            collection(firestore, 'users', user.uid, 'moods'),
            where('date', '>=', startOfDay.toISOString()),
            where('date', '<=', endOfDay.toISOString())
        );
    
        const snapshot = await getDocs(q);
    
        if (!snapshot.empty) {
            // Update existing entry for the day
            await updateDocumentNonBlocking(snapshot.docs[0].ref, fullMoodData);
        } else {
            // Create new entry
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'moods'), {
                ...fullMoodData,
                createdAt: serverTimestamp(),
            });
        }
    };
    
    const handlePayRecurringItem = async (item: any, type: 'income' | 'expense') => {
        if (!user || !firestore) return;
        
        const batch = writeBatch(firestore);
    
        const transactionData = {
          type: type,
          description: item.name,
          category: item.category,
          date: new Date().toISOString(),
          amount: item.amount,
          budgetFocus: type === 'expense' ? item.budgetFocus : null,
          userId: user.uid,
          createdAt: serverTimestamp(),
        };
    
        const newTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
        batch.set(newTransactionRef, transactionData);
    
        if (type === 'expense') {
          const budget = budgets?.find(b => b.categoryName === item.category);
          if (budget) {
            const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
            batch.update(budgetRef, { currentSpend: increment(item.amount) });
          }
        }
    
        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
        batch.update(itemRef, {
          lastInstanceCreated: `${state.currentMonth.getFullYear()}-${state.currentMonth.getMonth()}`,
          lastTransactionId: newTransactionRef.id,
        });
    
        await batch.commit();
        toast({ title: `Registro exitoso`, description: `${item.name} ha sido registrado.` });
    };

    const setCurrentMonth = (date: Date | ((prev: Date) => Date)) => {
        if (typeof date === 'function') {
            dispatch({ type: 'SET_CURRENT_MONTH', payload: date(state.currentMonth) });
        } else {
            dispatch({ type: 'SET_CURRENT_MONTH', payload: date });
        }
    };

    // --- Timer Logic ---
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (state.activeSession) {
            dispatch({ type: 'SET_ELAPSED_TIME', payload: Math.floor((Date.now() - state.activeSession.startTime) / 1000) });
            interval = setInterval(() => {
                dispatch({ type: 'SET_ELAPSED_TIME', payload: Math.floor((Date.now() - (state.activeSession?.startTime ?? 0)) / 1000) });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state.activeSession]);

    const startSession = (id: string, name: string, type: 'habit' | 'task') => {
        if (state.activeSession) return;
        dispatch({ type: 'SET_ACTIVE_SESSION', payload: { id, name, type, startTime: Date.now() } });
        dispatch({ type: 'SET_ELAPSED_TIME', payload: 0 });
    };

    const stopSession = async () => {
        if (!state.activeSession || !user || !firestore) return;

        const durationSeconds = Math.floor((Date.now() - state.activeSession.startTime) / 1000);

        const timeLogsColRef = collection(firestore, 'users', user.uid, 'timeLogs');
        const timeLogRef = await addDocumentNonBlocking(timeLogsColRef, {
            referenceId: state.activeSession.id,
            referenceType: state.activeSession.type,
            startTime: Timestamp.fromMillis(state.activeSession.startTime),
            endTime: Timestamp.now(),
            durationSeconds: durationSeconds,
            createdAt: serverTimestamp(),
            userId: user.uid,
        });

        if (state.activeSession.type === 'habit') {
            const habitRef = doc(firestore, 'users', user.uid, 'habits', state.activeSession.id);
            const habit = allHabits?.find(h => h.id === state.activeSession!.id);
            if (habit) {
                 const streakData = calculateStreak(habit);
                 updateDocumentNonBlocking(habitRef, { 
                    lastCompletedAt: Timestamp.now(),
                    ...streakData,
                    previousStreak: habit.currentStreak || 0,
                    previousLongestStreak: habit.longestStreak || 0,
                    previousLastCompletedAt: habit.lastCompletedAt ?? null,
                    lastTimeLogId: timeLogRef?.id ?? null,
                });
            }
        } else { // It's a task
             const taskRef = doc(firestore, 'users', user.uid, 'tasks', state.activeSession.id);
             updateDocumentNonBlocking(taskRef, { 
                isCompleted: true,
                totalTimeSpent: increment(durationSeconds),
                completionDate: Timestamp.now(),
             });
        }

        dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
        dispatch({ type: 'SET_ELAPSED_TIME', payload: 0 });
    };


    // --- Derived State & Selectors ---
    const analyticsLoading = habitsLoading || timeLogsLoading || tasksLoading || routinesLoading;
    
    // Habit Selectors
    const { groupedHabits, dailyHabits, weeklyHabits, completedDaily, completedWeekly, longestStreak, topLongestStreakHabits, longestCurrentStreak, topCurrentStreakHabits, habitCategoryData, dailyProductivityData, topHabitsByStreak, topHabitsByTime, monthlyCompletionData } = useMemo(() => {
        if (!allHabits) return { groupedHabits: {}, dailyHabits: [], weeklyHabits: [], completedDaily: 0, completedWeekly: 0, longestStreak: 0, topLongestStreakHabits: [], longestCurrentStreak: 0, topCurrentStreakHabits: [], habitCategoryData: [], dailyProductivityData: [], topHabitsByStreak: [], topHabitsByTime: [], monthlyCompletionData: [] };

        const activeHabits = allHabits.filter(h => h.isActive);

        const grouped = activeHabits.reduce((acc, habit) => {
            const category = habit.category || 'Sin Categoría';
            if (!acc[category]) acc[category] = [];
            acc[category].push(habit);
            return acc;
        }, {});

        const daily = activeHabits.filter(h => h.frequency === 'Diario');
        const weekly = activeHabits.filter(h => h.frequency === 'Semanal');
        const completedD = daily.filter(h => isHabitCompletedToday(h)).length;
        const completedW = weekly.filter(h => isHabitCompletedToday(h)).length;
        
        const longestS = activeHabits.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0);
        const topLongestS = longestS > 0 ? activeHabits.filter(h => (h.longestStreak || 0) === longestS).map(h => h.name) : [];
        
        const longestCS = activeHabits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);
        const topCurrentS = longestCS > 0 ? activeHabits.filter(h => (h.currentStreak || 0) === longestCS).map(h => h.name) : [];

        const habitLogs = (timeLogs || []).filter((log: any) => log.referenceType === 'habit');
        const categoryTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = activeHabits.find((h: any) => h.id === log.referenceId);
            if (habit) {
                const category = habit.category || 'Sin Categoría';
                categoryTotals[category] = (categoryTotals[category] || 0) + log.durationSeconds;
            }
        });
        const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value / 60) })).filter(item => item.value > 0);

        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dailyTotals = Array(7).fill(0).map((_, i) => ({ name: daysOfWeek[i], value: 0}));
        (timeLogs || []).forEach((log: any) => {
            const date = log.startTime.toDate();
            const dayIndex = date.getDay();
            dailyTotals[dayIndex].value += log.durationSeconds;
        });
        const dailyData = dailyTotals.map(day => ({...day, value: Math.round(day.value / 60)}));

        const topStreak = [...activeHabits].sort((a,b) => (b.longestStreak || 0) - (a.longestStreak || 0)).slice(0, 5).map(h => ({ name: h.name, racha: h.longestStreak || 0 }));

        const timeTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = activeHabits.find((h: any) => h.id === log.referenceId);
            if (habit) timeTotals[habit.name] = (timeTotals[habit.name] || 0) + log.durationSeconds;
        });
        const topTime = Object.entries(timeTotals).map(([name, time]) => ({ name, minutos: Math.round(time / 60) })).sort((a, b) => b.minutos - a.minutos).slice(0, 5);

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyHabitsForMonth = activeHabits.filter(h => h.frequency === 'Diario');
        const completionByDay: Record<number, {completed: number, total: number}> = {};
        if (dailyHabitsForMonth.length > 0) {
            activeHabits.forEach(habit => {
                if (habit.lastCompletedAt) {
                    const completedDate = habit.lastCompletedAt.toDate();
                    if (completedDate.getFullYear() === year && completedDate.getMonth() === month) {
                        const dayOfMonth = completedDate.getDate();
                        if (!completionByDay[dayOfMonth]) completionByDay[dayOfMonth] = { completed: 0, total: dailyHabitsForMonth.length};
                        completionByDay[dayOfMonth].completed += 1;
                    }
                }
            });
        }
        const monthlyData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const data = completionByDay[day];
            return { day, value: data ? Math.round((data.completed / data.total) * 100) : 0 };
        });

        return { groupedHabits: grouped, dailyHabits: daily, weeklyHabits: weekly, completedDaily: completedD, completedWeekly: completedW, longestStreak: longestS, topLongestStreakHabits: topLongestS, longestCurrentStreak: longestCS, topCurrentStreakHabits: topCurrentS, habitCategoryData: categoryData, dailyProductivityData: dailyData, topHabitsByStreak: topStreak, topHabitsByTime: topTime, monthlyCompletionData: monthlyData };
    }, [allHabits, timeLogs]);
    
    // Routines Selectors
    const { routineTimeAnalytics, routineCompletionAnalytics } = useMemo(() => {
        if (!routines || !allHabits || !timeLogs) return { routineTimeAnalytics: [], routineCompletionAnalytics: [] };
    
        const activeHabits = allHabits.filter(h => h.isActive);
    
        // Time Analytics
        const habitTimeTotals: Record<string, number> = {};
        timeLogs.filter(log => log.referenceType === 'habit').forEach(log => {
            habitTimeTotals[log.referenceId] = (habitTimeTotals[log.referenceId] || 0) + log.durationSeconds;
        });
    
        const routineTimeTotals: Record<string, number> = {};
        routines.forEach(routine => {
            routine.habitIds.forEach((habitId: string) => {
                const habit = activeHabits.find(h => h.id === habitId);
                if (habit && habitTimeTotals[habitId]) {
                    routineTimeTotals[routine.name] = (routineTimeTotals[routine.name] || 0) + habitTimeTotals[habitId];
                }
            });
        });
        const timeAnalytics = Object.entries(routineTimeTotals)
            .map(([name, time]) => ({ name, minutos: Math.round(time / 60) }))
            .sort((a, b) => b.minutos - a.minutos);
    
        // Completion Analytics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
        const completionAnalytics = routines.map(routine => {
            const routineHabits = activeHabits.filter(h => routine.habitIds.includes(h.id));
            if (routineHabits.length === 0) return { name: routine.name, completionRate: 0 };
    
            let totalPossibleCompletions = 0;
            let totalActualCompletions = 0;
    
            // This is a simplified calculation. For a more accurate one, we'd need to query the full history of completions.
            // Here, we estimate based on streak and last completion.
            routineHabits.forEach(habit => {
                if (habit.frequency === 'Diario') {
                    totalPossibleCompletions += 30;
                } else { // Semanal
                    totalPossibleCompletions += 4;
                }
                // Using currentStreak as a proxy for recent completions
                totalActualCompletions += (habit.currentStreak || 0);
            });
    
            const rate = totalPossibleCompletions > 0 ? (totalActualCompletions / totalPossibleCompletions) * 100 : 0;
    
            return {
                name: routine.name,
                completionRate: Math.min(100, rate) // Cap at 100%
            };
        }).filter(r => r.completionRate > 0).sort((a, b) => b.completionRate - a.completionRate);
    
        return { routineTimeAnalytics: timeAnalytics, routineCompletionAnalytics: completionAnalytics };
    }, [routines, allHabits, timeLogs]);

    // Task Selectors
    const { totalStats, categoryStats, taskTimeAnalytics, overdueTasks, todayTasks, tasksForTomorrow, upcomingTasks, completedWeeklyTasks, totalWeeklyTasks, weeklyTasksProgress, completedDailyTasks, totalDailyTasks, dailyTasksProgress, onTimeCompletionRate, dailyCompletionStats, completedTasksByCategory } = useMemo(() => {
        if (!tasks || !taskCategories) return { totalStats: { completed: 0, total: 0, completionRate: 0 }, categoryStats: {}, taskTimeAnalytics: [], overdueTasks: [], todayTasks: [], tasksForTomorrow: [], upcomingTasks: [], completedWeeklyTasks: 0, totalWeeklyTasks: 0, weeklyTasksProgress: 0, completedDailyTasks: 0, totalDailyTasks: 0, dailyTasksProgress: 0, onTimeCompletionRate: 0, dailyCompletionStats: [], completedTasksByCategory: [] };
        
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        const tomorrow = new Date(startOfDay);
        tomorrow.setDate(startOfDay.getDate() + 1);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);
        
        const overdue = tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate.toDate() < startOfDay);
        const forToday = tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate.toDate() >= startOfDay && t.dueDate.toDate() <= endOfDay);
        const forTomorrow = tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate.toDate() >= tomorrow && t.dueDate.toDate() <= endOfTomorrow);
        const upcoming = tasks.filter(t => !t.isCompleted && t.dueDate && t.dueDate.toDate() > endOfDay && t.dueDate.toDate() <= endOfWeek);

        const dailyTs = tasks.filter(t => t.dueDate && t.dueDate.toDate() >= startOfDay && t.dueDate.toDate() <= endOfDay);
        const completedDaily = dailyTs.filter(t => t.isCompleted).length;
        const totalDaily = dailyTs.length;
        const dailyProgress = totalDaily > 0 ? (completedDaily / totalDaily) * 100 : 0;
        
        const weeklyTasks = tasks.filter(t => t.dueDate && t.dueDate.toDate() >= startOfWeek && t.dueDate.toDate() <= endOfWeek);
        const completedWeekly = weeklyTasks.filter(t => t.isCompleted).length;
        const totalWeekly = weeklyTasks.length;
        const weeklyProgress = totalWeekly > 0 ? (completedWeekly / totalWeekly) * 100 : 0;
        
        const completed = tasks.filter(t => t.isCompleted).length;
        const total = tasks.length;
        const totalStats = { completed, total, completionRate: total > 0 ? (completed / total) * 100 : 0 };

        const catStats = (taskCategories || []).reduce((acc, category) => {
            const tasksInCategory = tasks.filter(t => t.category === category.name);
            if (tasksInCategory.length > 0) {
                const completed = tasksInCategory.filter(t => t.isCompleted).length;
                acc[category.name] = { completed, total: tasksInCategory.length, completionRate: (completed / tasksInCategory.length) * 100 };
            }
            return acc;
        }, {} as Record<string, any>);

        const completedWithDueDate = tasks.filter(t => t.isCompleted && t.dueDate && t.completionDate);
        const onTime = completedWithDueDate.filter(t => {
            const completion = t.completionDate.toDate();
            const due = t.dueDate.toDate();
            completion.setHours(0,0,0,0);
            due.setHours(0,0,0,0);
            return completion <= due;
        }).length;

        const onTimeRate = completedWithDueDate.length > 0 ? (onTime / completedWithDueDate.length) * 100 : 0;
        
        const completedByCategoryData = (taskCategories || []).map(category => {
            const count = tasks.filter(t => t.isCompleted && t.category === category.name).length;
            return { name: category.name, tareas: count };
        }).filter(c => c.tareas > 0);

        const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dailyStatsData = weekDays.map((name, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dayStart = new Date(day);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const dueTasks = tasks.filter(t => t.dueDate && t.dueDate.toDate() >= dayStart && t.dueDate.toDate() <= dayEnd);
            const completedOnDay = tasks.filter(t => t.isCompleted && t.completionDate && t.completionDate.toDate() >= dayStart && t.completionDate.toDate() <= dayEnd).length;
            const pendingOnDay = dueTasks.filter(t => !t.isCompleted).length;

            return { name, completadas: completedOnDay, pendientes: pendingOnDay };
        });
        
        const taskLogs = (timeLogs || []).filter((log: any) => log.referenceType === 'task');
        const categoryTimeTotals: Record<string, number> = {};
        taskLogs.forEach((log: any) => {
            const task = tasks.find((t: any) => t.id === log.referenceId);
            if (task) {
                const category = task.category || 'Sin Categoría';
                categoryTimeTotals[category] = (categoryTimeTotals[category] || 0) + log.durationSeconds;
            }
        });
        const timeAnalytics = Object.entries(categoryTimeTotals).map(([name, value]) => ({ name, minutos: Math.round(value / 60) })).filter(item => item.minutos > 0);
        
        return { 
            totalStats, 
            categoryStats: catStats, 
            taskTimeAnalytics: timeAnalytics, 
            overdueTasks: overdue, 
            todayTasks: forToday, 
            tasksForTomorrow: forTomorrow, 
            upcomingTasks: upcoming, 
            completedWeeklyTasks: completedWeekly, 
            totalWeeklyTasks: totalWeekly, 
            weeklyTasksProgress: weeklyProgress, 
            completedDailyTasks: completedDaily, 
            totalDailyTasks: totalDaily, 
            dailyTasksProgress: dailyProgress, 
            onTimeCompletionRate: onTimeRate, 
            dailyCompletionStats: dailyStatsData, 
            completedTasksByCategory: completedByCategoryData
        };
    }, [tasks, timeLogs, taskCategories]);

    // Mood Selectors
    const { feelingStats, influenceStats, todayMood } = useMemo(() => {
        const moodSource = moods ?? [];

        const feelingsCount = moodSource.flatMap(m => m.feelings).reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {} as Record<string, number>);
        const influencesCount = moodSource.flatMap(m => m.influences).reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {} as Record<string, number>);
        
        const today = todayMoodData?.[0] || null;

        return {
            feelingStats: (Object.entries(feelingsCount) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            influenceStats: (Object.entries(influencesCount) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            todayMood: today,
        };
    }, [moods, todayMoodData]);
    
    // Finance/Expenses Selectors
    const { currentMonthName, currentMonthYear, monthlyIncome, monthlyExpenses, balance, budget503020, upcomingPayments, pendingRecurringExpenses, paidRecurringExpenses, pendingRecurringIncomes, receivedRecurringIncomes, pendingExpensesTotal, expenseCategories, incomeCategories, categoriesWithoutBudget, sortedLists, spendingByCategory, budgetAccuracy, spendingByFocus } = useMemo(() => {
        const now = state.currentMonth;
        const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
        const monthYear = `${now.getFullYear()}-${now.getMonth()}`;

        const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0;
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0;
        
        const bal = income - expenses;
        
        let needsBudget = income * 0.5;
        let wantsBudget = income * 0.3;
        let savingsBudget = income * 0.2;
        let b503020 = null;
        
        const needsSpend = transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Necesidades').reduce((s, t) => s + t.amount, 0) ?? 0;
        const wantsSpend = transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Deseos').reduce((s, t) => s + t.amount, 0) ?? 0;
        const savingsSpend = transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Ahorros y Deudas').reduce((s, t) => s + t.amount, 0) ?? 0;
        
        if (income === 0) {
            const totalSpend = needsSpend + wantsSpend + savingsSpend;
            if (totalSpend > 0) {
                 b503020 = {
                    needs: { budget: 0, spend: needsSpend, progress: (needsSpend / totalSpend) * 100 },
                    wants: { budget: 0, spend: wantsSpend, progress: (wantsSpend / totalSpend) * 100 },
                    savings: { budget: 0, spend: savingsSpend, progress: (savingsSpend / totalSpend) * 100 },
                };
            }
        }
        
        if (!b503020) {
            b503020 = {
                needs: { budget: needsBudget, spend: needsSpend, progress: (needsSpend / (needsBudget || 1)) * 100 },
                wants: { budget: wantsBudget, spend: wantsSpend, progress: (wantsSpend / (wantsBudget || 1)) * 100 },
                savings: { budget: savingsBudget, spend: savingsSpend, progress: (savingsSpend / (savingsBudget || 1)) * 100 },
            };
        }
        
        const today = new Date();
        const nextSevenDays = new Date();
        nextSevenDays.setDate(today.getDate() + 7);

        const upcoming = (recurringExpenses || []).filter(e => {
            if (e.lastInstanceCreated === monthYear) return false; // Already paid this month
            const dayOfMonth = e.dayOfMonth;
            if (dayOfMonth < today.getDate()) return false; // Past due date for this month
            const dueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
            return dueDate >= today && dueDate <= nextSevenDays;
        }) ?? [];

        const pendingRE = (recurringExpenses || []).filter(e => e.lastInstanceCreated !== monthYear) ?? [];
        const paidRE = (recurringExpenses || []).filter(e => e.lastInstanceCreated === monthYear) ?? [];
        const pendingRI = (recurringIncomes || []).filter(i => i.lastInstanceCreated !== monthYear) ?? [];
        const receivedRI = (recurringIncomes || []).filter(i => i.lastInstanceCreated === monthYear) ?? [];
        
        const pendingRecurringTotal = (recurringExpenses || []).filter(e => e.lastInstanceCreated !== monthYear).reduce((s, e) => s + e.amount, 0);
        const pendingShoppingTotal = (shoppingLists || []).filter(l => l.isActive).reduce((total, list) => 
            total + list.items.filter((item: any) => !item.isPurchased).reduce((subtotal: number, item: any) => subtotal + item.amount, 0), 0) ?? 0;
        const pendingETotal = pendingRecurringTotal + pendingShoppingTotal;

        
        const allCategoryNames = [...new Set([
            ...PRESET_EXPENSE_CATEGORIES,
            ...(budgets || []).map(b => b.categoryName), 
            ...(shoppingLists || []).map(l => l.name),
            ...(transactions?.filter(t => t.type === 'expense').map(t => t.category) ?? [])
        ])].filter(Boolean);

        const incomeCats = [...new Set(["Salario", "Bonificación", "Otro", ...(transactions?.filter(t => t.type === 'income').map(t => t.category) ?? [])])].filter(Boolean);
        const catsNoBudget = allCategoryNames.filter(cat => !(budgets || []).some(b => b.categoryName === cat));

        const activeShoppingLists = (shoppingLists || []).filter((l: any) => l.isActive);
        const sorted = [...activeShoppingLists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const spendingByCat = activeShoppingLists.map(l => ({ name: l.name, gasto: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.gasto > 0) ?? [];
        const budgetAcc = activeShoppingLists.map(l => ({ name: l.name, estimado: l.items.filter((i:any) => i.isPurchased).reduce((s:number, i:any) => s + i.amount, 0), real: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.real > 0 || d.estimado > 0) ?? [];
        const spendingByF = (Object.entries(activeShoppingLists.reduce((acc, l) => {
            const total = l.items.filter((i: any) => i.isPurchased && i.price).reduce((s: number, i: any) => s + i.price, 0);
            if(l.budgetFocus && acc.hasOwnProperty(l.budgetFocus)) acc[l.budgetFocus] += total;
            return acc;
        }, {'Necesidades':0, 'Deseos':0, 'Ahorros y Deudas':0}) ?? {}) as [string, number][]).map(([name, value]) => ({name, value})).filter(d => d.value > 0);

        return { 
            currentMonthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), 
            currentMonthYear: monthYear, 
            monthlyIncome: income, 
            monthlyExpenses: expenses, 
            balance: bal, 
            budget503020: b503020, 
            upcomingPayments: upcoming, 
            pendingRecurringExpenses: pendingRE, 
            paidRecurringExpenses: paidRE, 
            pendingRecurringIncomes: pendingRI, 
            receivedRecurringIncomes: receivedRI, 
            pendingExpensesTotal: pendingETotal, 
            expenseCategories: allCategoryNames, 
            incomeCategories: incomeCats, 
            categoriesWithoutBudget: catsNoBudget, 
            sortedLists: sorted, 
            spendingByCategory: spendingByCat, 
            budgetAccuracy: budgetAcc, 
            spendingByFocus: spendingByF 
        };
    }, [transactions, recurringExpenses, recurringIncomes, shoppingLists, budgets, state.currentMonth]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'allHabits', data: allHabits, loading: habitsLoading } });
    }, [allHabits, habitsLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'routines', data: routines, loading: routinesLoading } });
    }, [routines, routinesLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'tasks', data: tasks, loading: tasksLoading } });
    }, [tasks, tasksLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'taskCategories', data: taskCategories, loading: taskCategoriesLoading } });
    }, [taskCategories, taskCategoriesLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'goals', data: goals, loading: goalsLoading } });
    }, [goals, goalsLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'timeLogs', data: timeLogs, loading: timeLogsLoading } });
    }, [timeLogs, timeLogsLoading]);
    
    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'budgets', data: budgets, loading: budgetsLoading } });
    }, [budgets, budgetsLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'shoppingLists', data: shoppingLists, loading: shoppingListsLoading } });
    }, [shoppingLists, shoppingListsLoading]);
    
    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'recurringExpenses', data: recurringExpenses, loading: recurringExpensesLoading } });
    }, [recurringExpenses, recurringExpensesLoading]);
    
    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'recurringIncomes', data: recurringIncomes, loading: recurringIncomesLoading } });
    }, [recurringIncomes, recurringIncomesLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'transactions', data: transactions, loading: transactionsLoading } });
    }, [transactions, transactionsLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'moods', data: moods, loading: moodsLoading } });
    }, [moods, moodsLoading]);

     useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'feelings', data: feelings, loading: feelingsLoading } });
    }, [feelings, feelingsLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'influences', data: influences, loading: influencesLoading } });
    }, [influences, influencesLoading]);
    
    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'urgentTasks', data: urgentTasks, loading: urgentTasksLoading } });
    }, [urgentTasks, urgentTasksLoading]);

    const value: AppState = {
        ...state,
        firestore,
        user,
        allHabits,
        habitsLoading,
        routines,
        routinesLoading,
        tasks,
        tasksLoading,
        taskCategories,
        taskCategoriesLoading,
        goals,
        goalsLoading,
        moods: moods ?? [],
        moodsLoading,
        feelings: feelings ?? [],
        feelingsLoading,
        influences: influences ?? [],
        influencesLoading,
        transactions: transactions ?? [],
        transactionsLoading,
        budgets,
        budgetsLoading,
        shoppingLists,
        shoppingListsLoading,
        recurringExpenses,
        recurringExpensesLoading,
        recurringIncomes,
        recurringIncomesLoading,
        timeLogs,
        timeLogsLoading,
        presetHabits: PresetHabits,
        presetHabitsLoading: false,
        analyticsLoading,
        groupedHabits,
        dailyHabits,
        weeklyHabits,
        completedDaily,
        completedWeekly,
        longestStreak,
        topLongestStreakHabits,
        longestCurrentStreak,
        topCurrentStreakHabits,
        habitCategoryData,
        dailyProductivityData,
        topHabitsByStreak,
        topHabitsByTime,
        monthlyCompletionData,
        routineTimeAnalytics,
        routineCompletionAnalytics,
        totalStats,
        categoryStats,
        taskTimeAnalytics,
        overdueTasks,
        todayTasks,
        upcomingTasks,
        tasksForTomorrow,
        completedWeeklyTasks,
        totalWeeklyTasks,
        weeklyTasksProgress,
        completedDailyTasks,
        totalDailyTasks,
        dailyTasksProgress,
        onTimeCompletionRate,
        dailyCompletionStats,
        completedTasksByCategory,
        feelingStats,
        influenceStats,
        todayMood,
        currentMonthName,
        currentMonthYear,
        monthlyIncome,
        monthlyExpenses,
        balance,
        budget503020,
        upcomingPayments,
        pendingRecurringExpenses,
        paidRecurringExpenses,
        pendingRecurringIncomes,
        receivedRecurringIncomes,
        pendingExpensesTotal,
        expenseCategories,
        incomeCategories,
        categoriesWithoutBudget,
        sortedLists,
        spendingByCategory,
        budgetAccuracy,
        spendingByFocus,
        urgentTasks: urgentTasks ?? [],
        handleToggleHabit,
        handleCreateOrUpdateHabit,
        handleDeleteHabit,
        handleResetAllStreaks,
        handleResetTimeLogs,
        handleResetMoods,
        handleResetCategories,
        handleToggleTask,
        handleSaveTask,
        handleDeleteTask,
        handleDeleteTaskCategory,
        handleSaveMood,
        handlePayRecurringItem,
        setCurrentMonth,
        startSession,
        stopSession,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
             <TimerDisplay 
                activeSession={state.activeSession} 
                elapsedTime={state.elapsedTime} 
                stopSession={stopSession} 
            />
        </AppContext.Provider>
    );
};
