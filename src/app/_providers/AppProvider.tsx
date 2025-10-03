
'use client';

import React, { createContext, useContext, useReducer, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, doc, Timestamp, serverTimestamp, getDocs, writeBatch, increment, getDoc, limit } from 'firebase/firestore';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, type FirebaseServicesAndUser } from '@/firebase';
import { AppState, Habit, Task, Mood, ActiveSession } from './types';
import { isHabitCompletedToday, calculateStreak, checkHabitStreak, resetStreak } from '@/lib/habits';
import { Button } from '@/components/ui/button';
import { Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PresetHabits } from '@/lib/preset-habits';
import { PRESET_TASK_CATEGORIES } from '@/lib/task-categories';
import { defaultFeelings, defaultInfluences } from '@/lib/moods';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';
import { handleUserLogin, initializeDefaultBudgets, initializeDefaultTaskCategories } from '@/firebase/user-management';


// --- Context Definition ---
export const AppContext = createContext<AppState | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};


type Action =
    | { type: 'SET_DATA'; payload: { key: string; data: any; loading: boolean } }
    | { type: 'SET_CURRENT_MONTH'; payload: Date }
    | { type: 'SET_MODAL_STATE'; payload: { type: string | null; data?: any } }
    | { type: 'SET_FORM_STATE'; payload: any }
    | { type: 'SET_ACTIVE_SESSION'; payload: ActiveSession | null }
    | { type: 'SET_ELAPSED_TIME'; payload: number };

const initialState: Omit<AppState, keyof FirebaseServicesAndUser | 'handleToggleHabit' | 'handleSaveHabit' | 'handleDeleteHabit' | 'handleResetAllStreaks' | 'handleResetHabitStreak'| 'handleResetTimeLogs' | 'handleResetMoods' | 'handleResetCategories' | 'handleToggleTask' | 'handleSaveTask' | 'handleDeleteTask' | 'handleSaveTaskCategory'| 'handleDeleteTaskCategory' | 'handleSaveMood'| 'handleSaveRoutine'| 'handleDeleteRoutine'| 'handleCompleteRoutine' | 'handleSaveGoal' | 'handleDeleteGoal' | 'handleUpdateGoalProgress'| 'handlePayRecurringItem' | 'handleRevertRecurringItem' | 'handleSaveBudget'| 'handleSaveRecurringItem'| 'handleDeleteRecurringItem' | 'handleSaveTransaction' | 'handleDeleteTransaction' | 'setCurrentMonth' | 'startSession' | 'stopSession' | 'analyticsLoading' | 'groupedHabits' | 'dailyHabits' | 'weeklyHabits' | 'completedDaily' | 'completedWeekly' | 'longestStreak' | 'topLongestStreakHabits' | 'longestCurrentStreak' | 'topCurrentStreakHabits' | 'habitCategoryData' | 'dailyProductivityData' | 'topHabitsByStreak' | 'topHabitsByTime' | 'monthlyCompletionData' | 'routineTimeAnalytics'| 'routineCompletionAnalytics' | 'totalStats' | 'categoryStats' | 'taskTimeAnalytics' | 'overdueTasks' | 'todayTasks' | 'upcomingTasks' | 'completedWeeklyTasks' | 'totalWeeklyTasks' | 'weeklyTasksProgress' | 'feelingStats' | 'influenceStats' | 'todayMood' | 'currentMonthName' | 'currentMonthYear' | 'monthlyIncome' | 'monthlyExpenses' | 'balance' | 'budget503020' | 'upcomingPayments' | 'pendingRecurringExpenses' | 'paidRecurringExpenses' | 'pendingRecurringIncomes' | 'receivedRecurringIncomes' | 'pendingExpensesTotal' | 'expenseCategories' | 'incomeCategories' | 'categoriesWithoutBudget' | 'sortedLists' | 'spendingByCategory' | 'budgetAccuracy' | 'spendingByFocus' | 'urgentTasks' | 'presetHabitsLoading' | 'presetHabits' | 'completedDailyTasks' | 'totalDailyTasks' | 'dailyTasksProgress' | 'onTimeCompletionRate' | 'dailyCompletionStats' | 'completedTasksByCategory' | 'modalState' | 'formState' | 'handleOpenModal' | 'handleCloseModal' | 'setFormState'> = {
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
        case 'SET_MODAL_STATE':
            return { ...state, modalState: action.payload };
        case 'SET_FORM_STATE':
            return { ...state, formState: action.payload };
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
    const [modalState, setModalState] = useState<{ type: string | null; data?: any }>({ type: null });
    const [formState, setFormState] = useState<any>({});
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
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth() + 1;
        return query(
            collection(firestore, 'users', user.uid, 'budgets'),
            where('year', '==', year),
            where('month', '==', month)
        );
    }, [user, firestore, state.currentMonth]);
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

    const handleOpenModal = (type: string, data?: any) => {
        const initialFormState = data 
          ? {
              ...data,
              // Convert Firestore Timestamps to JS Dates for form inputs
              dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : (data.dueDate || ''),
            } 
          : {};
        
        setFormState(initialFormState);
        setModalState({ type, data });
    };
    
    const handleCloseModal = (type: string) => {
        // Ensure we only close the modal if it's the one we expect
        if (modalState.type === type) {
            setModalState({ type: null });
            setFormState({}); // Clear form state on close
        }
    };


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

    const handleSaveHabit = async () => {
        if (!formState.name?.trim() || !formState.icon?.trim() || !user || !formState.category || !firestore) return;
        
        const { id, ...data } = formState;

        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', id), data);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'habits'), { 
                ...data, 
                currentStreak: 0, 
                longestStreak: 0, 
                createdAt: serverTimestamp(), 
                lastCompletedAt: null, 
                userId: user.uid, 
                isActive: true 
            });
        }
        handleCloseModal('habit');
    };

    const handleDeleteHabit = async () => {
        if (!formState?.id || !user || !firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', formState.id));
        handleCloseModal('deleteHabit');
    };
    
    const handleResetHabitStreak = async () => {
        if (!formState?.id || !user || !firestore) return;
        const habitRef = doc(firestore, 'users', user.uid, 'habits', formState.id);
        await updateDocumentNonBlocking(habitRef, resetStreak());
        handleCloseModal('resetHabit');
    };


    const handleResetAllStreaks = async () => {
        if (!user || !firestore || !allHabits) return;

        try {
            const batch = writeBatch(firestore);
            allHabits.forEach((habit) => {
                const habitRef = doc(firestore, 'users', user.uid, 'habits', habit.id);
                batch.update(habitRef, resetStreak());
            });
            
            await batch.commit();
            toast({ title: 'Rachas reiniciadas', description: 'Todas las rachas y récords de tus hábitos han sido reiniciados.' });
        } catch (error) {
            console.error("Error resetting streaks:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron reiniciar las rachas.' });
        }
    };

    const handleResetTimeLogs = async () => {
        if (!user || !firestore || !timeLogs) return;
        try {
            const batch = writeBatch(firestore);
            timeLogs.forEach((log) => {
                batch.delete(doc(firestore, 'users', user.uid, 'timeLogs', log.id));
            });
            await batch.commit();
            toast({ title: 'Tiempo de enfoque reiniciado', description: 'Se han eliminado todos los registros de tiempo.' });
        } catch (error) {
            console.error("Error resetting time logs:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reiniciar el tiempo de enfoque.' });
        }
    };

    const handleResetMoods = async () => {
        if (!user || !firestore || !moods) return;
        try {
            const batch = writeBatch(firestore);
            moods.forEach((mood) => {
                batch.delete(doc(firestore, 'users', user.uid, 'moods', mood.id));
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

            // Delete all existing shopping lists, budgets, and non-default task categories
            const collectionsToDelete = ['shoppingLists', 'budgets', 'taskCategories'];
            for (const col of collectionsToDelete) {
                const snapshot = await getDocs(collection(firestore, 'users', user.uid, col));
                snapshot.forEach(doc => batch.delete(doc.ref));
            }

            // Re-initialize defaults
            const newBatch = writeBatch(firestore);
            await initializeDefaultTaskCategories(user, firestore, newBatch);
            await initializeDefaultBudgets(user, firestore, newBatch);

            await batch.commit();
            await newBatch.commit();
            
            toast({ title: 'Categorías Restauradas', description: 'Las categorías financieras y de tareas se han restaurado a los valores predefinidos.' });
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

    const handleSaveTask = async () => {
        if (!user || !formState.name || !firestore) return;
        const { id, ...data } = formState;

        const date = data.dueDate instanceof Date ? data.dueDate : (data.dueDate ? new Date(data.dueDate) : null);
        
        const serializableData:any = { 
            ...data, 
            dueDate: date ? Timestamp.fromDate(date) : null, 
            userId: user.uid 
        };

        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', id), serializableData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'tasks'), { ...serializableData, isCompleted: false, createdAt: serverTimestamp(), completionDate: null });
        }
        handleCloseModal('task');
    };

    const handleDeleteTask = async () => {
        if (!formState?.id || !user || !firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', formState.id));
        handleCloseModal('deleteTask');
    };
    
    const handleSaveTaskCategory = async () => {
        if (!user || !firestore || !formState.name?.trim()) return;

        const { id, name } = formState;
        
        // Prevent creating duplicate categories
        if (!id) {
            const categoryExists = taskCategories?.some(c => c.name.toLowerCase() === name.toLowerCase());
            if (categoryExists) {
                toast({ variant: 'destructive', title: 'Categoría duplicada', description: `La categoría "${name}" ya existe.`});
                return;
            }
        }
        
        if (id) {
            const categoryRef = doc(firestore, 'users', user.uid, 'taskCategories', id);
            await updateDocumentNonBlocking(categoryRef, { name });
        } else {
            const categoriesColRef = collection(firestore, 'users', user.uid, 'taskCategories');
            await addDocumentNonBlocking(categoriesColRef, { name, isActive: true, userId: user.uid });
        }
        handleCloseModal('taskCategory');
    };

    const handleDeleteTaskCategory = async (categoryId: string, categoryName: string) => {
        if (!user || !firestore || !tasks) return;
    
        const batch = writeBatch(firestore);
    
        // Update tasks with the deleted category to "Otro"
        tasks.filter(t => t.category === categoryName).forEach(taskDoc => {
          const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskDoc.id);
          batch.update(taskRef, { category: 'Otro' });
        });
    
        // Delete the category itself
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
        handleCloseModal('deleteTaskCategory');
      };
      
    const handleSaveRoutine = async () => {
        if (!user || !firestore || !formState.name) return;

        const { id, ...data } = formState;

        if (id) {
            const routineRef = doc(firestore, 'users', user.uid, 'routines', id);
            await updateDocumentNonBlocking(routineRef, data);
        } else {
            const routinesColRef = collection(firestore, 'users', user.uid, 'routines');
            await addDocumentNonBlocking(routinesColRef, { ...data, userId: user.uid, createdAt: serverTimestamp() });
        }
        handleCloseModal('routine');
    };

    const handleDeleteRoutine = async () => {
        if (!user || !firestore || !formState.id) return;
        const routineRef = doc(firestore, 'users', user.uid, 'routines', formState.id);
        await deleteDocumentNonBlocking(routineRef);
        handleCloseModal('deleteRoutine');
    };

    const handleCompleteRoutine = async (routine: any) => {
        if (!user || !firestore || !allHabits) return;
        const habitsToComplete = allHabits.filter(h => routine.habitIds.includes(h.id) && !isHabitCompletedToday(h));
        
        if (habitsToComplete.length === 0) return;

        const batch = writeBatch(firestore);
        habitsToComplete.forEach(habit => {
            const habitRef = doc(firestore, 'users', user.uid, 'habits', habit.id);
            const streakData = calculateStreak(habit);
            batch.update(habitRef, {
                lastCompletedAt: Timestamp.now(),
                ...streakData,
                previousStreak: habit.currentStreak || 0,
                previousLongestStreak: habit.longestStreak || 0,
                previousLastCompletedAt: habit.lastCompletedAt ?? null,
            });
        });
        await batch.commit();
        toast({ title: 'Rutina completada', description: `Se marcaron ${habitsToComplete.length} hábitos como completados.`})
    };


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
            const goalRef = doc(firestore, 'users', user.uid, 'goals', id);
            await updateDocumentNonBlocking(goalRef, serializableData);
        } else {
            const goalsColRef = collection(firestore, 'users', user.uid, 'goals');
            await addDocumentNonBlocking(goalsColRef, { ...serializableData, isCompleted: false, createdAt: serverTimestamp() });
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
        
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();

        const transactionData = {
          type: type,
          description: item.name,
          category: item.category,
          date: new Date(year, month, item.dayOfMonth).toISOString(),
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
          lastInstanceCreated: `${state.currentMonth.getFullYear()}-${state.currentMonth.getMonth() + 1}`,
          lastTransactionId: newTransactionRef.id,
        });
    
        await batch.commit();
        toast({ title: `Registro exitoso`, description: `${item.name} ha sido registrado.` });
    };

    const handleRevertRecurringItem = async (item: any, type: 'income' | 'expense') => {
        if (!user || !item.lastTransactionId || !firestore) return;

        const batch = writeBatch(firestore);
        const transactionRef = doc(firestore, 'users', user.uid, 'transactions', item.lastTransactionId);
        const transactionSnap = await getDoc(transactionRef);

        if (transactionSnap.exists()) {
            const transactionData = transactionSnap.data();
            batch.delete(transactionRef);

            if (type === 'expense') {
                const budget = budgets?.find(b => b.categoryName === transactionData.category);
                if (budget) {
                    const budgetRef = doc(firestore, 'users', user.uid, 'budgets', budget.id);
                    batch.update(budgetRef, { currentSpend: increment(-transactionData.amount) });
                }
            }
        } else {
            toast({
                variant: "destructive",
                title: "Advertencia",
                description: "La transacción original no se encontró, pero se revertirá el estado del registro fijo."
            });
        }

        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const itemRef = doc(firestore, 'users', user.uid, collectionName, item.id);
        batch.update(itemRef, {
            lastInstanceCreated: null,
            lastTransactionId: null,
        });

        try {
            await batch.commit();
            toast({ title: 'Reversión exitosa', description: `Se ha deshecho el registro de ${item.name}.` });
        } catch (error) {
            console.error("Error reverting recurring item:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo completar la reversión." });
        }
    };
    
    const handleSaveTransaction = async () => {
        if (!user || !firestore || !formState.description || !formState.amount || !formState.category || !formState.date) return;
        
        const { id, ...data } = formState;
        const amount = parseFloat(data.amount);
        if (isNaN(amount)) return;
        
        const batch = writeBatch(firestore);
        
        const serializableData = {
            ...data,
            amount,
            date: new Date(data.date).toISOString(),
            budgetFocus: data.type === 'expense' ? data.budgetFocus : null,
            userId: user.uid,
        };

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
                if (budget) {
                    batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(amount) });
                }
            }
        }

        await batch.commit();
        handleCloseModal('transaction');
    };

    const handleDeleteTransaction = async () => {
        if (!formState?.id || !user || !firestore) return;
      
        const batch = writeBatch(firestore);
        const transactionToDelete = transactions?.find(t => t.id === formState.id);
        if (!transactionToDelete) return;
      
        // Delete the transaction
        batch.delete(doc(firestore, 'users', user.uid, 'transactions', transactionToDelete.id));
      
        if (transactionToDelete.type === 'expense') {
          // Revert budget spend
          const budget = budgets?.find(b => b.categoryName === transactionToDelete.category);
          if (budget) batch.update(doc(firestore, 'users', user.uid, 'budgets', budget.id), { currentSpend: increment(-transactionToDelete.amount) });
      
          // Revert shopping list item if linked
          const listWithItem = shoppingLists?.find(list => list.items.some((item: any) => item.transactionId === transactionToDelete.id));
          if (listWithItem) {
            const updatedItems = listWithItem.items.map((item: any) =>
              item.transactionId === transactionToDelete.id ? { ...item, isPurchased: false, price: null, transactionId: null } : item
            );
            batch.update(doc(firestore, 'users', user.uid, 'shoppingLists', listWithItem.id), { items: updatedItems });
          }
      
          // Revert recurring expense if linked
          const recurringExpense = recurringExpenses?.find(re => re.lastTransactionId === transactionToDelete.id);
          if (recurringExpense) batch.update(doc(firestore, 'users', user.uid, 'recurringExpenses', recurringExpense.id), { lastInstanceCreated: null, lastTransactionId: null });
        
        } else { // type is 'income'
          // Revert recurring income if linked
          const recurringIncome = recurringIncomes?.find(ri => ri.lastTransactionId === transactionToDelete.id);
          if (recurringIncome) batch.update(doc(firestore, 'users', user.uid, 'recurringIncomes', recurringIncome.id), { lastInstanceCreated: null, lastTransactionId: null });
        }
      
        await batch.commit();
        toast({ title: 'Transacción eliminada' });
        handleCloseModal('deleteTransaction');
    };

    const handleSaveBudget = async () => {
        if (!user || !firestore || !formState.categoryName || !formState.monthlyLimit) return;
      
        const { id, categoryName, monthlyLimit } = formState;
        const limit = parseFloat(monthlyLimit);
        if (isNaN(limit)) return;
      
        if (!id) {
          const categoryExists = budgets?.some(b => b.categoryName.toLowerCase() === categoryName.toLowerCase());
          if (categoryExists) {
            toast({ variant: "destructive", title: "Categoría Duplicada", description: `El presupuesto para "${categoryName}" ya existe.` });
            return;
          }
        }
      
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth() + 1;
      
        if (id) {
          const budgetRef = doc(firestore, 'users', user.uid, 'budgets', id);
          await updateDocumentNonBlocking(budgetRef, { monthlyLimit: limit });
        } else {
          const newBudget = { categoryName, monthlyLimit: limit, currentSpend: 0, year, month, userId: user.uid };
          await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'budgets'), newBudget);
        }
      
        handleCloseModal('budget');
      };
      
      const handleSaveRecurringItem = async (type: 'income' | 'expense') => {
        if (!user || !firestore || !formState.name || !formState.amount || !formState.category || !formState.dayOfMonth) return;
        
        const { id, ...data } = formState;
        const amount = parseFloat(data.amount);
        const dayOfMonth = parseInt(data.dayOfMonth, 10);
        if (isNaN(amount) || isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
            toast({ variant: "destructive", title: "Datos inválidos" });
            return;
        }
        
        const collectionName = type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        const serializableData: any = { ...data, amount, dayOfMonth, userId: user.uid };
        
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, collectionName, id), serializableData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, collectionName), serializableData);
        }
        handleCloseModal(`recurring${type.charAt(0).toUpperCase() + type.slice(1)}`);
      };

    const handleDeleteRecurringItem = async () => {
        if (!formState.id || !user || !firestore) return;
        const collectionName = formState.type === 'income' ? 'recurringIncomes' : 'recurringExpenses';
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, collectionName, formState.id));
        handleCloseModal('deleteRecurring');
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
        if (durationSeconds < 1) { // Ignore sessions less than a second
            dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
            return;
        }

        const timeLogsColRef = collection(firestore, 'users', user.uid, 'timeLogs');
        const timeLogRef = doc(timeLogsColRef);
        
        const batch = writeBatch(firestore);
        batch.set(timeLogRef, {
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
                 batch.update(habitRef, { 
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
             batch.update(taskRef, { 
                isCompleted: true,
                totalTimeSpent: increment(durationSeconds),
                completionDate: Timestamp.now(),
             });
        }
        
        await batch.commit();

        dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
        dispatch({ type: 'SET_ELAPSED_TIME', payload: 0 });
    };


    // --- Derived State & Selectors ---
    const derivedState = useMemo(() => {
        const allHabitsData = allHabits || [];
        const allTasksData = tasks || [];
        const allTimeLogsData = timeLogs || [];
        const allRoutinesData = routines || [];
        const allTaskCategoriesData = taskCategories || [];
        const allMoodsData = moods || [];
        const allTransactionsData = transactions || [];
        const allBudgetsData = budgets || [];
        const allShoppingListsData = shoppingLists || [];
        const allRecurringExpensesData = recurringExpenses || [];
        const allRecurringIncomesData = recurringIncomes || [];
        const todayMoodDataResult = todayMoodData?.[0] || null;

        const analyticsLoading = habitsLoading || timeLogsLoading || tasksLoading || routinesLoading || taskCategoriesLoading;

        // Habit Selectors
        const activeHabits = allHabitsData.filter((h: any) => h.isActive);
        const groupedHabits = activeHabits.reduce((acc: any, habit: any) => {
            const category = habit.category || 'Sin Categoría';
            if (!acc[category]) acc[category] = [];
            acc[category].push(habit);
            return acc;
        }, {});

        const dailyHabits = activeHabits.filter((h: any) => h.frequency === 'Diario');
        const weeklyHabits = activeHabits.filter((h: any) => h.frequency === 'Semanal');
        const completedDaily = dailyHabits.filter((h: any) => isHabitCompletedToday(h)).length;
        const completedWeekly = weeklyHabits.filter((h: any) => isHabitCompletedToday(h)).length;
        
        const longestStreak = activeHabits.reduce((max: number, h: any) => Math.max(max, h.longestStreak || 0), 0);
        const topLongestStreakHabits = longestStreak > 0 ? activeHabits.filter((h: any) => (h.longestStreak || 0) === longestStreak).map((h: any) => h.name) : [];
        
        const longestCurrentStreak = activeHabits.reduce((max: number, h: any) => Math.max(max, h.currentStreak || 0), 0);
        const topCurrentStreakHabits = longestCurrentStreak > 0 ? activeHabits.filter((h: any) => (h.currentStreak || 0) === longestCurrentStreak).map((h: any) => h.name) : [];

        const habitLogs = allTimeLogsData.filter((log: any) => log.referenceType === 'habit');
        const habitCategoryTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = activeHabits.find((h: any) => h.id === log.referenceId);
            if (habit) {
                const category = habit.category || 'Sin Categoría';
                habitCategoryTotals[category] = (habitCategoryTotals[category] || 0) + log.durationSeconds;
            }
        });
        const habitCategoryData = Object.entries(habitCategoryTotals).map(([name, value]) => ({ name, value: Math.round(value / 60) })).filter(item => item.value > 0);

        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dailyProductivityTotals = Array(7).fill(0).map((_, i) => ({ name: daysOfWeek[i], value: 0}));
        allTimeLogsData.forEach((log: any) => {
            const date = log.startTime.toDate();
            const dayIndex = date.getDay();
            dailyProductivityTotals[dayIndex].value += log.durationSeconds;
        });
        const dailyProductivityData = dailyProductivityTotals.map(day => ({...day, value: Math.round(day.value / 60)}));

        const topHabitsByStreak = [...activeHabits].sort((a,b) => (b.longestStreak || 0) - (a.longestStreak || 0)).slice(0, 5).map(h => ({ name: h.name, racha: h.longestStreak || 0 }));

        const habitTimeTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = activeHabits.find((h: any) => h.id === log.referenceId);
            if (habit) habitTimeTotals[habit.name] = (habitTimeTotals[habit.name] || 0) + log.durationSeconds;
        });
        const topHabitsByTime = Object.entries(habitTimeTotals).map(([name, time]) => ({ name, minutos: Math.round(time / 60) })).sort((a, b) => b.minutos - a.minutos).slice(0, 5);

        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const month = todayDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyHabitsForMonth = activeHabits.filter((h: any) => h.frequency === 'Diario');
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
        const monthlyCompletionData = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const data = completionByDay[day];
            return { day, value: data ? Math.round((data.completed / data.total) * 100) : 0 };
        });

        // Routines Selectors
        const habitTimeMap: Record<string, number> = {};
        allTimeLogsData.filter((log: any) => log.referenceType === 'habit').forEach((log: any) => {
            habitTimeMap[log.referenceId] = (habitTimeMap[log.referenceId] || 0) + log.durationSeconds;
        });
    
        const routineTimeTotals: Record<string, number> = {};
        allRoutinesData.forEach((routine: any) => {
            routine.habitIds.forEach((habitId: string) => {
                if (habitTimeMap[habitId]) {
                    routineTimeTotals[routine.name] = (routineTimeTotals[routine.name] || 0) + habitTimeMap[habitId];
                }
            });
        });
        const routineTimeAnalytics = Object.entries(routineTimeTotals)
            .map(([name, time]) => ({ name, minutos: Math.round(time / 60) }))
            .sort((a, b) => b.minutos - a.minutos);
    
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const routineCompletionAnalytics = allRoutinesData.map((routine: any) => {
            const routineHabits = activeHabits.filter((h: any) => routine.habitIds.includes(h.id));
            if (routineHabits.length === 0) return { name: routine.name, completionRate: 0 };
            
            let totalPossibleCompletions = 0;
            let actualCompletions = 0;

            routineHabits.forEach(habit => {
                const createdAt = habit.createdAt.toDate();
                const daysSinceCreation = Math.floor((new Date().getTime() - Math.max(createdAt.getTime(), thirtyDaysAgo.getTime())) / (1000 * 60 * 60 * 24));
                
                if (habit.frequency === 'Diario') {
                    totalPossibleCompletions += daysSinceCreation;
                } else if (habit.frequency === 'Semanal') {
                    totalPossibleCompletions += Math.floor(daysSinceCreation / 7);
                }
                
                const completionsInPeriod = allTimeLogsData.filter(l => l.referenceId === habit.id && l.startTime.toDate() > thirtyDaysAgo).length;
                actualCompletions += completionsInPeriod;

            });
            const rate = totalPossibleCompletions > 0 ? (actualCompletions / totalPossibleCompletions) * 100 : 0;
            return { name: routine.name, completionRate: Math.min(100, rate) };
        }).filter(r => r.completionRate > 0).sort((a, b) => b.completionRate - a.completionRate);

        // Task Selectors
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const tomorrow = new Date(startOfDay);
        tomorrow.setDate(startOfDay.getDate() + 1);

        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);
        
        const overdueTasks = allTasksData.filter((t: any) => !t.isCompleted && t.dueDate && t.dueDate.toDate() < startOfDay);
        const todayTasks = allTasksData.filter((t: any) => !t.isCompleted && t.dueDate && t.dueDate.toDate() >= startOfDay && t.dueDate.toDate() < tomorrow);
        const upcomingTasks = allTasksData.filter((t: any) => !t.isCompleted && t.dueDate && t.dueDate.toDate() >= tomorrow && t.dueDate.toDate() <= endOfWeek);

        const dailyTs = allTasksData.filter((t: any) => {
            if (!t.dueDate) return false;
            const dueDate = t.dueDate.toDate();
            return dueDate >= startOfDay && dueDate < tomorrow;
        });
        const completedDailyTasks = dailyTs.filter((t: any) => t.isCompleted).length;
        const totalDailyTasks = dailyTs.length;
        const dailyTasksProgress = totalDailyTasks > 0 ? (completedDailyTasks / totalDailyTasks) * 100 : 0;
        
        const weeklyTasks = allTasksData.filter((t: any) => t.dueDate && t.dueDate.toDate() >= startOfWeek && t.dueDate.toDate() <= endOfWeek);
        const completedWeeklyTasks = weeklyTasks.filter((t: any) => t.isCompleted).length;
        const totalWeeklyTasks = weeklyTasks.length;
        const weeklyTasksProgress = totalWeeklyTasks > 0 ? (completedWeeklyTasks / totalWeeklyTasks) * 100 : 0;
        
        const completed = allTasksData.filter((t: any) => t.isCompleted).length;
        const total = allTasksData.length;
        const totalStats = { completed, total, completionRate: total > 0 ? (completed / total) * 100 : 0 };
        
        const completedWithDueDate = allTasksData.filter((t: any) => t.isCompleted && t.dueDate && t.completionDate);
        const onTime = completedWithDueDate.filter((t: any) => {
            const completion = t.completionDate.toDate();
            const due = t.dueDate.toDate();
            completion.setHours(0,0,0,0);
            due.setHours(23,59,59,999); // give buffer until end of day
            return completion <= due;
        }).length;
        const onTimeCompletionRate = completedWithDueDate.length > 0 ? (onTime / completedWithDueDate.length) * 100 : 0;
        
        const completedTasksByCategory = (allTaskCategoriesData || []).map((category: any) => ({
            name: category.name,
            tareas: allTasksData.filter((t: any) => t.isCompleted && t.category === category.name).length
        })).filter((c: any) => c.tareas > 0);

        const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dailyCompletionStats = weekDays.map((name, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            const dayStart = new Date(day);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const dueTasks = allTasksData.filter((t: any) => t.dueDate && t.dueDate.toDate() >= dayStart && t.dueDate.toDate() <= dayEnd);
            const completedOnDay = allTasksData.filter((t: any) => t.isCompleted && t.completionDate && t.completionDate.toDate() >= dayStart && t.completionDate.toDate() <= dayEnd).length;
            const pendingOnDay = dueTasks.filter((t: any) => !t.isCompleted).length;

            return { name, completadas: completedOnDay, pendientes: pendingOnDay };
        });
        
        const taskLogs = allTimeLogsData.filter((log: any) => log.referenceType === 'task');
        const categoryTimeTotals: Record<string, number> = {};
        taskLogs.forEach((log: any) => {
            const task = allTasksData.find((t: any) => t.id === log.referenceId);
            if (task) {
                const category = task.category || 'Sin Categoría';
                categoryTimeTotals[category] = (categoryTimeTotals[category] || 0) + log.durationSeconds;
            }
        });
        const taskTimeAnalytics = Object.entries(categoryTimeTotals).map(([name, value]) => ({ name, minutos: Math.round(value / 60) })).filter(item => item.minutos > 0);

        const catStats = (allTaskCategoriesData || []).reduce((acc: any, category: any) => {
            const tasksInCategory = allTasksData.filter((t: any) => t.category === category.name);
            if (tasksInCategory.length > 0) {
                const completed = tasksInCategory.filter((t: any) => t.isCompleted).length;
                acc[category.name] = { completed, total: tasksInCategory.length, completionRate: (completed / tasksInCategory.length) * 100 };
            }
            return acc;
        }, {} as Record<string, any>);
        
        // Mood Selectors
        const feelingsCount = allMoodsData.flatMap((m: any) => m.feelings).reduce((acc: any, f: any) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {} as Record<string, number>);
        const influencesCount = allMoodsData.flatMap((m: any) => m.influences).reduce((acc: any, i: any) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {} as Record<string, number>);
        
        // Finance Selectors
        const now = state.currentMonth;
        const currentMonthName = now.toLocaleDateString('es-ES', { month: 'long' });
        const currentMonthYear = `${now.getFullYear()}-${now.getMonth() + 1}`;

        const monthlyIncome = allTransactionsData.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
        const monthlyExpenses = allTransactionsData.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
        const balance = monthlyIncome - monthlyExpenses;
        
        let budget503020 = null;
        const needsSpend = allTransactionsData.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Necesidades').reduce((s: number, t: any) => s + t.amount, 0);
        const wantsSpend = allTransactionsData.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Deseos').reduce((s: number, t: any) => s + t.amount, 0);
        const savingsSpend = allTransactionsData.filter((t: any) => t.type === 'expense' && t.budgetFocus === 'Ahorros y Deudas').reduce((s: number, t: any) => s + t.amount, 0);
        
        if (monthlyIncome > 0) {
            budget503020 = {
                needs: { budget: monthlyIncome * 0.5, spend: needsSpend, progress: (needsSpend / (monthlyIncome * 0.5)) * 100 },
                wants: { budget: monthlyIncome * 0.3, spend: wantsSpend, progress: (wantsSpend / (monthlyIncome * 0.3)) * 100 },
                savings: { budget: monthlyIncome * 0.2, spend: savingsSpend, progress: (savingsSpend / (monthlyIncome * 0.2)) * 100 },
            };
        }

        const pendingRecurringExpenses = allRecurringExpensesData.filter((e: any) => e.lastInstanceCreated !== currentMonthYear);
        const paidRecurringExpenses = allRecurringExpensesData.filter((e: any) => e.lastInstanceCreated === currentMonthYear);
        const pendingRecurringIncomes = allRecurringIncomesData.filter((i: any) => i.lastInstanceCreated !== currentMonthYear);
        const receivedRecurringIncomes = allRecurringIncomesData.filter((i: any) => i.lastInstanceCreated === currentMonthYear);
        const pendingExpensesTotal = pendingRecurringExpenses.reduce((s: number, e: any) => s + e.amount, 0);
        
        const upcomingPayments = allRecurringExpensesData.filter((e: any) => {
            const dayOfMonth = e.dayOfMonth;
            const currentDay = today.getDate();
            const nextSevenDays = new Date();
            nextSevenDays.setDate(today.getDate() + 7);

            if (today.getMonth() === state.currentMonth.getMonth() && today.getFullYear() === state.currentMonth.getFullYear()) {
                if (nextSevenDays.getMonth() !== today.getMonth()) {
                    return (dayOfMonth >= currentDay) || (dayOfMonth <= nextSevenDays.getDate());
                } else {
                    return dayOfMonth >= currentDay && dayOfMonth <= nextSevenDays.getDate();
                }
            }
            return false;
        });

        const allExpenseCategoryNames = [...new Set([...allBudgetsData.map((b: any) => b.categoryName), ...allShoppingListsData.map((l: any) => l.name), ...allTransactionsData.filter((t: any) => t.type === 'expense').map((t: any) => t.category)])].filter(Boolean);
        const incomeCategories = [...new Set(["Salario", "Bonificación", "Otro", ...allTransactionsData.filter((t: any) => t.type === 'income').map((t: any) => t.category)])].filter(Boolean);
        const categoriesWithoutBudget = allExpenseCategoryNames.filter(cat => !allBudgetsData.some((b: any) => b.categoryName === cat));

        const activeShoppingLists = allShoppingListsData.filter((l: any) => l.isActive);
        const sortedLists = [...activeShoppingLists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const spendingByCategory = activeShoppingLists.map((l: any) => ({ name: l.name, gasto: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.gasto > 0);
        const budgetAccuracy = activeShoppingLists.map((l: any) => ({ name: l.name, estimado: l.items.filter((i:any) => i.isPurchased).reduce((s:number, i:any) => s + i.amount, 0), real: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.real > 0 || d.estimado > 0);
        const spendingByFocus = (Object.entries(activeShoppingLists.reduce((acc: any, l: any) => {
            const total = l.items.filter((i: any) => i.isPurchased && i.price).reduce((s: number, i: any) => s + i.price, 0);
            if(l.budgetFocus && acc.hasOwnProperty(l.budgetFocus)) acc[l.budgetFocus] += total;
            return acc;
        }, {'Necesidades':0, 'Deseos':0, 'Ahorros y Deudas':0}) ?? {}) as [string, number][]).map(([name, value]) => ({name, value})).filter(d => d.value > 0);
        
        return {
            analyticsLoading,
            groupedHabits, dailyHabits, weeklyHabits, completedDaily, completedWeekly, longestStreak, topLongestStreakHabits, longestCurrentStreak, topCurrentStreakHabits, habitCategoryData, dailyProductivityData, topHabitsByStreak, topHabitsByTime, monthlyCompletionData,
            routineTimeAnalytics, routineCompletionAnalytics,
            totalStats, categoryStats: catStats, taskTimeAnalytics, overdueTasks, todayTasks, upcomingTasks, completedWeeklyTasks, totalWeeklyTasks, weeklyTasksProgress, completedDailyTasks, totalDailyTasks, dailyTasksProgress, onTimeCompletionRate, dailyCompletionStats, completedTasksByCategory,
            feelingStats: (Object.entries(feelingsCount) as [string, any][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            influenceStats: (Object.entries(influencesCount) as [string, any][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            todayMood: todayMoodDataResult,
            currentMonthName: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1), 
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
            expenseCategories: allExpenseCategoryNames, 
            incomeCategories, 
            categoriesWithoutBudget, 
            sortedLists, 
            spendingByCategory, 
            budgetAccuracy, 
            spendingByFocus,
            urgentTasks: urgentTasks ?? [],
        };
    }, [
        allHabits, routines, tasks, taskCategories, goals, moods, feelings, influences, timeLogs, transactions, budgets, shoppingLists, recurringExpenses, recurringIncomes, todayMoodData, urgentTasks,
        habitsLoading, routinesLoading, tasksLoading, taskCategoriesLoading, goalsLoading, moodsLoading, feelingsLoading, influencesLoading, timeLogsLoading, transactionsLoading, budgetsLoading, shoppingListsLoading, recurringExpensesLoading, recurringIncomesLoading, 
        state.currentMonth
    ]);
    
    useEffect(() => {
        const rawData: { [key: string]: any } = { allHabits, routines, tasks, taskCategories, goals, moods, feelings, influences, transactions, budgets, shoppingLists, recurringExpenses, recurringIncomes, timeLogs, urgentTasks };
        const loadingFlags: Record<string, boolean> = { habitsLoading, routinesLoading, tasksLoading, taskCategoriesLoading, goalsLoading, moodsLoading, feelingsLoading, influencesLoading, transactionsLoading, budgetsLoading, shoppingListsLoading, recurringExpensesLoading, recurringIncomesLoading, timeLogsLoading, urgentTasksLoading };
        
        Object.entries(rawData).forEach(([key, data]) => {
            dispatch({ type: 'SET_DATA', payload: { key, data, loading: loadingFlags[`${key}Loading`] } });
        });
    }, [allHabits, routines, tasks, taskCategories, goals, moods, feelings, influences, transactions, budgets, shoppingLists, recurringExpenses, recurringIncomes, timeLogs, urgentTasks, habitsLoading, routinesLoading, tasksLoading, taskCategoriesLoading, goalsLoading, moodsLoading, feelingsLoading, influencesLoading, transactionsLoading, budgetsLoading, shoppingListsLoading, recurringExpensesLoading, recurringIncomesLoading, timeLogsLoading, urgentTasksLoading]);

    const value: AppState = {
        ...state,
        ...derivedState,
        firestore,
        user,
        presetHabits: PresetHabits,
        presetHabitsLoading: false,
        modalState,
        formState,
        handleOpenModal,
        handleCloseModal,
        setFormState,
        handleToggleHabit,
        handleSaveHabit,
        handleDeleteHabit,
        handleResetAllStreaks,
        handleResetHabitStreak,
        handleResetTimeLogs,
        handleResetMoods,
        handleResetCategories,
        handleToggleTask,
        handleSaveTask,
        handleDeleteTask,
        handleSaveTaskCategory,
        handleDeleteTaskCategory,
        handleSaveRoutine,
        handleDeleteRoutine,
        handleCompleteRoutine,
        handleSaveGoal,
        handleDeleteGoal,
        handleUpdateGoalProgress,
        handleSaveMood,
        handlePayRecurringItem,
        handleRevertRecurringItem,
        handleSaveTransaction,
        handleDeleteTransaction,
        handleSaveBudget,
        handleSaveRecurringItem,
        handleDeleteRecurringItem,
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

    