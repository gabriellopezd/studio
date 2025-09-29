
'use client';

import React, { useReducer, useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, doc, Timestamp, serverTimestamp, getDocs, writeBatch, increment, getDoc, limit } from 'firebase/firestore';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { AppContext, AppState, Habit, Task, Mood, ActiveSession } from './AppContext';
import { isHabitCompletedToday, checkHabitStreak } from '@/lib/habits';
import { Button } from '@/components/ui/button';
import { Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';


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

const initialState: Omit<AppState, keyof ReturnType<typeof useFirebase> | 'handleToggleHabit' | 'handleCreateOrUpdateHabit' | 'handleDeleteHabit' | 'handleResetStreak' | 'handleToggleTask' | 'handleSaveTask' | 'handleDeleteTask' | 'handleSaveMood' | 'setCurrentMonth' | 'startSession' | 'stopSession' | 'analyticsLoading' | 'groupedHabits' | 'dailyHabits' | 'weeklyHabits' | 'completedDaily' | 'completedWeekly' | 'longestStreak' | 'longestCurrentStreak' | 'habitCategoryData' | 'dailyProductivityData' | 'topHabitsByStreak' | 'topHabitsByTime' | 'monthlyCompletionData' | 'routineTimeAnalytics' | 'totalStats' | 'categoryStats' | 'weeklyTaskStats' | 'pendingTasks' | 'completedWeeklyTasks' | 'totalWeeklyTasks' | 'weeklyTasksProgress' | 'feelingStats' | 'influenceStats' | 'todayMood' | 'currentMonthName' | 'currentMonthYear' | 'monthlyIncome' | 'monthlyExpenses' | 'balance' | 'budget503020' | 'pendingRecurringExpenses' | 'paidRecurringExpenses' | 'pendingRecurringIncomes' | 'receivedRecurringIncomes' | 'pendingExpensesTotal' | 'expenseCategories' | 'incomeCategories' | 'categoriesWithoutBudget' | 'sortedLists' | 'spendingByCategory' | 'budgetAccuracy' | 'spendingByFocus' | 'urgentTasks' > = {
    firestore: null,
    user: null,
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
    
    // --- Data Fetching using useCollection ---
    const useCollectionData = (key: string, collectionName: string, queryBuilder?: (c: any) => any) => {
        const memoizedQuery = useMemo(() => {
            if (!user || !firestore) return null;
            const baseCollection = collection(firestore, 'users', user.uid, collectionName);
            return queryBuilder ? queryBuilder(baseCollection) : baseCollection;
        }, [user, firestore, collectionName]);

        const { data, isLoading } = useCollection(memoizedQuery);

        useEffect(() => {
            dispatch({ type: 'SET_DATA', payload: { key, data, loading: isLoading } });
        }, [data, isLoading, key]);

        return { data, isLoading };
    };

    const { data: allHabitsData, isLoading: habitsLoading } = useCollectionData('allHabits', 'habits');
    useCollectionData('routines', 'routines');
    useCollectionData('tasks', 'tasks', c => query(c, orderBy('createdAt', 'desc')));
    useCollectionData('goals', 'goals');
    useCollectionData('timeLogs', 'timeLogs');
    useCollectionData('budgets', 'budgets');
    useCollectionData('shoppingLists', 'shoppingLists', c => query(c, orderBy('order')));
    useCollectionData('recurringExpenses', 'recurringExpenses', c => query(c, orderBy('dayOfMonth')));
    useCollectionData('recurringIncomes', 'recurringIncomes', c => query(c, orderBy('dayOfMonth')));

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
    
    // Streak checking logic
    const checkHabitStreaks = async (habits: any[], user: any, firestore: any) => {
        const batch = writeBatch(firestore);
        let hasUpdates = false;

        for (const habit of habits) {
            const streakUpdate = checkHabitStreak(habit);
            if (streakUpdate) {
                const habitRef = doc(firestore, 'users', user.uid, 'habits', habit.id);
                batch.update(habitRef, streakUpdate);
                hasUpdates = true;
            }
        }

        if (hasUpdates) {
            await batch.commit();
        }
    };
    
    useEffect(() => {
        if (!habitsLoading && allHabitsData && user && firestore && !streaksChecked) {
            checkHabitStreaks(allHabitsData, user, firestore);
            setStreaksChecked(true);
        }
    }, [habitsLoading, allHabitsData, user, firestore, streaksChecked]);


    // --- Actions ---

    const handleToggleHabit = (habitId: string) => {
        if (!user || !state.allHabits || !firestore) return;
        const habit = state.allHabits.find((h) => h.id === habitId);
        if (!habit) return;
        const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);

        if (isHabitCompletedToday(habit)) {
             updateDocumentNonBlocking(habitRef, { 
                lastCompletedAt: habit.previousLastCompletedAt ?? null,
                currentStreak: habit.previousStreak ?? 0,
                previousLastCompletedAt: null, 
                previousStreak: null,
            });
        } else {
            updateDocumentNonBlocking(habitRef, { 
                lastCompletedAt: Timestamp.now(),
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

    const handleResetStreak = async (habitId: string) => {
        if (!user || !firestore) return;
        await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'habits', habitId), {
            currentStreak: 0,
            longestStreak: 0,
            lastCompletedAt: null,
            previousStreak: null,
            previousLastCompletedAt: null,
        });
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
    const analyticsLoading = state.habitsLoading || state.timeLogsLoading || state.tasksLoading || state.routinesLoading;
    
    // Habit Selectors
    const { groupedHabits, dailyHabits, weeklyHabits, completedDaily, completedWeekly, longestStreak, longestCurrentStreak, habitCategoryData, dailyProductivityData, topHabitsByStreak, topHabitsByTime, monthlyCompletionData } = useMemo(() => {
        if (!state.allHabits || !state.timeLogs) return { groupedHabits: {}, dailyHabits: [], weeklyHabits: [], completedDaily: 0, completedWeekly: 0, longestStreak: 0, longestCurrentStreak: 0, habitCategoryData: [], dailyProductivityData: [], topHabitsByStreak: [], topHabitsByTime: [], monthlyCompletionData: [] };

        const grouped = state.allHabits.reduce((acc, habit) => {
            const category = habit.category || 'Sin Categoría';
            if (!acc[category]) acc[category] = [];
            acc[category].push(habit);
            return acc;
        }, {});

        const daily = state.allHabits.filter(h => h.frequency === 'Diario');
        const weekly = state.allHabits.filter(h => h.frequency === 'Semanal');
        const completedD = daily.filter(h => isHabitCompletedToday(h)).length;
        const completedW = weekly.filter(h => isHabitCompletedToday(h)).length;
        const longestS = state.allHabits.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0);
        const longestCS = state.allHabits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);

        const habitLogs = state.timeLogs.filter((log: any) => log.referenceType === 'habit');
        const categoryTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = state.allHabits.find((h: any) => h.id === log.referenceId);
            if (habit) {
                const category = habit.category || 'Sin Categoría';
                categoryTotals[category] = (categoryTotals[category] || 0) + log.durationSeconds;
            }
        });
        const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value: Math.round(value / 60) })).filter(item => item.value > 0);

        const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dailyTotals = Array(7).fill(0).map((_, i) => ({ name: daysOfWeek[i], value: 0}));
        state.timeLogs.forEach((log: any) => {
            const date = log.startTime.toDate();
            const dayIndex = date.getDay();
            dailyTotals[dayIndex].value += log.durationSeconds;
        });
        const dailyData = dailyTotals.map(day => ({...day, value: Math.round(day.value / 60)}));

        const topStreak = [...state.allHabits].sort((a,b) => (b.longestStreak || 0) - (a.longestStreak || 0)).slice(0, 5).map(h => ({ name: h.name, racha: h.longestStreak || 0 }));

        const timeTotals: Record<string, number> = {};
        habitLogs.forEach((log: any) => {
            const habit = state.allHabits.find((h: any) => h.id === log.referenceId);
            if (habit) timeTotals[habit.name] = (timeTotals[habit.name] || 0) + log.durationSeconds;
        });
        const topTime = Object.entries(timeTotals).map(([name, time]) => ({ name, minutos: Math.round(time / 60) })).sort((a, b) => b.minutos - a.minutos).slice(0, 5);

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dailyHabitsForMonth = state.allHabits.filter(h => h.frequency === 'Diario');
        const completionByDay: Record<number, {completed: number, total: number}> = {};
        if (dailyHabitsForMonth.length > 0) {
            state.allHabits.forEach(habit => {
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
    }, [state.allHabits, state.timeLogs]);
    
    // Routines Selectors
    const routineTimeAnalytics = useMemo(() => {
        if (!state.routines || !state.allHabits || !state.timeLogs) return [];
        const habitTimeTotals: Record<string, number> = {};
        state.timeLogs.filter(log => log.referenceType === 'habit').forEach(log => {
            habitTimeTotals[log.referenceId] = (habitTimeTotals[log.referenceId] || 0) + log.durationSeconds;
        });
        const routineTotals: Record<string, number> = {};
        state.routines.forEach(routine => {
            routine.habitIds.forEach((habitId: string) => {
                if (habitTimeTotals[habitId]) routineTotals[routine.name] = (routineTotals[routine.name] || 0) + habitTimeTotals[habitId];
            });
        });
        return Object.entries(routineTotals).map(([name, time]) => ({ name, minutos: Math.round(time / 60) })).sort((a, b) => b.minutos - a.minutos);
    }, [state.routines, state.allHabits, state.timeLogs]);

    // Task Selectors
    const { totalStats, categoryStats, weeklyTaskStats, pendingTasks, completedWeeklyTasks, totalWeeklyTasks, weeklyTasksProgress } = useMemo(() => {
        const taskCategories = ["MinJusticia", "CNMH", "Proyectos Personales", "Otro"];
        if (!state.tasks) return { totalStats: { completed: 0, total: 0, completionRate: 0 }, categoryStats: {}, weeklyTaskStats: [], pendingTasks: [], completedWeeklyTasks: 0, totalWeeklyTasks: 0, weeklyTasksProgress: 0 };
        
        const today = new Date();
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);
        const weeklyTasks = state.tasks.filter(t => t.dueDate && t.dueDate.toDate() >= startOfWeek && t.dueDate.toDate() <= endOfWeek);

        const pending = weeklyTasks.filter(t => !t.isCompleted).sort((a, b) => a.dueDate.seconds - b.dueDate.seconds);
        const completedWeekly = weeklyTasks.filter(t => t.isCompleted).length;
        const totalWeekly = weeklyTasks.length;
        const weeklyProgress = totalWeekly > 0 ? (completedWeekly / totalWeekly) * 100 : 0;
        
        const completed = state.tasks.filter(t => t.isCompleted).length;
        const total = state.tasks.length;
        const totalStats = { completed, total, completionRate: total > 0 ? (completed / total) * 100 : 0 };

        const catStats = taskCategories.reduce((acc, category) => {
            const tasksInCategory = state.tasks.filter(t => t.category === category);
            if (tasksInCategory.length > 0) {
                const completed = tasksInCategory.filter(t => t.isCompleted).length;
                acc[category] = { completed, total: tasksInCategory.length, completionRate: (completed / tasksInCategory.length) * 100 };
            }
            return acc;
        }, {} as Record<string, any>);

        const weekData = Array(7).fill(0).map((_, i) => ({ name: new Date(startOfWeek.getTime() + i * 86400000).toLocaleDateString('es-ES', { weekday: 'short' }), tasks: 0 }));
        state.tasks.forEach(task => {
            if (task.dueDate?.toDate() >= startOfWeek && task.dueDate?.toDate() <= endOfWeek) {
                const dayIndex = (task.dueDate.toDate().getDay() + 6) % 7;
                if(dayIndex >= 0 && dayIndex < 7) weekData[dayIndex].tasks++;
            }
        });
        
        return { totalStats, categoryStats: catStats, weeklyTaskStats: weekData, pendingTasks: pending, completedWeeklyTasks: completedWeekly, totalWeeklyTasks: totalWeekly, weeklyTasksProgress: weeklyProgress };
    }, [state.tasks]);

    // Mood Selectors
    const { feelingStats, influenceStats, todayMood } = useMemo(() => {
        if (!moods) return { feelingStats: [], influenceStats: [], todayMood: null };
        const feelings = moods.flatMap(m => m.feelings).reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {} as Record<string, number>);
        const influences = moods.flatMap(m => m.influences).reduce((acc, i) => { acc[i] = (acc[i] || 0) + 1; return acc; }, {} as Record<string, number>);
        const today = moods.find(m => new Date(m.date).toDateString() === new Date().toDateString());
        return {
            feelingStats: Object.entries(feelings).sort((a, b) => b[1] - a[1]).slice(0, 5),
            influenceStats: Object.entries(influences).sort((a, b) => b[1] - a[1]).slice(0, 5),
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

        const pendingRE = state.recurringExpenses?.filter(e => e.lastInstanceCreated !== monthYear) ?? [];
        const paidRE = state.recurringExpenses?.filter(e => e.lastInstanceCreated === monthYear) ?? [];
        const pendingRI = state.recurringIncomes?.filter(i => i.lastInstanceCreated !== monthYear) ?? [];
        const receivedRI = state.recurringIncomes?.filter(i => i.lastInstanceCreated === monthYear) ?? [];
        const pendingETotal = (pendingRE.reduce((s, e) => s + e.amount, 0)) + (state.shoppingLists?.reduce((s, l) => s + l.items.filter((i: any) => !i.isPurchased).reduce((iS: number, i: any) => iS + (i.amount || 0), 0), 0) ?? 0);
        
        const expCats = [...new Set(["Arriendo", "Servicios", "Transporte", "Salud", ...(state.budgets?.map(b => b.categoryName) ?? []), ...(transactions?.filter(t => t.type === 'expense').map(t => t.category) ?? [])])].filter(Boolean);
        const incCats = [...new Set(["Salario", "Bonificación", "Otro", ...(transactions?.filter(t => t.type === 'income').map(t => t.category) ?? [])])].filter(Boolean);
        const catsNoBudget = expCats.filter(cat => !state.budgets?.some(b => b.categoryName === cat));

        const sorted = state.shoppingLists ? [...state.shoppingLists].sort((a, b) => a.order - b.order) : [];

        const spendingByCat = state.shoppingLists?.map(l => ({ name: l.name, gasto: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.gasto > 0) ?? [];
        const budgetAcc = state.shoppingLists?.map(l => ({ name: l.name, estimado: l.items.filter((i:any) => i.isPurchased).reduce((s:number, i:any) => s + i.amount, 0), real: l.items.filter((i:any) => i.isPurchased && i.price).reduce((s:number, i:any) => s + i.price, 0) })).filter(d => d.real > 0 || d.estimado > 0) ?? [];
        const spendingByF = Object.entries(state.shoppingLists?.reduce((acc, l) => {
            const total = l.items.filter((i: any) => i.isPurchased && i.price).reduce((s: number, i: any) => s + i.price, 0);
            if(l.budgetFocus && acc.hasOwnProperty(l.budgetFocus)) acc[l.budgetFocus] += total;
            return acc;
        }, {'Necesidades':0, 'Deseos':0, 'Ahorros y Deudas':0}) ?? {}).map(([name, value]) => ({name, value})).filter(d => d.value > 0);

        return { currentMonthName: monthName.charAt(0).toUpperCase() + monthName.slice(1), currentMonthYear: monthYear, monthlyIncome: income, monthlyExpenses: expenses, balance: bal, budget503020: b503020, pendingRecurringExpenses: pendingRE, paidRecurringExpenses: paidRE, pendingRecurringIncomes: pendingRI, receivedRecurringIncomes: receivedRI, pendingExpensesTotal: pendingETotal, expenseCategories: expCats, incomeCategories: incCats, categoriesWithoutBudget: catsNoBudget, sortedLists: sorted, spendingByCategory: spendingByCat, budgetAccuracy: budgetAcc, spendingByFocus: spendingByF };
    }, [transactions, state.recurringExpenses, state.recurringIncomes, state.shoppingLists, state.budgets]);


    const value: AppState = {
        ...state,
        firestore,
        user,
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
        transactions: transactions ?? [],
        moods: moods ?? [],
        handleToggleHabit,
        handleCreateOrUpdateHabit,
        handleDeleteHabit,
        handleResetStreak,
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
