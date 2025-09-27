'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Smile,
  Target,
  TrendingUp,
  CalendarDays,
  Calendar,
  CalendarClock,
  CalendarCheck,
  Trophy,
  Heart,
  Wind,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import PageHeader from '@/components/page-header';
import { useState, useEffect, useMemo } from 'react';
import {
  useCollection,
  useFirebase,
} from '@/firebase';
import {
  collection,
  query,
  where,
  limit,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { moods as moodOptions } from '@/lib/moods';
import type { ChartConfig } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';

const goalProgressData = [
  { month: 'Enero', progress: 65 },
  { month: 'Febrero', progress: 70 },
  { month: 'Marzo', progress: 75 },
  { month: 'Abril', progress: 80 },
  { month: 'Mayo', progress: 85 },
  { month: 'Junio', progress: 90 },
];

const chartConfig = {
  progress: {
    label: 'Progreso',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const isSameDay = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

const isSameWeek = (d1: Date, d2: Date) => {
  const startOfWeek1 = getStartOfWeek(d1);
  const startOfWeek2 = getStartOfWeek(d2);
  return isSameDay(startOfWeek1, startOfWeek2);
};

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const { firestore, user } = useFirebase();

  const habitsQuery = useMemo(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'habits'))
        : null,
    [firestore, user]
  );
  const { data: allHabits, isLoading: habitsLoading } =
    useCollection(habitsQuery);

  const tasksQuery = useMemo(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'tasks')
          )
        : null,
    [firestore, user]
  );
  const { data: allTasks, isLoading: tasksLoading } = useCollection(tasksQuery);

  const goalsQuery = useMemo(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'goals'))
        : null,
    [firestore, user]
  );
  const { data: allGoals, isLoading: goalsLoading } = useCollection(goalsQuery);
  
  const today = useMemo(() => new Date(), []);
  
  const startOfWeek = useMemo(() => getStartOfWeek(today), [today]);

  const moodsQuery = useMemo(() => {
    if (!user) return null;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    return query(
      collection(firestore, 'users', user.uid, 'moods'),
      where('date', '>=', startOfMonth.toISOString()),
      where('date', '<=', endOfMonth.toISOString())
    );
  }, [firestore, user]);

  const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);
  
  const feelingStats = useMemo(() => {
    if (!moods) return [];
    const counts = moods.flatMap(m => m.feelings).reduce((acc, feeling) => {
        acc[feeling] = (acc[feeling] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
  }, [moods]);

  const influenceStats = useMemo(() => {
      if (!moods) return [];
      const counts = moods.flatMap(m => m.influences).reduce((acc, influence) => {
          acc[influence] = (acc[influence] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
  }, [moods]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
    }
    return days;
  }, [startOfWeek]);
  
  const getMoodForDay = (day: Date) => {
    return moods?.find(mood => isSameDay(new Date(mood.date), day));
  };
  
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const completedTasks = allTasks?.filter(t => t.isCompleted).length ?? 0;
  const totalTasks = allTasks?.length ?? 0;
  const pendingTasks = totalTasks - completedTasks;

  const completedGoals = allGoals?.filter(g => g.isCompleted).length ?? 0;
  const totalGoals = allGoals?.length ?? 0;

  const dailyHabits = allHabits?.filter(h => h.frequency === 'Diario') ?? [];
  const weeklyHabits = allHabits?.filter(h => h.frequency === 'Semanal') ?? [];

  const completedDailyHabits = dailyHabits.filter(h => h.lastCompletedAt && isSameDay((h.lastCompletedAt as Timestamp).toDate(), today)).length;
  const completedWeeklyHabits = weeklyHabits.filter(h => h.lastCompletedAt && isSameWeek((h.lastCompletedAt as Timestamp).toDate(), today)).length;
  
  const topHabitsByStreak = useMemo(() => {
    if (!allHabits) return [];
    return [...allHabits]
      .filter(h => h.longestStreak && h.longestStreak > 0)
      .sort((a, b) => (b.longestStreak || 0) - (a.longestStreak || 0))
      .slice(0, 3);
  }, [allHabits]);

  const todayString = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={
          isClient
            ? `Tu centro de mando para el éxito. Hoy es ${todayString}.`
            : 'Tu centro de mando para el éxito.'
        }
      />
      
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hábitos Diarios</CardTitle>
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{completedDailyHabits} de {dailyHabits.length}</div>
                <p className="text-xs text-muted-foreground">Completados hoy</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hábitos Semanales</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{completedWeeklyHabits} de {weeklyHabits.length}</div>
                <p className="text-xs text-muted-foreground">Completados esta semana</p>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tareas</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTasks} de {totalTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingTasks} tareas pendientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Metas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedGoals} de {totalGoals}
            </div>
            <p className="text-xs text-muted-foreground">
              Metas completadas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-yellow-500" />
              <span>Top Rachas</span>
            </CardTitle>
            <CardDescription>Tus récords de consistencia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {habitsLoading && <p>Cargando rachas...</p>}
             {topHabitsByStreak.length > 0 ? (
                topHabitsByStreak.map(habit => (
                  <div key={habit.id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <span className="text-2xl">{habit.icon}</span>
                       <div>
                         <p className="font-medium">{habit.name}</p>
                         <p className="text-sm text-muted-foreground">{habit.category}</p>
                       </div>
                     </div>
                     <Badge variant="secondary" className="text-lg">
                       <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                       {habit.longestStreak || 0}
                     </Badge>
                  </div>
                ))
             ) : (
                !habitsLoading && <p className="text-sm text-muted-foreground">Aún no tienes rachas récord.</p>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              <span>Progreso de Metas</span>
            </CardTitle>
            <CardDescription>Progreso mensual de tus metas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig}
              className="min-h-[200px] w-full"
            >
              <BarChart accessibilityLayer data={goalProgressData}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="progress"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              <span>Historial de Ánimo</span>
            </CardTitle>
            <CardDescription>Tu registro emocional de la semana.</CardDescription>
          </CardHeader>
          <CardContent>
             {moodsLoading && <p>Cargando historial de ánimo...</p>}
             <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const moodEntry = getMoodForDay(day);
                  const isFuture = day > today && !isSameDay(day, today);
                  return (
                    <div
                      key={day.toISOString()}
                      className="flex aspect-square flex-col items-center justify-center rounded-lg border bg-card p-2 text-center"
                    >
                      <span className="text-sm text-muted-foreground">{dayLabels[index]}</span>
                      <span className="text-2xl mt-1">
                        {moodEntry
                          ? moodEntry.emoji
                          : !isFuture ? '⚪' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Heart className="size-5 text-red-500"/>
                        Sentimientos Frecuentes del Mes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {moodsLoading && <p>Cargando...</p>}
                    {feelingStats.length > 0 ? (
                         <ul className="space-y-2">
                            {feelingStats.map(([feeling, count]) => (
                                <li key={feeling} className="flex justify-between items-center text-sm">
                                    <span>{feeling}</span>
                                    <Badge variant="secondary">{count} {count > 1 ? 'veces' : 'vez'}</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        !moodsLoading && <p className="text-sm text-muted-foreground">No hay suficientes datos este mes.</p>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Wind className="size-5 text-blue-500"/>
                        Influencias Comunes del Mes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {moodsLoading && <p>Cargando...</p>}
                    {influenceStats.length > 0 ? (
                        <ul className="space-y-2">
                            {influenceStats.map(([influence, count]) => (
                                <li key={influence} className="flex justify-between items-center text-sm">
                                    <span>{influence}</span>
                                    <Badge variant="secondary">{count} {count > 1 ? 'veces' : 'vez'}</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        !moodsLoading && <p className="text-sm text-muted-foreground">No hay suficientes datos este mes.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
