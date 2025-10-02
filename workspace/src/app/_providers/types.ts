
'use client';

import type { User } from 'firebase/auth';

export interface Habit {
    id?: string;
    name: string;
    icon: string;
    frequency: string;
    category: string;
    lastTimeLogId?: string | null;
}

export interface Task {
    id?: string;
    name: string;
    dueDate?: Date;
    priority: string;
    category: string;
}

export interface Mood {
    moodLevel: number;
    moodLabel: string;
    emoji: string;
    feelings: string[];
    influences: string[];
}

export interface ActiveSession {
    id: string;
    name: string;
    type: 'habit' | 'task';
    startTime: number;
}

// Define the shape of the global state
export interface AppState {
    firestore: any;
    user: User | null;

    // Data
    allHabits: any[] | null;
    routines: any[] | null;
    tasks: any[] | null;
    goals: any[] | null;
    moods: any[] | null;
    transactions: any[] | null;
    budgets: any[] | null;
    shoppingLists: any[] | null;
    recurringExpenses: any[] | null;
    recurringIncomes: any[] | null;
    timeLogs: any[] | null;
    presetHabits: any[] | null;

    // Loading states
    habitsLoading: boolean;
    routinesLoading: boolean;
    tasksLoading: boolean;
    goalsLoading: boolean;
    moodsLoading: boolean;
    transactionsLoading: boolean;
    budgetsLoading: boolean;
    shoppingListsLoading: boolean;
    recurringExpensesLoading: boolean;
    recurringIncomesLoading: boolean;
    timeLogsLoading: boolean;
    presetHabitsLoading: boolean;
    analyticsLoading: boolean;
    
    // UI State
    currentMonth: Date;
    activeSession: ActiveSession | null;
    elapsedTime: number;

    // Derived Data / Selectors
    groupedHabits: { [key: string]: any[] };
    dailyHabits: any[];
    weeklyHabits: any[];
    completedDaily: number;
    completedWeekly: number;
    longestStreak: number;
    longestCurrentStreak: number;
    habitCategoryData: { name: string; value: number }[];
    dailyProductivityData: { name: string; value: number }[];
    topHabitsByStreak: any[];
    topHabitsByTime: any[];
    monthlyCompletionData: { day: number; value: number }[];
    routineTimeAnalytics: { name: string; minutos: number }[];
    totalStats: { completed: number; total: number; completionRate: number; };
    categoryStats: Record<string, { completed: number; total: number; completionRate: number; }>;
    weeklyTaskStats: { name: string; tasks: number; }[];
    pendingTasks: any[];
    completedWeeklyTasks: number;
    totalWeeklyTasks: number;
    weeklyTasksProgress: number;
    completedDailyTasks: number;
    totalDailyTasks: number;
    dailyTasksProgress: number;
    feelingStats: [string, any][];
    influenceStats: [string, any][];
    todayMood: any;
    currentMonthName: string;
    currentMonthYear: string;
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
    sortedLists: any[];
    spendingByCategory: { name: string; gasto: number }[];
    budgetAccuracy: { name: string; estimado: number; real: number }[];
    spendingByFocus: { name: string; value: number }[];
    urgentTasks: any[] | null;

    // Actions
    handleToggleHabit: (habitId: string) => void;
    handleCreateOrUpdateHabit: (habitData: Habit) => Promise<void>;
    handleDeleteHabit: (habitId: string) => Promise<void>;
    handleResetAllStreaks: () => Promise<void>;
    handleResetTimeLogs: () => Promise<void>;
    handleResetMoods: () => Promise<void>;
    handleResetCategories: () => Promise<void>;
    handleToggleTask: (taskId: string, currentStatus: boolean) => void;
    handleSaveTask: (taskData: Task) => Promise<void>;
    handleDeleteTask: (taskId: string) => Promise<void>;
    handleSaveMood: (moodData: Mood) => Promise<void>;
    setCurrentMonth: (date: Date | ((prev: Date) => Date)) => void;
    startSession: (id: string, name: string, type: 'habit' | 'task') => void;
    stopSession: () => void;
}
