'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useFirebase, useCollection, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp, where } from 'firebase/firestore';

interface Task {
    id?: string;
    name: string;
    dueDate?: Date;
    priority: string;
    category: string;
}

interface TasksContextType {
    firestore: any;
    user: any;
    tasks: any[] | null;
    tasksLoading: boolean;
    allTasksData: any[] | null;
    allTasksLoading: boolean;
    totalStats: { completed: number; total: number; completionRate: number; };
    categoryStats: Record<string, { completed: number; total: number; completionRate: number; }>;
    weeklyTaskStats: { name: string; tasks: number; }[];
    weeklyTasks: any[] | null;
    pendingTasks: any[];
    completedWeeklyTasks: number;
    totalWeeklyTasks: number;
    weeklyTasksProgress: number;
    handleToggleTask: (taskId: string, currentStatus: boolean) => void;
    handleSaveTask: (taskData: Task) => Promise<void>;
    handleDeleteTask: (taskId: string) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

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

const taskCategories = ["MinJusticia", "CNMH", "Proyectos Personales", "Otro"];


export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();

    const allTasksQuery = useMemo(() => {
        if (!user) return null;
        return query(collection(firestore, 'users', user.uid, 'tasks'));
    }, [firestore, user]);
    const { data: allTasksData, isLoading: allTasksLoading } = useCollection(allTasksQuery);
    
    // This is for the main tasks page, which can be filtered
    const tasksQuery = useMemo(() => {
        if (!user) return null;
        // In a real app, you'd probably pass a filter state here
        return query(collection(firestore, 'users', user.uid, 'tasks'));
    }, [firestore, user]);
    const { data: tasks, isLoading: tasksLoading } = useCollection(tasksQuery);

    const today = useMemo(() => new Date(), []);
    const weeklyTasksQuery = useMemo(() => {
        if (!user) return null;
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);
        return query(
            collection(firestore, 'users', user.uid, 'tasks'),
            where('dueDate', '>=', startOfWeek),
            where('dueDate', '<=', endOfWeek)
        );
    }, [firestore, user, today]);
    const { data: weeklyTasks } = useCollection(weeklyTasksQuery);
    
    const pendingTasks = useMemo(() => weeklyTasks?.filter(t => !t.isCompleted) || [], [weeklyTasks]);
    const completedWeeklyTasks = useMemo(() => weeklyTasks?.filter(t => t.isCompleted).length || 0, [weeklyTasks]);
    const totalWeeklyTasks = weeklyTasks?.length || 0;
    const weeklyTasksProgress = totalWeeklyTasks > 0 ? (completedWeeklyTasks / totalWeeklyTasks) * 100 : 0;


    const { totalStats, categoryStats, weeklyTaskStats } = useMemo(() => {
        if (!allTasksData) return { totalStats: { completed: 0, total: 0, completionRate: 0 }, categoryStats: {}, weeklyTaskStats: [] };

        const completed = allTasksData.filter(t => t.isCompleted).length;
        const total = allTasksData.length;
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        const totalStats = { completed, total, completionRate };

        const categoryStats = taskCategories.reduce((acc, category) => {
            const tasksInCategory = allTasksData.filter(t => t.category === category);
            if (tasksInCategory.length > 0) {
                const completed = tasksInCategory.filter(t => t.isCompleted).length;
                const total = tasksInCategory.length;
                const completionRate = total > 0 ? (completed / total) * 100 : 0;
                acc[category] = { completed, total, completionRate };
            }
            return acc;
        }, {} as Record<string, { completed: number; total: number; completionRate: number; }>);
        
        const startOfWeekForChart = getStartOfWeek(new Date());
        const weekData = Array(7).fill(0).map((_, i) => {
            const day = new Date(startOfWeekForChart);
            day.setDate(startOfWeekForChart.getDate() + i);
            return {
                name: day.toLocaleDateString('es-ES', { weekday: 'short' }),
                tasks: 0,
            };
        });

        allTasksData.forEach(task => {
            if (task.dueDate && task.dueDate.toDate) {
                const taskDate = task.dueDate.toDate();
                const startOfTaskWeek = getStartOfWeek(taskDate);
                if (startOfTaskWeek.getTime() === startOfWeekForChart.getTime()){
                    const dayIndex = (taskDate.getDay() + 6) % 7; 
                    if (dayIndex >= 0 && dayIndex < 7) {
                        weekData[dayIndex].tasks++;
                    }
                }
            }
        });

        return { totalStats, categoryStats, weeklyTaskStats: weekData };
    }, [allTasksData]);

    const handleToggleTask = (taskId: string, currentStatus: boolean) => {
        if (!user) return;
        const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskId);
        updateDocumentNonBlocking(taskRef, { isCompleted: !currentStatus });
    };

    const handleSaveTask = async (taskData: Task) => {
        if (!user || !taskData.name) return;

        const { id, ...data } = taskData;
        const serializableData = {
            ...data,
            dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
            userId: user.uid,
        };

        if (id) {
            const taskRef = doc(firestore, 'users', user.uid, 'tasks', id);
            await updateDocumentNonBlocking(taskRef, serializableData);
        } else {
            const tasksColRef = collection(firestore, 'users', user.uid, 'tasks');
            await addDocumentNonBlocking(tasksColRef, {
                ...serializableData,
                isCompleted: false,
                createdAt: serverTimestamp(),
            });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!user) return;
        const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskId);
        await deleteDocumentNonBlocking(taskRef);
    };

    const value = {
        firestore,
        user,
        tasks,
        tasksLoading,
        allTasksData,
        allTasksLoading,
        totalStats,
        categoryStats,
        weeklyTaskStats,
        weeklyTasks,
        pendingTasks,
        completedWeeklyTasks,
        totalWeeklyTasks,
        weeklyTasksProgress,
        handleToggleTask,
        handleSaveTask,
        handleDeleteTask
    };

    return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
};

export const useTasks = () => {
    const context = useContext(TasksContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
};
