
'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { collection, doc, query, orderBy, Timestamp, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirebase, useCollectionData, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUI } from './UIProvider';
import { PRESET_TASK_CATEGORIES } from '@/lib/task-categories';

interface TasksContextState {
    tasks: any[] | null;
    tasksLoading: boolean;
    taskCategories: any[] | null;
    taskCategoriesLoading: boolean;

    // Derived State
    overdueTasks: any[];
    todayTasks: any[];
    upcomingTasks: any[];
    totalStats: { completed: number; total: number; completionRate: number };
    categoryStats: Record<string, { completed: number; total: number; completionRate: number }>;
    onTimeCompletionRate: number;
    dailyCompletionStats: { name: string; completadas: number; pendientes: number }[];
    completedTasksByCategory: { name: string; tareas: number }[];
    taskTimeAnalytics: { name: string; minutos: number }[];
    
    // Actions
    handleToggleTask: (taskId: string, currentStatus: boolean) => void;
    handleSaveTask: () => Promise<void>;
    handleDeleteTask: () => Promise<void>;
    handleSaveTaskCategory: () => Promise<void>;
    handleDeleteTaskCategory: () => Promise<void>;
}

const TasksContext = createContext<TasksContextState | undefined>(undefined);

export const useTasks = () => {
    const context = useContext(TasksContext);
    if (!context) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export const TasksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const { formState, handleCloseModal } = useUI();

    // --- Data Fetching ---
    const tasksQuery = useMemo(() => user ? query(collection(firestore, `users/${user.uid}/tasks`), orderBy('createdAt', 'desc')) : null, [user, firestore]);
    const { data: tasks, isLoading: tasksLoading } = useCollectionData(tasksQuery);

    const taskCategoriesQuery = useMemo(() => user ? query(collection(firestore, `users/${user.uid}/taskCategories`), orderBy('name')) : null, [user, firestore]);
    const { data: taskCategories, isLoading: taskCategoriesLoading } = useCollectionData(taskCategoriesQuery);
    
    const timeLogsQuery = useMemo(() => user ? collection(firestore, `users/${user.uid}/timeLogs`) : null, [user, firestore]);
    const { data: timeLogs } = useCollectionData(timeLogsQuery);

    // --- Actions ---
    const handleToggleTask = (taskId: string, currentStatus: boolean) => {
        if (!user || !firestore) return;
        const completionDate = !currentStatus ? Timestamp.now() : null;
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'tasks', taskId), { isCompleted: !currentStatus, completionDate });
    };

    const handleSaveTask = async () => {
        if (!user || !formState.name || !firestore) return;
        const { id, ...data } = formState;
        const date = data.dueDate instanceof Date ? data.dueDate : (data.dueDate ? new Date(data.dueDate) : null);
        const serializableData: any = { ...data, dueDate: date ? Timestamp.fromDate(date) : null, userId: user.uid };

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
        if (!id && taskCategories?.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Categoría duplicada', description: `La categoría "${name}" ya existe.`});
            return;
        }
        if (id) {
            await updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'taskCategories', id), { name });
        } else {
            await addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'taskCategories'), { name, isActive: true, userId: user.uid });
        }
        handleCloseModal('taskCategory');
    };

    const handleDeleteTaskCategory = async () => {
        const { id: categoryId, name: categoryName } = formState;
        if (!categoryId || !categoryName || !user || !firestore || !tasks) return;
        
        const batch = writeBatch(firestore);
        tasks.filter(t => t.category === categoryName).forEach(taskDoc => {
          batch.update(doc(firestore, 'users', user.uid, 'tasks', taskDoc.id), { category: 'Otro' });
        });
        batch.delete(doc(firestore, 'users', user.uid, 'taskCategories', categoryId));
        
        try {
          await batch.commit();
          toast({ title: 'Categoría Eliminada', description: `Las tareas de "${categoryName}" se han movido a "Otro".` });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo eliminar la categoría.' });
        }
        handleCloseModal('deleteTaskCategory');
    };

    // --- Derived State ---
    const derivedState = useMemo(() => {
        const allTasksData = tasks || [];
        const allTaskCategoriesData = taskCategories || [];
        const allTimeLogsData = timeLogs || [];

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const tomorrow = new Date(startOfDay); tomorrow.setDate(startOfDay.getDate() + 1);
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999);

        const overdueTasks = allTasksData.filter((t: any) => !t.isCompleted && t.dueDate && t.dueDate.toDate() < startOfDay);
        const todayTasks = allTasksData.filter((t: any) => !t.isCompleted && t.dueDate && t.dueDate.toDate() >= startOfDay && t.dueDate.toDate() < tomorrow);
        const upcomingTasks = allTasksData.filter((t: any) => !t.isCompleted && t.dueDate && t.dueDate.toDate() >= tomorrow && t.dueDate.toDate() <= endOfWeek);

        const completed = allTasksData.filter((t: any) => t.isCompleted).length;
        const total = allTasksData.length;
        const totalStats = { completed, total, completionRate: total > 0 ? (completed / total) * 100 : 0 };

        const completedWithDueDate = allTasksData.filter((t: any) => t.isCompleted && t.dueDate && t.completionDate);
        const onTime = completedWithDueDate.filter((t: any) => t.completionDate.toDate() <= t.dueDate.toDate()).length;
        const onTimeCompletionRate = completedWithDueDate.length > 0 ? (onTime / completedWithDueDate.length) * 100 : 0;

        const categoryStats = (allTaskCategoriesData || []).reduce((acc: any, category: any) => {
            const tasksInCategory = allTasksData.filter((t: any) => t.category === category.name);
            if (tasksInCategory.length > 0) {
                const completed = tasksInCategory.filter((t: any) => t.isCompleted).length;
                acc[category.name] = { completed, total: tasksInCategory.length, completionRate: (completed / tasksInCategory.length) * 100 };
            }
            return acc;
        }, {} as Record<string, any>);

        const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dailyCompletionStats = weekDays.map((name, i) => {
            const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate() + i);
            const dayStart = new Date(day); const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
            const dueTasks = allTasksData.filter((t: any) => t.dueDate && t.dueDate.toDate() >= dayStart && t.dueDate.toDate() <= dayEnd);
            const completedOnDay = allTasksData.filter((t: any) => t.isCompleted && t.completionDate && t.completionDate.toDate() >= dayStart && t.completionDate.toDate() <= dayEnd).length;
            return { name, completadas: completedOnDay, pendientes: dueTasks.filter((t: any) => !t.isCompleted).length };
        });

        const completedTasksByCategory = (allTaskCategoriesData || []).map((category: any) => ({ name: category.name, tareas: allTasksData.filter((t: any) => t.isCompleted && t.category === category.name).length })).filter((c: any) => c.tareas > 0);

        const taskTimeTotals = (allTimeLogsData || []).filter(log => log.referenceType === 'task').reduce((acc: any, log: any) => {
            const task = allTasksData.find(t => t.id === log.referenceId);
            if (task) {
                const category = task.category || 'Sin Categoría';
                acc[category] = (acc[category] || 0) + log.durationSeconds;
            }
            return acc;
        }, {});
        const taskTimeAnalytics = Object.entries(taskTimeTotals).map(([name, value]) => ({ name, minutos: Math.round(value as number / 60) })).filter(item => item.minutos > 0);

        return { overdueTasks, todayTasks, upcomingTasks, totalStats, categoryStats, onTimeCompletionRate, dailyCompletionStats, completedTasksByCategory, taskTimeAnalytics };
    }, [tasks, taskCategories, timeLogs]);

    return (
        <TasksContext.Provider value={{
            tasks,
            tasksLoading,
            taskCategories: taskCategories || PRESET_TASK_CATEGORIES.map(name => ({ id: name, name, isActive: true })),
            taskCategoriesLoading,
            ...derivedState,
            handleToggleTask,
            handleSaveTask,
            handleDeleteTask,
            handleSaveTaskCategory,
            handleDeleteTaskCategory,
        }}>
            {children}
        </TasksContext.Provider>
    );
};
