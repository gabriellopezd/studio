'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Smile,
  Target,
  TrendingUp,
  CalendarDays,
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
  useMemoFirebase,
  useFirebase,
} from '@/firebase';
import {
  collection,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { moods as moodOptions } from '@/lib/moods';
import type { ChartConfig } from '@/components/ui/chart';

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

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const { firestore, user } = useFirebase();

  const habitsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'habits'))
        : null,
    [firestore, user]
  );
  const { data: dailyHabits, isLoading: habitsLoading } =
    useCollection(habitsQuery);

  const tasksQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'tasks'),
            where('isCompleted', '==', false)
          )
        : null,
    [firestore, user]
  );
  const { data: allTasks, isLoading: tasksLoading } = useCollection(tasksQuery);

  const goalsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'goals'))
        : null,
    [firestore, user]
  );
  const { data: allGoals, isLoading: goalsLoading } = useCollection(goalsQuery);
  
  const moodsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'moods') : null),
    [firestore, user]
  );
  const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);
  
  const getMoodForDay = (day: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const moodEntry = moods?.find(
      (mood) =>
        new Date(mood.date).toDateString() === date.toDateString()
    );
    return moodEntry;
  };


  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalHabits = dailyHabits?.length ?? 0;
  const completedTasks = allTasks?.filter(t => t.isCompleted).length ?? 0;
  const totalTasks = allTasks?.length ?? 0;
  const completedGoals = allGoals?.filter(g => g.isCompleted).length ?? 0;
  const totalGoals = allGoals?.length ?? 0;


  const todayString = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="DASHBOARD"
        description={
          isClient
            ? `Tu centro de mando para el éxito. Hoy es ${todayString}.`
            : 'Tu centro de mando para el éxito.'
        }
      />
      
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hábitos Totales</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalHabits}</div>
                <p className="text-xs text-muted-foreground">Actualmente en seguimiento</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tareas Completadas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{completedTasks} de {totalTasks}</div>
                <p className="text-xs text-muted-foreground">En total</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Metas Alcanzadas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{completedGoals} de {totalGoals}</div>
                <p className="text-xs text-muted-foreground">Historial completo</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Racha más larga</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{dailyHabits?.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0) ?? 0} días</div>
                <p className="text-xs text-muted-foreground">Mejor racha de hábitos</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-1">
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
              className="min-h-[250px] w-full"
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
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              <span>Historial de Ánimo</span>
            </CardTitle>
            <CardDescription>Tu registro emocional del mes.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-center font-bold text-lg mb-4">Junio 2024</div>
             {moodsLoading && <p>Cargando historial de ánimo...</p>}
             <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const moodEntry = getMoodForDay(day);
                  return (
                    <div
                      key={day}
                      className="flex aspect-square flex-col items-center justify-center rounded-lg border bg-card p-2 text-center"
                    >
                      <span className="text-sm text-muted-foreground">{day}</span>
                      <span className="text-2xl mt-1">
                        {moodEntry
                          ? moodEntry.emoji
                          : day < new Date().getDate()
                          ? '⚪'
                          : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
