
'use client';

import React, { useReducer, useEffect, useMemo, useState, useCallback } from 'react';
import { collection, query, where, orderBy, doc, Timestamp, serverTimestamp, getDocs, writeBatch, increment, getDoc, limit } from 'firebase/firestore';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, type FirebaseServicesAndUser } from '@/firebase';
import { AppContext, AppState, Habit, Task, Mood, ActiveSession } from './AppContext';
import { isHabitCompletedToday, calculateStreak } from '@/lib/habits';
import { Button } from '@/components/ui/button';
import { Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import presetHabitsData from '@/lib/preset-habits.json';
import { useToast } from '@/hooks/use-toast';


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

// --- Reducer Logic ---

type Action =
    | { type: 'SET_DATA'; payload: { key: string; data: any; loading: boolean } }
    | { type: 'SET_CURRENT_MONTH'; payload: Date }
    | { type: 'SET_ACTIVE_SESSION'; payload: ActiveSession | null }
    | { type: 'SET_ELAPSED_TIME'; payload: number };

const initialState: Omit<AppState, keyof FirebaseServicesAndUser | 'handleToggleHabit' | 'handleCreateOrUpdateHabit' | 'handleDeleteHabit' | 'handleResetAllStreaks' | 'handleResetTimeLogs' | 'handleResetMoods' | 'handleToggleTask' | 'handleSaveTask' | 'handleDeleteTask' | 'handleSaveMood' | 'setCurrentMonth' | 'startSession' | 'stopSession' | 'analyticsLoading' | 'groupedHabits' | 'dailyHabits' | 'weeklyHabits' | 'completedDaily' | 'completedWeekly' | 'longestStreak' | 'longestCurrentStreak' | 'habitCategoryData' | 'dailyProductivityData' | 'topHabitsByStreak' | 'topHabitsByTime' | 'monthlyCompletionData' | 'routineTimeAnalytics' | 'totalStats' | 'categoryStats' | 'weeklyTaskStats' | 'pendingTasks' | 'completedWeeklyTasks' | 'totalWeeklyTasks' | 'weeklyTasksProgress' | 'feelingStats' | 'influenceStats' | 'todayMood' | 'currentMonthName' | 'currentMonthYear' | 'monthlyIncome' | 'monthlyExpenses' | 'balance' | 'budget503020' | 'pendingRecurringExpenses' | 'paidRecurringExpenses' | 'pendingRecurringIncomes' | 'receivedRecurringIncomes' | 'pendingExpensesTotal' | 'expenseCategories' | 'incomeCategories' | 'categoriesWithoutBudget' | 'sortedLists' | 'spendingByCategory' | 'budgetAccuracy' | 'spendingByFocus' | 'urgentTasks' > = {
    allHabits: null,
    routines: null,
    tasks: null,
    goals: null,
    moods: null,
    transactions: null,
    budgets: null,
    shoppingLists: null,
    recurringExpenses: null,
    recurringIncomes: null,
    timeLogs: null,
    presetHabits: presetHabitsData.presetHabits,
    habitsLoading: true,
    routinesLoading: true,
    tasksLoading: true,
    goalsLoading: true,
    moodsLoading: true,
    transactionsLoading: true,
    budgetsLoading: true,
    shoppingListsLoading: true,
    recurringExpensesLoading: true,
    recurringIncomesLoading: true,
    timeLogsLoading: true,
    presetHabitsLoading: false,
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
    const { data: allHabits, isLoading: habitsLoading } = useCollection(allHabitsQuery);

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

    const goalsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/goals`);
    }, [user, firestore]);
    const { data: goals, isLoading: goalsLoading } = useCollection(goalsQuery);

    const timeLogsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/timeLogs`);
    }, [user, firestore]);
    const { data: timeLogs, isLoading: timeLogsLoading } = useCollection(timeLogsQuery);

    const budgetsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return collection(firestore, `users/${user.uid}/budgets`);
    }, [user, firestore]);
    const { data: budgets, isLoading: budgetsLoading } = useCollection(budgetsQuery);

    const shoppingListsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, `users/${user.uid}/shoppingLists`), orderBy('order'));
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
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return query(
            collection(firestore, 'users', user.uid, 'transactions'),
            where('date', '>=', startOfMonth.toISOString()),
            where('date', '<=', endOfMonth.toISOString()),
            orderBy('date', 'desc')
        );
    }, [user, firestore]);
    const { data: transactions, isLoading: transactionsLoading } = useCollection(transactionsQuery);

    const moodsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        const start = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
        const end = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 0);
        return query(
            collection(firestore, 'users', user.uid, 'moods'),
            where('date', '>=', start.toISOString()),
            where('date', '<=', end.toISOString())
        );
    }, [user, firestore, state.currentMonth]);
    const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);
    
    // --- Actions ---

    const handleToggleHabit = (habitId: string) => {
        if (!user || !allHabits || !firestore) return;
        const habit = allHabit.find((h) => h.id === habitId);
        if (!habit) return;
        const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);

        if (isHabitCompletedToday(habit)) {
            const updatedStreak = { ...habit.previousStreak };
             updateDocumentNonBlocking(habitRef, { 
                lastCompletedAt: habit.previousLastCompletedAt ?? null,
                currentStreak: habit.previousStreak ?? 0,
            });
        } else {
            const streakData = calculateStreak(habit);
            updateDocumentNonBlocking(habitRef, { 
                lastCompletedAt: Timestamp.now(),
                ...streakData,
                previousStreak: habit.currentStreak || 0,
                previousLastCompletedAt: habit.lastCompletedAt,
            });
        }
    };

    const handleCreateOrUpdateHabit = async (habitData: Habit) => {
        if (!habitData.name.trim() || !habitData.icon.trim() || !user || !habitData.category || !firestore) return;

        const { id, ...data } = habitData;
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', id), data);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'habits'), { ...data, currentStreak: 0, longestStreak: 0, createdAt: serverTimestamp(), lastCompletedAt: null, userId: user.uid });
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

    const handleToggleTask = (taskId: string, currentStatus: boolean) => {
        if (!user || !firestore) return;
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', taskId), { isCompleted: !currentStatus });
    };

    const handleSaveTask = async (taskData: Task) => {
        if (!user || !taskData.name || !firestore) return;
        const { id, ...data } = taskData;
        const serializableData = { ...data, dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null, userId: user.uid };
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', id), serializableData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'tasks'), { ...serializableData, isCompleted: false, createdAt: serverTimestamp() });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!user || !firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', taskId));
    };

    const handleSaveMood = async (moodData: Mood) => {
        if (!user || !firestore) return;
        const todayISO = new Date().toISOString().split('T')[0];
        const fullMoodData = { ...moodData, date: new Date().toISOString(), userId: user.uid };
        
        const q = query(collection(firestore, 'users', user.uid, 'moods'), where('date', '>=', `${todayISO}T00:00:00.000Z`), where('date', '<=', `${todayISO}T23:59:59.999Z`));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            await updateDocumentNonBlocking(snapshot.docs[0].ref, fullMoodData);
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'moods'), { ...fullMoodData, createdAt: serverTimestamp() });
        }
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

    const stopSession = () => {
        if (!state.activeSession || !user || !firestore) return;

        const durationSeconds = Math.floor((Date.now() - state.activeSession.startTime) / 1000);

        const timeLogsColRef = collection(firestore, 'users', user.uid, 'timeLogs');
        addDocumentNonBlocking(timeLogsColRef, {
            referenceId: state.activeSession.id,
            referenceType: state.activeSession.type,
            startTime: Timestamp.fromMillis(state.activeSession.startTime),
            endTime: Timestamp.now(),
            durationSeconds: durationSeconds,
            createdAt: serverTimestamp(),
            userId: user.uid,
        });

        if (state.activeSession.type === 'habit') {
            handleToggleHabit(state.activeSession.id);
        } else {
             handleToggleTask(state.activeSession.id, false);
        }

        dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
        dispatch({ type: 'SET_ELAPSED_TIME', payload: 0 });
    };


    // --- Derived State & Selectors ---
    const analyticsLoading = habitsLoading || timeLogsLoading || tasksLoading || routinesLoading;
    
    // Habit Selectors
    const { groupedHabits, dailyHabits, weeklyHabits, completedDaily, completedWeekly, longestStreak, longestCurrentStreak, habitCategoryData, dailyProductivityData, topHabitsByStreak, topHabitsByTime, monthlyCompletionData } = useMemo(() => {
        if (!allHabits || !timeLogs) return { groupedHabits: {}, dailyHabits: [], weeklyHabits: [], completedDaily: 0, completedWeekly: 0, longestStreak: 0, longestCurrentStreak: 0, habitCategoryData: [], dailyProductivityData: [], topHabitsByStreak: [], topHabitsByTime: [], monthlyCompletionData: [] };

        const grouped = allHabits.reduce((acc, habit) => {
            const category = habit.category || 'Sin Categoría';
            if (!acc[category]) acc[category] = [];
            acc[category].push(habit);
            return acc;
        }, {});

        const daily = allHabits.filter(h => h.frequency === 'Diario');
        const weekly = allHabits.filter(h => h.frequency === 'Semanal');
        const completedD = daily.filter(h => isHabitCompletedToday(h)).length;
        const completedW = weekly.filter(h => isHabitCompletedToday(h)).length;
        const longestS = allHabits.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0);
        const longestCS = allHabits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);

        const habitLogs = timeLogs.filter((log: any) => log.referenceType === 'habit');
        const categoryTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = allHabits.find((h: any) => h.id === log.referenceId);
            if (habit) {
                const category = habit.category || 'Sin Categoría';
                categoryTotals[category] = (categoryTotals[category] || 0) + log.durationSeconds;
            }
        });
        const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value / 60) })).filter(item => item.value > 0);

        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dailyTotals = Array(7).fill(0).map((_, i) => ({ name: daysOfWeek[i], value: 0}));
        timeLogs.forEach((log: any) => {
            const date = log.startTime.toDate();
            const dayIndex = date.getDay();
            dailyTotals[dayIndex].value += log.durationSeconds;
        });
        const dailyData = dailyTotals.map(day => ({...day, value: Math.round(day.value / 60)}));

        const topStreak = [...allHabits].sort((a,b) => (b.longestStreak || 0) - (a.longestStreak || 0)).slice(0, 5).map(h => ({ name: h.name, racha: h.longestStreak || 0 }));

        const timeTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = allHabits.find((h: any) => h.id === log.referenceId);
            if (habit) timeTotals[habit.name] = (timeTotals[habit.name] || 0) + log.durationSeconds;
        });
        const topTime = Object.entries(timeTotals).map(([name, time]) => ({ name, minutos: Math.round(time / 60) })).sort((a, b) => b.minutos - a.minutos).slice(0, 5);

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyHabitsForMonth = allHabits.filter(h => h.frequency === 'Diario');
        const completionByDay: Record<number, {completed: number, total: number}> = {};
        if (dailyHabitsForMonth.length > 0) {
            allHabits.forEach(habit => {
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

        return { groupedHabits: grouped, dailyHabits: daily, weeklyHabits: weekly, completedDaily: completedD, completedWeekly: completedW, longestStreak: longestS, longestCurrentStreak: longestCS, habitCategoryData: categoryData, dailyProductivityData: dailyData, topHabitsByStreak: topStreak, topHabitsByTime: topTime, monthlyCompletionData: monthlyData };
    }, [allHabits, timeLogs]);
    
    // Routines Selectors
    const routineTimeAnalytics = useMemo(() => {
        if (!routines || !allHabits || !timeLogs) return [];
        const habitTimeTotals: Record<string, number> = {};
        timeLogs.filter(log => log.referenceType === 'habit').forEach(log => {
            habitTimeTotals[log.referenceId] = (habitTimeTotals[log.referenceId] || 0) + log.durationSeconds;
        });
        const routineTotals: Record<string, number> = {};
        routines.forEach(routine => {
            routine.habitIds.forEach((habitId: string) => {
                if (habitTimeTotals[habitId]) routineTotals[routine.name] = (routineTotals[routine.name] || 0) + habitTimeTotals[habitId];
            });
        });
        return Object.entries(routineTotals).map(([name, time]) => ({ name, minutos: Math.round(time / 60) })).sort((a, b) => b.minutos - a.minutos);
    }, [routines, allHabits, timeLogs]);

    // Task Selectors
    const { totalStats, categoryStats, weeklyTaskStats, pendingTasks, completedWeeklyTasks, totalWeeklyTasks, weeklyTasksProgress } = useMemo(() => {
        const taskCategories = ["MinJusticia", "CNMH", "Proyectos Personales", "Otro"];
        if (!tasks) return { totalStats: { completed: 0, total: 0, completionRate: 0 }, categoryStats: {}, weeklyTaskStats: [], pendingTasks: [], completedWeeklyTasks: 0, totalWeeklyTasks: 0, weeklyTasksProgress: 0 };
        
        const today = new Date();
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);
        const weeklyTasks = tasks.filter(t => t.dueDate && t.dueDate.toDate() >= startOfWeek && t.dueDate.toDate() <= endOfWeek);

        const pending = weeklyTasks.filter(t => !t.isCompleted).sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);
        const completedWeekly = weeklyTasks.filter(t => t.isCompleted).length;
        const totalWeekly = weeklyTasks.length;
        const weeklyProgress = totalWeekly > 0 ? (completedWeekly / totalWeekly) * 100 : 0;
        
        const completed = tasks.filter(t => t.isCompleted).length;
        const total = tasks.length;
        const totalStats = { completed, total, completionRate: total > 0 ? (completed / total) * 100 : 0 };

        const catStats = taskCategories.reduce((acc, category) => {
            const tasksInCategory = tasks.filter(t => t.category === category);
            if (tasksInCategory.length > 0) {
                const completed = tasksInCategory.filter(t => t.isCompleted).length;
                acc[category] = { completed, total: tasksInCategory.length, completionRate: (completed / tasksInCategory.length) * 100 };
            }
            return acc;
        }, {} as Record<string, any>);

        const weekData = Array(7).fill(0).map((_, i) => ({ name: new Date(startOfWeek.getTime() + i * 86400000).toLocaleDateString('es-ES', { weekday: 'short' }), tasks: 0 }));
        tasks.forEach(task => {
            if (task.dueDate?.toDate() >= startOfWeek && task.dueDate?.toDate() <= endOfWeek) {
                const dayIndex = (task.dueDate.toDate().getDay() + 6) % 7;
                if(dayIndex >= 0 && dayIndex < 7) weekData[dayIndex].tasks++;
            }
        });
        
        return { totalStats, categoryStats: catStats, weeklyTaskStats: weekData, pendingTasks: pending, completedWeeklyTasks: completedWeekly, totalWeeklyTasks: totalWeekly, weeklyTasksProgress: weeklyProgress };
    }, [tasks]);

    // Mood Selectors
    const { feelingStats, influenceStats, todayMood } = useMemo(() => {
        if (!moods) return { feelingStats: [], influenceStats: [], todayMood: null };
        const feelings = moods.flatMap(m => m.feelings).reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {} as Record<string, number>);
        const influences = moods.flatMap(m => m.influences).reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {} as Record<string, number>);
        const today = moods.find(m => new Date(m.date).toDateString() === new Date().toDateString());
        return {
            feelingStats: (Object.entries(feelings) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            influenceStats: (Object.entries(influences) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5),
            todayMood: today,
        };
    }, [moods]);
    
    // Finance/Expenses Selectors
    const { currentMonthName, currentMonthYear, monthlyIncome, monthlyExpenses, balance, budget503020, pendingRecurringExpenses, paidRecurringExpenses, pendingRecurringIncomes, receivedRecurringIncomes, pendingExpensesTotal, expenseCategories, incomeCategories, categoriesWithoutBudget, sortedLists, spendingByCategory, budgetAccuracy, spendingByFocus } = useMemo(() => {
        const now = new Date();
        const monthName = now.toLocaleDateString('es-ES', { month: 'long' });
        const monthYear = `${now.getFullYear()}-${now.getMonth()}`;

        const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0;
        const expenses = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0;
        
        const bal = income - expenses;
        
        const b503020 = income > 0 ? {
            needs: { budget: income * 0.5, spend: transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Necesidades').reduce((s, t) => s + t.amount, 0) ?? 0, progress: ((transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Necesidades').reduce((s, t) => s + t.amount, 0) ?? 0) / (income * 0.5)) * 100 },
            wants: { budget: income * 0.3, spend: transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Deseos').reduce((s, t) => s + t.amount, 0) ?? 0, progress: ((transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Deseos').reduce((s, t) => s + t.amount, 0) ?? 0) / (income * 0.3)) * 100 },
            savings: { budget: income * 0.2, spend: transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Ahorros y Deudas').reduce((s, t) => s + t.amount, 0) ?? 0, progress: ((transactions?.filter(t => t.type === 'expense' && t.budgetFocus === 'Ahorros y Deudas').reduce((s, t) => s + t.amount, 0) ?? 0) / (income * 0.2)) * 100 },
        } : null;

        const pendingRE = recurringExpenses?.filter(e => e.lastInstanceCreated !== monthYear) ?? [];
        const paidRE = recurringExpenses?.filter(e => e.lastInstanceCreated === monthYear) ?? [];
        const pendingRI = recurringIncomes?.filter(i => i.lastInstanceCreated !== monthYear) ?? [];
        const receivedRI = recurringIncomes?.filter(i => i.lastInstanceCreated === monthYear) ?? [];
        
        const pendingRecurringTotal = pendingRE.reduce((s, e) => s + e.amount, 0);
        const pendingShoppingTotal = shoppingLists?.reduce((total, list) => 
            total + list.items.filter((item: any) => !item.isPurchased).reduce((subtotal: number, item: any) => subtotal + item.amount, 0), 0) ?? 0;
        const pendingETotal = pendingRecurringTotal + pendingShoppingTotal;

        
        const expCats = [...new Set(["Arriendo", "Servicios", "Transporte", "Salud", ...(budgets?.map(b => b.categoryName) ?? []), ...(transactions?.filter(t => t.type === 'expense').map(t => t.category) ?? [])])].filter(Boolean);
        const incCats = [...new Set(["Salario", "Bonificación", "Otro", ...(transactions?.filter(t => t.type === 'income').map(t => t.category) ?? [])])].filter(Boolean);
        const catsNoBudget = expCats.filter(cat => !budgets?.some(b => b.categoryName === cat));

        const sorted = shoppingLists ? [...shoppingLists].sort((a, b) => a.order - b.order) : [];

        const spendingByCat = shoppingLists?.map(l => ({ name: l.name, gasto: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.gasto > 0) ?? [];
        const budgetAcc = shoppingLists?.map(l => ({ name: l.name, estimado: l.items.filter((i:any) => i.isPurchased).reduce((s:number, i:any) => s + i.amount, 0), real: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.real > 0 || d.estimado > 0) ?? [];
        const spendingByF = (Object.entries(shoppingLists?.reduce((acc, l) => {
            const total = l.items.filter((i: any) => i.isPurchased && i.price).reduce((s: number, i: any) => s + i.price, 0);
            if(l.budgetFocus && acc.hasOwnProperty(l.budgetFocus)) acc[l.budgetFocus] += total;
            return acc;
        }, {'Necesidades':0, 'Deseos':0, 'Ahorros y Deudas':0}) ?? {}) as [string, number][]).map(([name, value]) => ({name, value})).filter(d => d.value > 0);

        return { currentMonthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), currentMonthYear: monthYear, monthlyIncome: income, monthlyExpenses: expenses, balance: bal, budget503020: b503020, pendingRecurringExpenses: pendingRE, paidRecurringExpenses: paidRE, pendingRecurringIncomes: pendingRI, receivedRecurringIncomes: receivedRI, pendingExpensesTotal: pendingETotal, expenseCategories: expCats, incomeCategories: incCats, categoriesWithoutBudget: catsNoBudget, sortedLists: sorted, spendingByCategory: spendingByCat, budgetAccuracy: budgetAcc, spendingByFocus: spendingByF };
    }, [transactions, recurringExpenses, recurringIncomes, shoppingLists, budgets]);

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
        goals,
        goalsLoading,
        moods: moods ?? [],
        moodsLoading,
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
        analyticsLoading,
        groupedHabits,
        dailyHabits,
        weeklyHabits,
        completedDaily,
        completedWeekly,
        longestStreak,
        longestCurrentStreak,
        habitCategoryData,
        dailyProductivityData,
        topHabitsByStreak,
        topHabitsByTime,
        monthlyCompletionData,
        routineTimeAnalytics,
        totalStats,
        categoryStats,
        weeklyTaskStats,
        pendingTasks,
        completedWeeklyTasks,
        totalWeeklyTasks,
        weeklyTasksProgress,
        feelingStats,
        influenceStats,
        todayMood,
        currentMonthName,
        currentMonthYear,
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
        handleToggleTask,
        handleSaveTask,
        handleDeleteTask,
        handleSaveMood,
        setCurrentMonth,
        startSession,
        stopSession,
    };

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'transactions', data: transactions, loading: transactionsLoading } });
    }, [transactions, transactionsLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'moods', data: moods, loading: moodsLoading } });
    }, [moods, moodsLoading]);

    useEffect(() => {
        dispatch({ type: 'SET_DATA', payload: { key: 'urgentTasks', data: urgentTasks, loading: urgentTasksLoading } });
    }, [urgentTasks, urgentTasksLoading]);

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

    