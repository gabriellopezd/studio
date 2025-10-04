
'use client';

import {
  Smile,
  CalendarDays,
  CreditCard,
  Trophy,
  Activity,
  ListTodo,
  CheckCircle2,
  SquareCheck,
  Flame,
  AlertTriangle,
  CalendarCheck2,
  CalendarClock,
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
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useHabits } from '@/app/_providers/HabitsProvider';
import { useTasks } from '@/app/_providers/TasksProvider';
import { useFinances } from '@/app/_providers/FinancesProvider';
import { useMood } from '@/app/_providers/MoodProvider';

const motivationalQuotes = [
    "El progreso de hoy es el éxito de mañana.",
    "Cada pequeño paso te acerca a un gran resultado.",
    "Tu vista general hacia una vida mejor.",
    "La consistencia es la clave del progreso.",
    "Visualiza tu éxito y hazlo realidad."
];

function getPriorityBadgeClass(priority: string) {
    switch (priority) {
        case 'high': return 'bg-red-200 text-red-800 hover:bg-red-200/80';
        case 'medium': return 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200/80';
        case 'low': return 'bg-green-200 text-green-800 hover:bg-green-200/80';
        default: return 'bg-gray-200 text-gray-800';
    }
}

function TaskListItem({ task }: { task: any }) {
    return (
        <li className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2">
            <div>
                <p className="font-medium">{task.name}</p>
                <p className="text-sm text-muted-foreground">{task.category}</p>
            </div>
            <Badge className={cn(getPriorityBadgeClass(task.priority), "mt-2 sm:mt-0")}>{task.priority || 'normal'}</Badge>
        </li>
    );
}

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [motivation, setMotivation] = useState('');
  
  const { 
    dailyHabits,
    weeklyHabits,
    completedDaily,
    completedWeekly,
    longestStreak,
    topLongestStreakHabits,
    longestCurrentStreak,
    topCurrentStreakHabits,
    habitsLoading,
  } = useHabits();

  const {
    overdueTasks, 
    todayTasks,
    upcomingTasks,
    completedWeeklyTasks, 
    totalWeeklyTasks, 
    weeklyTasksProgress,
    completedDailyTasks,
    totalDailyTasks,
    dailyTasksProgress,
    tasksLoading,
  } = useTasks();

  const {
    todayMood, 
    moodsLoading,
  } = useMood();

  const {
    upcomingPayments,
    recurringExpensesLoading
  } = useFinances();


  const dailyProgress = dailyHabits.length > 0 ? (completedDaily / dailyHabits.length) * 100 : 0;
  const weeklyProgress = weeklyHabits.length > 0 ? (completedWeekly / weeklyHabits.length) * 100 : 0;

  useEffect(() => {
    setIsClient(true);
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
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
        motivation={motivation}
        imageId="dashboard-header"
      />
      
       <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Flame className="size-5 text-orange-500"/>
                        Racha Actual
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-3xl font-bold">{longestCurrentStreak} días</p>
                    <p className="text-sm text-muted-foreground truncate">Tu mejor racha activa.</p>
                    <div className="flex flex-wrap gap-1">
                        {topCurrentStreakHabits.length > 0 ? (
                            topCurrentStreakHabits.map(habit => <Badge key={habit} variant="secondary">{habit}</Badge>)
                        ) : (
                            <p className="text-xs text-muted-foreground">Completa un hábito por 2 días seguidos.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Trophy className="size-5 text-yellow-500"/>
                        Racha Récord
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-3xl font-bold">{longestStreak} días</p>
                    <p className="text-sm text-muted-foreground">Tu récord histórico.</p>
                    <div className="flex flex-wrap gap-1">
                         {topLongestStreakHabits.length > 0 ? (
                            topLongestStreakHabits.map(habit => <Badge key={habit} variant="secondary">{habit}</Badge>)
                        ) : (
                            <p className="text-xs text-muted-foreground">Aún no tienes un récord.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
       </div>
       
       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="size-5"/>
                    Hábitos Diarios
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={dailyProgress} className="mb-2 h-3"/>
                <p className="text-sm text-muted-foreground">{completedDaily} de {dailyHabits.length} completados.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <SquareCheck className="size-5"/>
                    Tareas Diarias
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={dailyTasksProgress} className="mb-2 h-3"/>
                <p className="text-sm text-muted-foreground">{completedDailyTasks} de {totalDailyTasks} completadas.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarCheck2 className="size-5"/>
                    Progreso Semanal (Hábitos)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={weeklyProgress} className="mb-2 h-3"/>
                <p className="text-sm text-muted-foreground">{completedWeekly} de {weeklyHabits.length} completados.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="size-5"/>
                    Progreso Semanal (Tareas)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={weeklyTasksProgress} className="mb-2 h-3"/>
                <p className="text-sm text-muted-foreground">{completedWeeklyTasks} de {totalWeeklyTasks} tareas completadas esta semana.</p>
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListTodo className="size-5"/>
                    Foco en Tareas
                </CardTitle>
                 <CardDescription>Tu plan de acción para los próximos días.</CardDescription>
            </CardHeader>
            <CardContent>
                {tasksLoading && <p>Cargando tareas...</p>}
                {!tasksLoading && overdueTasks.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No tienes tareas pendientes para esta semana.</p>
                )}
                <div className="space-y-4">
                    {overdueTasks.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2 text-destructive"><AlertTriangle className="size-4"/>Vencidas</h3>
                            <ul className="divide-y"><Separator className="-mt-1"/>{overdueTasks.map(task => <TaskListItem key={task.id} task={task} />)}</ul>
                        </div>
                    )}
                     {todayTasks.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><CalendarClock className="size-4"/>Para Hoy</h3>
                            <ul className="divide-y"><Separator className="-mt-1"/>{todayTasks.map(task => <TaskListItem key={task.id} task={task} />)}</ul>
                        </div>
                    )}
                     {upcomingTasks.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-sm flex items-center gap-2 mb-2"><CalendarDays className="size-4"/>Próximas en la Semana</h3>
                           <ul className="divide-y"><Separator className="-mt-1"/>{upcomingTasks.map(task => <TaskListItem key={task.id} task={task} />)}</ul>
                        </div>
                    )}
                </div>
            </CardContent>
          </Card>
           
           <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smile className="size-5"/>
                            Ánimo de Hoy
                        </CardTitle>
                         <CardDescription>Tu registro emocional del día.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {moodsLoading && <p>Cargando ánimo...</p>}
                         {todayMood ? (
                            <div className="flex flex-col items-center justify-center text-center">
                                <p className="text-6xl">{todayMood.emoji}</p>
                                <p className="text-xl font-semibold mt-2">{todayMood.moodLabel}</p>
                                <Separator className="my-4"/>
                                <div className="space-y-3 w-full">
                                    <div>
                                        <h4 className="font-medium text-sm text-left mb-2">Sentimientos:</h4>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {todayMood.feelings.map((f: string) => <Badge key={f} variant="secondary">{f}</Badge>)}
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-medium text-sm text-left mb-2">Influencias:</h4>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {todayMood.influences.map((i: string) => <Badge key={i} variant="secondary">{i}</Badge>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                         ) : (
                            !moodsLoading && (
                                <div className="text-center py-8">
                                    <p className="text-6xl">⚪</p>
                                    <p className="text-muted-foreground mt-2">Sin registrar</p>
                                    <Button variant="link" asChild className="mt-2">
                                        <Link href="/mood-tracker">Registra tu ánimo</Link>
                                    </Button>
                                </div>
                            )
                         )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="size-5"/>
                            Próximos Pagos
                        </CardTitle>
                         <CardDescription>Gastos recurrentes en los próximos 7 días.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recurringExpensesLoading && <p>Cargando pagos...</p>}
                        {!recurringExpensesLoading && upcomingPayments.length === 0 && (
                             <p className="text-sm text-muted-foreground text-center py-4">No tienes pagos programados para los próximos 7 días.</p>
                        )}
                         {upcomingPayments.length > 0 && (
                            <ul className="space-y-3">
                               {upcomingPayments.map(payment => (
                                <li key={payment.id} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{payment.name}</p>
                                        <p className="text-sm text-muted-foreground">Vence: {format(new Date().setDate(payment.dayOfMonth), 'PPP', { locale: es })}</p>
                                    </div>
                                    <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                                </li>
                               ))}
                            </ul>
                         )}
                    </CardContent>
                </Card>
           </div>
      </div>
    </div>
  );
}
