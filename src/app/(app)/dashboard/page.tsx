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

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
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

const isSameMonth = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual"];

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
  const { data: allHabits, isLoading: habitsLoading } =
    useCollection(habitsQuery);

  const tasksQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'tasks')
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
  
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const moodsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return query(
      collection(firestore, 'users', user.uid, 'moods'),
      where('date', '>=', start.toISOString()),
      where('date', '<=', end.toISOString())
    );
  }, [firestore, user, currentMonth]);

  const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const getMoodForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const moodEntry = moods?.find(
      (mood) =>
        new Date(mood.date).toDateString() === date.toDateString()
    );
    return moodEntry;
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      return newMonth;
    });
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const completedTasks = allTasks?.filter(t => t.isCompleted).length ?? 0;
  const totalTasks = allTasks?.length ?? 0;
  const pendingTasks = totalTasks - completedTasks;

  const completedGoals = allGoals?.filter(g => g.isCompleted).length ?? 0;
  const totalGoals = allGoals?.length ?? 0;
  
  const today = new Date();

  const dailyHabits = allHabits?.filter(h => h.frequency === 'Diario') ?? [];
  const weeklyHabits = allHabits?.filter(h => h.frequency === 'Semanal') ?? [];
  const monthlyHabits = allHabits?.filter(h => h.frequency === 'Mensual') ?? [];

  const completedDailyHabits = dailyHabits.filter(h => h.lastCompletedAt && isSameDay((h.lastCompletedAt as Timestamp).toDate(), today)).length;
  const completedWeeklyHabits = weeklyHabits.filter(h => h.lastCompletedAt && isSameWeek((h.lastCompletedAt as Timestamp).toDate(), today)).length;
  const completedMonthlyHabits = monthlyHabits.filter(h => h.lastCompletedAt && isSameMonth((h.lastCompletedAt as Timestamp).toDate(), today)).length;

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
                <CardTitle className="text-sm font-medium">Hábitos Mensuales</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{completedMonthlyHabits} de {monthlyHabits.length}</div>
                <p className="text-xs text-muted-foreground">Completados este mes</p>
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
             <div className="flex justify-between items-center mb-4">
              <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>Anterior</Button>
              <div className="text-center font-bold text-lg">
                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
              <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>Siguiente</Button>
            </div>
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
                          : day < new Date().getDate() && currentMonth.getMonth() === new Date().getMonth()
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
