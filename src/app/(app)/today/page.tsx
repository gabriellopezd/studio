
'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Trophy,
  Timer,
  Check,
  Play,
  Square,
  Flame,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { useState, useEffect, useMemo } from 'react';
import { isHabitCompletedToday } from '@/lib/habits';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/app/_providers/AppProvider';
import { TodaysMoodCard } from './_components/TodaysMoodCard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

interface Habit {
  id: string;
  name: string;
  icon: string;
  currentStreak: number;
  longestStreak: number;
  [key: string]: any;
}

const motivationalQuotes = [
    "El día es tuyo. ¡Haz que cuente!",
    "Enfócate en el hoy para construir el mañana.",
    "Un día a la vez. Eso es todo lo que se necesita.",
    "La mejor manera de predecir el futuro es crearlo. Empieza hoy.",
    "El presente es el único momento que realmente posees."
];

function TaskListItem({ task, onToggle, onStartSession, onStopSession, activeSession }: any) {
  const isSessionActive = activeSession?.id === task.id;
  return (
    <div className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
        <Checkbox
            id={`task-${task.id}`}
            checked={task.isCompleted}
            onCheckedChange={() => onToggle(task.id, task.isCompleted)}
        />
        <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer">
            <p className={cn("font-medium", task.isCompleted && 'text-muted-foreground line-through')}>{task.name}</p>
            <p className="text-sm text-muted-foreground">{task.category}</p>
        </label>
        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'secondary' : 'outline'} className="ml-auto">
            {task.priority || 'normal'}
        </Badge>
        {!task.isCompleted && (
            <Button 
                variant="outline" 
                size="icon" 
                onClick={() => isSessionActive ? onStopSession() : onStartSession(task.id, task.name, 'task')}
                disabled={!isSessionActive && !!activeSession}
                className={cn("h-9 w-9", isSessionActive && "bg-primary text-primary-foreground animate-pulse")}
            >
                {isSessionActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
        )}
    </div>
  );
}

export default function TodayPage() {
  const [isClient, setIsClient] = useState(false);
  const [motivation, setMotivation] = useState('');
  const { 
    allHabits, 
    habitsLoading, 
    overdueTasks,
    todayTasks,
    tasksForTomorrow,
    tasksLoading, 
    activeSession, 
    startSession, 
    stopSession,
    handleToggleTask,
    pendingRecurringExpenses,
    handlePayRecurringItem,
  } = useAppContext();

  useEffect(() => {
    setIsClient(true);
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const activeHabits = useMemo(() => allHabits?.filter(h => h.isActive) || [], [allHabits]);
    
  const habitsForToday = useMemo(() => {
    return activeHabits.filter(habit => {
      return !isHabitCompletedToday(habit);
    });
  }, [activeHabits]);
    
  const groupedHabits = useMemo(() => {
    if (!habitsForToday) return {};
    return habitsForToday.reduce((acc, habit) => {
      const category = habit.category || 'Sin Categoría';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(habit);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [habitsForToday]);


  const todayString = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi Día"
        description={isClient ? `Tu centro de comando para hoy, ${todayString}.` : 'Tu centro de comando para hoy.'}
        motivation={motivation}
        imageId="dashboard-header"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="size-5" />
                        <span>Hábitos Pendientes de Hoy</span>
                    </CardTitle>
                    <CardDescription>
                        Lo que te acerca a tus metas, un paso a la vez.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {habitsLoading && <p>Cargando hábitos...</p>}
                    {habitsForToday.length > 0 ? (
                        habitCategories.map(category => (
                            groupedHabits[category] && groupedHabits[category].length > 0 && (
                            <div key={category}>
                                <h3 className="text-lg font-semibold tracking-tight mb-2">{category}</h3>
                                <div className="space-y-2">
                                {groupedHabits[category].map((habit: Habit) => {
                                    const isSessionActive = activeSession?.id === habit.id;
                                    return (
                                    <div
                                        key={habit.id}
                                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                        <span className="text-2xl">{habit.icon}</span>
                                        <div>
                                            <p className="font-medium">{habit.name}</p>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Flame className="h-4 w-4 text-orange-500"/> 
                                                {habit.currentStreak || 0}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Trophy className="h-4 w-4 text-yellow-500"/>
                                                {habit.longestStreak || 0}
                                            </span>
                                            </div>
                                        </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => isSessionActive ? stopSession() : startSession(habit.id, habit.name, 'habit')}
                                                disabled={!isSessionActive && !!activeSession}
                                                className={cn("h-9 w-9", isSessionActive && "bg-primary text-primary-foreground animate-pulse")}
                                            >
                                                {isSessionActive ? <Square className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
                                            </Button>
                                        </div>
                                    </div>
                                    );
                                })}
                                </div>
                            </div>
                            )
                        ))
                    ) : (
                        !habitsLoading && 
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 text-center">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                            <h3 className="mt-4 text-lg font-semibold text-foreground">
                            ¡Todo listo por hoy!
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                            Has completado todos tus hábitos para el periodo actual. ¡Sigue así!
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListTodo className="size-5" />
                    <span>Foco en Tareas</span>
                </CardTitle>
                <CardDescription>Tus tareas más urgentes.</CardDescription>
                </CardHeader>
                <CardContent>
                    {tasksLoading && <p>Cargando tareas...</p>}
                    {!tasksLoading && todayTasks.length === 0 && tasksForTomorrow.length === 0 && overdueTasks.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No tienes tareas urgentes.</p>
                    )}
                    <div className="space-y-4">
                        {overdueTasks.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-destructive"><AlertTriangle className="size-4"/>Vencidas</h3>
                                <div className="space-y-1"><Separator className="-mt-1"/>{overdueTasks.map(task => <TaskListItem key={task.id} task={task} onToggle={handleToggleTask} onStartSession={startSession} onStopSession={stopSession} activeSession={activeSession}/>)}</div>
                            </div>
                        )}
                        {todayTasks.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><CalendarClock className="size-4"/>Para Hoy</h3>
                                <div className="space-y-1"><Separator className="-mt-1"/>{todayTasks.map(task => <TaskListItem key={task.id} task={task} onToggle={handleToggleTask} onStartSession={startSession} onStopSession={stopSession} activeSession={activeSession}/>)}</div>
                            </div>
                        )}
                        {tasksForTomorrow.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><CalendarDays className="size-4"/>Para Mañana</h3>
                            <div className="space-y-1"><Separator className="-mt-1"/>{tasksForTomorrow.map(task => <TaskListItem key={task.id} task={task} onToggle={handleToggleTask} onStartSession={startSession} onStopSession={stopSession} activeSession={activeSession}/>)}</div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
           <TodaysMoodCard />
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="size-5"/>
                        Pagos Recurrentes Pendientes
                    </CardTitle>
                    <CardDescription>Gastos fijos de este mes que aún no has registrado.</CardDescription>
                </CardHeader>
                <CardContent>
                    {tasksLoading && <p>Cargando pagos...</p>}
                    {!tasksLoading && pendingRecurringExpenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No tienes pagos fijos pendientes este mes.</p>
                    ) : (
                        <ul className="space-y-3">
                        {pendingRecurringExpenses.map(payment => (
                            <li key={payment.id} className="flex justify-between items-center rounded-lg border p-3">
                                <div>
                                    <p className="font-medium">{payment.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(payment.amount)}</p>
                                </div>
                                <Button size="sm" onClick={() => handlePayRecurringItem(payment, 'expense')}><CheckCircle className="mr-2 h-4 w-4"/>Pagar</Button>
                            </li>
                        ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
    </>
  );
}
