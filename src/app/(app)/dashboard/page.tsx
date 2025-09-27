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
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  orderBy,
} from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  
  const today = useMemo(() => new Date(), []);
  
  const habitsQuery = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'habits') : null),
    [firestore, user]
  );
  const { data: allHabits, isLoading: habitsLoading } = useCollection(habitsQuery);

  const tasksQuery = useMemo(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'tasks'),
            where('isCompleted', '==', false),
            orderBy('createdAt', 'desc'),
            limit(5)
          )
        : null,
    [firestore, user]
  );
  const { data: tasks, isLoading: tasksLoading } = useCollection(tasksQuery);

  const moodsQuery = useMemo(() => {
    if (!user) return null;
    const todayISO = today.toISOString().split('T')[0];
    return query(
      collection(firestore, 'users', user.uid, 'moods'),
      where('date', '>=', `${todayISO}T00:00:00.000Z`),
      where('date', '<=', `${todayISO}T23:59:59.999Z`),
      limit(1)
    );
  }, [firestore, user, today]);
  const { data: moods, isLoading: moodsLoading } = useCollection(moodsQuery);
  const todayMood = moods?.[0];

  const dailyHabits = useMemo(() => allHabits?.filter(h => h.frequency === 'Diario') || [], [allHabits]);
  const weeklyHabits = useMemo(() => allHabits?.filter(h => h.frequency === 'Semanal') || [], [allHabits]);
  
  const completedDaily = useMemo(() => dailyHabits.filter(h => h.lastCompletedAt && isSameDay(h.lastCompletedAt.toDate(), today)).length, [dailyHabits, today]);
  const completedWeekly = useMemo(() => weeklyHabits.filter(h => h.lastCompletedAt && isSameWeek(h.lastCompletedAt.toDate(), today)).length, [weeklyHabits, today]);

  const longestStreak = useMemo(() => allHabits?.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0) || 0, [allHabits]);
  const longestCurrentStreak = useMemo(() => allHabits?.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0) || 0, [allHabits]);
  
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
    <div className="flex flex-col gap-6">
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
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="size-5"/>
                    Progreso de Hábitos Diarios
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={dailyProgress} className="mb-2"/>
                <p className="text-sm text-muted-foreground">{completedDaily} de {dailyHabits.length} completados hoy.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="size-5"/>
                    Progreso de Hábitos Semanales
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={weeklyProgress} className="mb-2"/>
                <p className="text-sm text-muted-foreground">{completedWeekly} de {weeklyHabits.length} completados esta semana.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Flame className="size-5 text-orange-500"/>
                    Racha Actual
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{longestCurrentStreak} días</p>
                <p className="text-sm text-muted-foreground">Tu mejor racha activa.</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="size-5 text-yellow-500"/>
                    Racha Más Larga
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{longestStreak} días</p>
                 <p className="text-sm text-muted-foreground">Tu récord histórico.</p>
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <ListTodo className="size-5"/>
                    Tareas Pendientes
                </CardTitle>
                 <CardDescription>Tus tareas más próximas a vencer.</CardDescription>
            </CardHeader>
            <CardContent>
                {tasksLoading && <p>Cargando tareas...</p>}
                {tasks && tasks.length > 0 ? (
                    <ul className="space-y-3">
                        {tasks.map(task => (
                             <li key={task.id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{task.name}</p>
                                    <p className="text-sm text-muted-foreground">Vence: {task.dueDate ? new Date(task.dueDate.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>{task.priority || 'normal'}</Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !tasksLoading && <p className="text-sm text-muted-foreground">No tienes tareas pendientes.</p>
                )}
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Smile className="size-5"/>
                    Resumen Emocional de Hoy
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center">
                 {moodsLoading && <p>Cargando ánimo...</p>}
                 {todayMood ? (
                    <>
                        <p className="text-5xl">{todayMood.emoji}</p>
                        <p className="text-lg font-semibold mt-2">{todayMood.moodLabel}</p>
                    </>
                 ) : (
                    !moodsLoading && (
                        <>
                            <p className="text-5xl">⚪</p>
                            <p className="text-muted-foreground mt-2">Sin registrar</p>
                        </>
                    )
                 )}
                 <Button variant="link" asChild className="mt-2">
                    <Link href="/mood-tracker">Ver detalles y tendencias</Link>
                 </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    