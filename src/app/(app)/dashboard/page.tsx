'use client';

import {
  Smile,
  CalendarDays,
  Heart,
  Wind,
  Flame,
  Trophy,
  Activity,
  ListTodo,
  CheckCircle2,
  SquareCheck,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import PageHeader from '@/components/page-header';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HabitsProvider, useHabits } from '@/app/(app)/habits/_components/HabitsProvider';
import { TasksProvider, useTasks } from '@/app/(app)/tasks/_components/TasksProvider';
import { MoodsProvider, useMoods } from '@/app/(app)/mood-tracker/_components/MoodsProvider';


function DashboardContent() {
  const [isClient, setIsClient] = useState(false);
  
  const { 
    dailyHabits,
    weeklyHabits,
    completedDaily,
    completedWeekly,
    longestStreak,
    longestCurrentStreak,
    habitsLoading
  } = useHabits();
  
  const { 
    pendingTasks, 
    completedWeeklyTasks, 
    totalWeeklyTasks, 
    weeklyTasksProgress,
    tasksLoading
  } = useTasks();

  const { todayMood, moodsLoading } = useMoods();

  const dailyProgress = dailyHabits.length > 0 ? (completedDaily / dailyHabits.length) * 100 : 0;
  const weeklyProgress = weeklyHabits.length > 0 ? (completedWeekly / weeklyHabits.length) * 100 : 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const todayString = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard de Bienestar"
        description={
          isClient
            ? `Tu resumen de hoy, ${todayString}.`
            : 'Tu resumen de hoy.'
        }
      />
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="size-5"/>
                    Progreso Diario
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={dailyProgress} className="mb-2 h-4"/>
                <p className="text-sm text-muted-foreground">{completedDaily} de {dailyHabits.length} completados.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="size-5"/>
                    Progreso Semanal
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={weeklyProgress} className="mb-2 h-4"/>
                <p className="text-sm text-muted-foreground">{completedWeekly} de {weeklyHabits.length} completados.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="size-5 text-accent"/>
                    Racha Actual
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{longestCurrentStreak} días</p>
                <p className="text-sm text-muted-foreground">Tu mejor racha activa.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="size-5 text-yellow-500"/>
                    Racha Récord
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{longestStreak} días</p>
                 <p className="text-sm text-muted-foreground">Tu récord histórico.</p>
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListTodo className="size-5"/>
                    Tareas Pendientes de la Semana
                </CardTitle>
                 <CardDescription>Tus tareas pendientes para los próximos días.</CardDescription>
            </CardHeader>
            <CardContent>
                {tasksLoading && <p>Cargando tareas...</p>}
                {pendingTasks && pendingTasks.length > 0 ? (
                    <ul className="space-y-4">
                        {pendingTasks.slice(0, 5).map(task => (
                             <li key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                <div>
                                    <p className="font-medium">{task.name}</p>
                                    <p className="text-sm text-muted-foreground">Vence: {task.dueDate ? new Date(task.dueDate.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="mt-2 sm:mt-0">{task.priority || 'normal'}</Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !tasksLoading && <p className="text-sm text-muted-foreground">No tienes tareas pendientes para esta semana.</p>
                )}
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Smile className="size-5"/>
                    Ánimo de Hoy
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center">
                 {moodsLoading && <p>Cargando ánimo...</p>}
                 {todayMood ? (
                    <>
                        <p className="text-6xl">{todayMood.emoji}</p>
                        <p className="text-xl font-semibold mt-2">{todayMood.moodLabel}</p>
                    </>
                 ) : (
                    !moodsLoading && (
                        <>
                            <p className="text-6xl">⚪</p>
                            <p className="text-muted-foreground mt-2">Sin registrar</p>
                        </>
                    )
                 )}
                 <Button variant="link" asChild className="mt-4">
                    <Link href="/mood-tracker">Ver detalles y tendencias</Link>
                 </Button>
            </CardContent>
        </Card>
      </div>
       <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <SquareCheck className="size-5"/>
                    Progreso de Tareas Semanales
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={weeklyTasksProgress} className="mb-2 h-4"/>
                <p className="text-sm text-muted-foreground">{completedWeeklyTasks} de {totalWeeklyTasks} tareas completadas esta semana.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
    return (
        <HabitsProvider>
            <TasksProvider>
                <MoodsProvider>
                    <DashboardContent />
                </MoodsProvider>
            </TasksProvider>
        </HabitsProvider>
    )
}
