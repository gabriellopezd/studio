'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirebase, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#d0ed57',
];

const formatMinutes = (seconds: number) => {
  return (seconds / 60).toFixed(0);
};

export default function AnalyticsPage() {
  const { firestore, user } = useFirebase();

  const timeLogsQuery = useMemo(
    () => (user ? query(collection(firestore, 'users', user.uid, 'timeLogs')) : null),
    [firestore, user]
  );
  const { data: timeLogs, isLoading: timeLogsLoading } = useCollection(timeLogsQuery);

  const habitsQuery = useMemo(
    () => (user ? query(collection(firestore, 'users', user.uid, 'habits')) : null),
    [firestore, user]
  );
  const { data: habits, isLoading: habitsLoading } = useCollection(habitsQuery);

  const tasksQuery = useMemo(
    () => (user ? query(collection(firestore, 'users', user.uid, 'tasks')) : null),
    [firestore, user]
  );
  const { data: tasks, isLoading: tasksLoading } = useCollection(tasksQuery);

  const habitCategoryData = useMemo(() => {
    if (!timeLogs || !habits) return [];
    const habitLogs = timeLogs.filter((log) => log.referenceType === 'habit');
    const categoryTotals: Record<string, number> = {};

    habitLogs.forEach((log) => {
      const habit = habits.find((h) => h.id === log.referenceId);
      if (habit) {
        const category = habit.category || 'Sin Categoría';
        categoryTotals[category] = (categoryTotals[category] || 0) + log.durationSeconds;
      }
    });

    return Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value: Math.round(value / 60) }))
        .filter(item => item.value > 0);
  }, [timeLogs, habits]);
  
  const taskTimeData = useMemo(() => {
    if (!timeLogs || !tasks) return [];
    const taskLogs = timeLogs.filter((log) => log.referenceType === 'task');
    const taskTotals: Record<string, { total: number, name: string }> = {};

    taskLogs.forEach((log) => {
      const task = tasks.find((t) => t.id === log.referenceId);
      if (task) {
        if (!taskTotals[task.id]) {
            taskTotals[task.id] = { total: 0, name: task.name };
        }
        taskTotals[task.id].total += log.durationSeconds;
      }
    });

    return Object.values(taskTotals)
        .map(item => ({ name: item.name, value: Math.round(item.total / 60) }))
        .filter(item => item.value > 0)
        .sort((a,b) => b.value - a.value)
        .slice(0, 10);
  }, [timeLogs, tasks]);
  
  const dailyProductivityData = useMemo(() => {
    if (!timeLogs) return [];
    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dailyTotals = Array(7).fill(0).map((_, i) => ({ name: daysOfWeek[i], value: 0}));

    timeLogs.forEach((log) => {
      const date = log.startTime.toDate();
      const dayIndex = date.getDay();
      dailyTotals[dayIndex].value += log.durationSeconds;
    });

    return dailyTotals.map(day => ({...day, value: Math.round(day.value / 60)}));
  }, [timeLogs]);


  const isLoading = timeLogsLoading || habitsLoading || tasksLoading;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Análisis de Productividad"
        description="Visualiza cómo y dónde inviertes tu tiempo de enfoque."
      />
      
      {isLoading && <p>Cargando análisis...</p>}

      {!isLoading && timeLogs?.length === 0 && (
          <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
            <CardHeader>
              <CardTitle className="mt-4">No hay datos para analizar</CardTitle>
              <CardDescription>
                Empieza a usar el cronómetro en tus hábitos y tareas para ver tus analíticas.
              </CardDescription>
            </CardHeader>
          </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Tiempo por Categoría de Hábito</CardTitle>
                <CardDescription>Distribución de tu tiempo de enfoque en hábitos (en minutos).</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={habitCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                            {habitCategoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} min`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Productividad por Día de la Semana</CardTitle>
                <CardDescription>Total de minutos de enfoque (hábitos y tareas) por día.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyProductivityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis unit=" min" />
                        <Tooltip formatter={(value) => `${value} min`} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" name="Minutos de Enfoque">
                           {dailyProductividadData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Top 10 Tareas por Tiempo Dedicado</CardTitle>
                <CardDescription>Las tareas que más tiempo de enfoque han consumido (en minutos).</CardDescription>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={taskTimeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" unit=" min" />
                        <YAxis type="category" dataKey="name" width={150} />
                        <Tooltip formatter={(value) => `${value} min`} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" name="Minutos dedicados">
                            {taskTimeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
