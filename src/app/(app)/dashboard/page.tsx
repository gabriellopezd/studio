
'use client';

import {
  Smile,
  CalendarDays,
  CreditCard,
  ListTodo,
  TrendingUp,
  Flame,
  Trophy,
  AlertTriangle,
  CalendarClock,
  Activity,
  CheckCircle2,
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
import { useHabits } from '@/app/_providers/HabitsProvider';
import { useTasks } from '@/app/_providers/TasksProvider';
import { useMood } from '@/app/_providers/MoodProvider';
import { useFinances } from '@/app/_providers/FinancesProvider';
import { formatCurrency, cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

const motivationalQuotes = [
    "El progreso de hoy es el éxito de mañana.",
    "Cada pequeño paso te acerca a un gran resultado.",
    "Tu vista general hacia una vida mejor.",
    "La consistencia es la clave del progreso.",
    "Visualiza tu éxito y hazlo realidad."
];

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'secondary';
  }
}

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const [motivation, setMotivation] = useState('');
  
  const { 
    dailyHabits,
    weeklyHabits,
    completedDaily,
    completedWeekly,
    longestCurrentStreak,
    longestStreak,
    topCurrentStreakHabits,
    topLongestStreakHabits,
    habitsLoading,
  } = useHabits();

  const {
    todayTasks,
    overdueTasks,
    dailyTasksProgress,
    completedDailyTasks,
    totalDailyTasks,
    weeklyTasksProgress,
    completedWeeklyTasks,
    totalWeeklyTasks,
    tasksLoading,
  } = useTasks();

  const {
    todayMood, 
    moodsLoading
  } = useMood();

  const {
    upcomingPayments,
    financesLoading
  } = useFinances();

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="size-5 text-orange-500"/>
                    Racha Actual
                </CardTitle>
                <CardDescription>Tu mejor racha activa.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{longestCurrentStreak} días</p>
                <div className="mt-2 flex flex-wrap gap-1">
                    {topCurrentStreakHabits.map(habit => <Badge key={habit} variant="secondary">{habit}</Badge>)}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="size-5 text-yellow-500"/>
                    Racha Récord
                </CardTitle>
                <CardDescription>Tu récord histórico.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{longestStreak} días</p>
                <div className="mt-2 flex flex-wrap gap-1">
                    {topLongestStreakHabits.map(habit => <Badge key={habit} variant="secondary">{habit}</Badge>)}
                </div>
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="size-4"/>
                        Hábitos Diarios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={dailyHabits.length > 0 ? (completedDaily / dailyHabits.length) * 100 : 0} className="mb-2 h-2"/>
                    <p className="text-xs text-muted-foreground">{completedDaily} de {dailyHabits.length} completados.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle2 className="size-4"/>
                        Tareas del Día
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={dailyTasksProgress} className="mb-2 h-2"/>
                    <p className="text-xs text-muted-foreground">{completedDailyTasks} de {totalDailyTasks} completadas.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="size-4"/>
                        Progreso Semanal (Hábitos)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={weeklyHabits.length > 0 ? (completedWeekly / weeklyHabits.length) * 100 : 0} className="mb-2 h-2"/>
                    <p className="text-xs text-muted-foreground">{completedWeekly} de {weeklyHabits.length} completados.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="size-4"/>
                        Progreso Semanal (Tareas)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Progress value={weeklyTasksProgress} className="mb-2 h-2"/>
                    <p className="text-xs text-muted-foreground">{completedWeeklyTasks} de {totalWeeklyTasks} tareas completadas.</p>
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
                {overdueTasks.length === 0 && todayTasks.length === 0 && !tasksLoading && <p className="text-sm text-muted-foreground">No tienes tareas urgentes.</p>}
                
                <div className="space-y-4">
                  {overdueTasks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive"><AlertTriangle className="size-4"/>Vencidas</h3>
                       <ul className="space-y-2">
                          {overdueTasks.map(task => (
                              <li key={task.id} className="flex items-center justify-between text-sm">
                                  <div>
                                      <p className="font-medium">{task.name}</p>
                                      <p className="text-xs text-muted-foreground">{task.category}</p>
                                  </div>
                                  <Badge variant={getPriorityBadge(task.priority)}>{task.priority}</Badge>
                              </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {todayTasks.length > 0 && (
                     <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><CalendarClock className="size-4"/>Para Hoy</h3>
                       <ul className="space-y-2">
                          {todayTasks.map(task => (
                             <li key={task.id} className="flex items-center justify-between text-sm">
                                  <div>
                                      <p className="font-medium">{task.name}</p>
                                      <p className="text-xs text-muted-foreground">{task.category}</p>
                                  </div>
                                  <Badge variant={getPriorityBadge(task.priority)}>{task.priority}</Badge>
                              </li>
                          ))}
                      </ul>
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
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        {moodsLoading && <p>Cargando ánimo...</p>}
                        {todayMood ? (
                            <>
                                <p className="text-5xl">{todayMood.emoji}</p>
                                <p className="text-lg font-semibold mt-2">{todayMood.moodLabel}</p>
                                <div className="mt-2 flex flex-wrap justify-center gap-1">
                                    {todayMood.feelings?.map((f: string) => <Badge key={f} variant="secondary">{f}</Badge>)}
                                    {todayMood.influences?.map((i: string) => <Badge key={i} variant="secondary">{i}</Badge>)}
                                </div>
                            </>
                        ) : (
                            !moodsLoading && (
                                <>
                                    <p className="text-5xl">⚪</p>
                                    <p className="text-muted-foreground mt-2">Sin registrar</p>
                                </>
                            )
                        )}
                        <Button variant="link" asChild className="mt-4 text-xs">
                            <Link href="/mood-tracker">Ver detalles y tendencias</Link>
                        </Button>
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
                       {financesLoading && <p>Cargando pagos...</p>}
                        {!financesLoading && upcomingPayments.length === 0 ? (
                           <p className="text-sm text-center text-muted-foreground pt-4">No tienes pagos programados para los próximos 7 días.</p>
                       ) : (
                           <ul className="space-y-3">
                               {upcomingPayments.map(p => (
                                   <li key={p.id} className="flex justify-between items-center text-sm">
                                       <div>
                                           <p className="font-medium">{p.name}</p>
                                           <p className="text-xs text-muted-foreground">Vence: {format(new Date(new Date().getFullYear(), new Date().getMonth(), p.dayOfMonth), 'd MMM', { locale: es })}</p>
                                       </div>
                                       <div className="font-semibold">{formatCurrency(p.amount)}</div>
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
