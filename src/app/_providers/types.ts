
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
    completionDate?: Date | null;
}

export interface Mood {
    moodLevel: number;
    moodLabel: string;
    emoji: string;
    feelings: string[];
    influences: string[];
    date?: Date;
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
    taskCategories: any[] | null;
    goals: any[] | null;
    moods: any[] | null;
    feelings: any[] | null;
    influences: any[] | null;
    transactions: any[] | null;
    annualTransactions: any[] | null;
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
    taskCategoriesLoading: boolean;
    goalsLoading: boolean;
    moodsLoading: boolean;
    feelingsLoading: boolean;
    influencesLoading: boolean;
    transactionsLoading: boolean;
    annualTransactionsLoading: boolean;
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
    modalState: { type: string | null; data?: any };
    formState: any;

    // Derived Data / Selectors
    groupedHabits: { [key: string]: any[] };
    dailyHabits: any[];
    weeklyHabits: any[];
    completedDaily: number;
    completedWeekly: number;
    longestStreak: number;
    topLongestStreakHabits: string[];
    longestCurrentStreak: number;
    topCurrentStreakHabits: string[];
    habitCategoryData: { name: string; value: number }[];
    dailyProductivityData: { name: string; value: number }[];
    topHabitsByStreak: any[];
    topHabitsByTime: any[];
    monthlyCompletionData: { day: number; value: number }[];
    
    routineTimeAnalytics: { name: string; minutos: number }[];
    routineCompletionAnalytics: { name: string; completionRate: number }[];

    totalStats: { completed: number; total: number; completionRate: number; };
    categoryStats: Record<string, { completed: number; total: number; completionRate: number; }>;
    taskTimeAnalytics: { name: string; minutos: number; }[];
    
    overdueTasks: any[];
    todayTasks: any[];
    upcomingTasks: any[];

    completedWeeklyTasks: number;
    totalWeeklyTasks: number;
    weeklyTasksProgress: number;
    completedDailyTasks: number;
    totalDailyTasks: number;
    dailyTasksProgress: number;
    onTimeCompletionRate: number;
    dailyCompletionStats: { name: string; completadas: number; pendientes: number }[];
    completedTasksByCategory: { name: string; tareas: number }[];

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
    
    // Annual Finance Data
    annualFlowData: { name: string, ingresos: number, gastos: number }[];
    annualCategorySpending: { name: string, value: any }[];
    monthlySummaryData: { month: string, ingresos: number, gastos: number, balance: number }[];
    annualTotalIncome: number;
    annualTotalExpense: number;
    annualNetSavings: number;
    annualSavingsRate: number;

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
    sortedLists: any[];
    urgentTasks: any[] | null;

    // Actions
    handleToggleHabit: (habitId: string) => void;
    handleSaveHabit: () => Promise<void>;
    handleDeleteHabit: () => Promise<void>;
    handleResetAllStreaks: () => Promise<void>;
    handleResetHabitStreak: () => Promise<void>;
    handleResetTimeLogs: () => Promise<void>;
    handleResetMoods: () => Promise<void>;
    handleResetCategories: () => Promise<void>;
    handleToggleTask: (taskId: string, currentStatus: boolean) => void;
    handleSaveTask: () => Promise<void>;
    handleDeleteTask: () => Promise<void>;
    handleSaveTaskCategory: () => Promise<void>;
    handleDeleteTaskCategory: (categoryId: string, categoryName: string) => Promise<void>;
    handleSaveRoutine: () => Promise<void>;
    handleDeleteRoutine: () => Promise<void>;
    handleCompleteRoutine: (routine: any) => Promise<void>;
    handleSaveGoal: () => Promise<void>;
    handleDeleteGoal: () => Promise<void>;
    handleUpdateGoalProgress: () => Promise<void>;
    handleSaveMood: (moodData: Mood) => Promise<void>;
    handlePayRecurringItem: (item: any, type: 'income' | 'expense') => Promise<void>;
    handleRevertRecurringItem: (item: any, type: 'income' | 'expense') => Promise<void>;
    handleSaveTransaction: () => Promise<void>;
    handleDeleteTransaction: () => Promise<void>;
    handleSaveBudget: () => Promise<void>;
    handleSaveRecurringItem: () => Promise<void>;
    handleDeleteRecurringItem: () => Promise<void>;
    handleCreateList: () => Promise<void>;
    handleAddItem: (listId: string | null) => Promise<void>;
    handleConfirmPurchase: (listId: string | null) => Promise<void>;
    handleDeleteItem: (listId: string, itemId: string) => Promise<void>;
    handleRevertPurchase: (listId: string, itemToRevert: any) => Promise<void>;
    setCurrentMonth: (date: Date | ((prev: Date) => Date)) => void;
    startSession: (id: string, name: string, type: 'habit' | 'task') => void;
    stopSession: () => void;
    handleOpenModal: (type: string, data?: any) => void;
    handleCloseModal: (type: string) => void;
    setFormState: React.Dispatch<any>;
}

