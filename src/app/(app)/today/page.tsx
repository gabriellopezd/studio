'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Smile,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

import PageHeader from '@/components/page-header';
import { useState, useEffect, useMemo } from 'react';
import {
  useCollection,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { moods as moodOptions } from '@/lib/moods';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const isSameWeek = (d1: Date, d2: Date) => {
  const startOfWeek1 = getStartOfWeek(d1);
  const startOfWeek2 = getStartOfWeek(d2);
  return isSameDay(startOfWeek1, startOfWeek2);
};

const isSameMonth = (d1: Date, d2: Date) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
};

const isPreviousDay = (d1: Date, d2: Date) => {
  const yesterday = new Date(d1);
  yesterday.setDate(d1.getDate() - 1);
  return isSameDay(d2, yesterday);
};

const isPreviousWeek = (d1: Date, d2: Date) => {
  const lastWeek = new Date(d1);
  lastWeek.setDate(d1.getDate() - 7);
  return isSameWeek(d2, lastWeek);
};

const isPreviousMonth = (d1: Date, d2: Date) => {
  const lastMonth = new Date(d1);
  lastMonth.setMonth(d1.getMonth() - 1);
  // Handle year change
  if (
    d1.getMonth() === 0 &&
    d2.getMonth() === 11 &&
    d2.getFullYear() === d1.getFullYear() - 1
  ) {
    return true;
  }
  return (
    d2.getFullYear() === lastMonth.getFullYear() &&
    d2.getMonth() === lastMonth.getMonth()
  );
};

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual"];

export default function TodayPage() {
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
    
  const groupedHabits = useMemo(() => {
    if (!dailyHabits) return {};
    return dailyHabits.reduce((acc, habit) => {
      const category = habit.category || 'Sin Categoría';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(habit);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [dailyHabits]);

  const tasksQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'tasks'),
            where('isCompleted', '==', false),
            limit(3)
          )
        : null,
    [firestore, user]
  );
  const { data: urgentTasks, isLoading: tasksLoading } =
    useCollection(tasksQuery);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const today = new Date();
  const completedHabits =
    dailyHabits?.filter((h) => {
      if (!h.lastCompletedAt) return false;
      const lastCompletedDate = (h.lastCompletedAt as Timestamp).toDate();
      switch (h.frequency) {
        case 'Semanal':
          return isSameWeek(lastCompletedDate, today);
        case 'Mensual':
          return isSameMonth(lastCompletedDate, today);
        case 'Diario':
        default:
          return isSameDay(lastCompletedDate, today);
      }
    }).length ?? 0;
  const totalHabits = dailyHabits?.length ?? 0;
  const habitsProgress =
    totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

  const handleToggleHabit = (habitId: string) => {
    if (!user || !dailyHabits) return;

    const habit = dailyHabits.find((h) => h.id === habitId);
    if (!habit) return;

    const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);
    const today = new Date();

    const lastCompletedDate = habit.lastCompletedAt
      ? (habit.lastCompletedAt as Timestamp).toDate()
      : null;

    let isCompletedInCurrentPeriod = false;
    if (lastCompletedDate) {
      switch (habit.frequency) {
        case 'Semanal':
          isCompletedInCurrentPeriod = isSameWeek(lastCompletedDate, today);
          break;
        case 'Mensual':
          isCompletedInCurrentPeriod = isSameMonth(lastCompletedDate, today);
          break;
        case 'Diario':
        default:
          isCompletedInCurrentPeriod = isSameDay(lastCompletedDate, today);
          break;
      }
    }

    if (isCompletedInCurrentPeriod) {
      // Reverting completion. Restore the previous state.
      updateDocumentNonBlocking(habitRef, {
        lastCompletedAt: habit.previousLastCompletedAt ?? null,
        currentStreak: habit.previousStreak ?? 0,
        previousStreak: null,
        previousLastCompletedAt: null,
      });
    } else {
      // Completing the habit.
      const currentStreak = habit.currentStreak || 0;
      let newStreak = 1;

      if (lastCompletedDate) {
        let isConsecutive = false;
        switch (habit.frequency) {
          case 'Semanal':
            isConsecutive = isPreviousWeek(today, lastCompletedDate);
            break;
          case 'Mensual':
            isConsecutive = isPreviousMonth(today, lastCompletedDate);
            break;
          case 'Diario':
          default:
            isConsecutive = isPreviousDay(today, lastCompletedDate);
            break;
        }
        if (isConsecutive) {
          newStreak = currentStreak + 1;
        }
      }

      // Save the current state before updating, so we can revert if needed.
      updateDocumentNonBlocking(habitRef, {
        lastCompletedAt: Timestamp.fromDate(today),
        currentStreak: newStreak,
        previousStreak: currentStreak,
        previousLastCompletedAt: habit.lastCompletedAt,
      });
    }
  };

  const todayString = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title="MI DÍA"
        description={
          isClient
            ? `Resumen de tu actividad para hoy, ${todayString}.`
            : 'Resumen de tu actividad para hoy.'
        }
      />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              <span>Hábitos de Hoy</span>
            </CardTitle>
            <CardDescription>
              Has completado {completedHabits} de {totalHabits} hábitos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress
              value={habitsProgress}
              aria-label={`${habitsProgress}% de hábitos completados`}
            />
            <div className="space-y-6">
              {habitsLoading && <p>Cargando hábitos...</p>}
              {Object.keys(groupedHabits).length > 0 ? (
                habitCategories.map(category => (
                    groupedHabits[category] && groupedHabits[category].length > 0 && (
                      <div key={category}>
                         <h3 className="text-lg font-semibold tracking-tight font-headline mb-2">{category}</h3>
                         <div className="space-y-2">
                          {groupedHabits[category].map((habit) => {
                            const lastCompletedDate = habit.lastCompletedAt
                              ? (habit.lastCompletedAt as Timestamp).toDate()
                              : null;
        
                            let isCompleted = false;
                            if (lastCompletedDate) {
                              switch (habit.frequency) {
                                case 'Semanal':
                                  isCompleted = isSameWeek(
                                    lastCompletedDate,
                                    new Date()
                                  );
                                  break;
                                case 'Mensual':
                                  isCompleted = isSameMonth(
                                    lastCompletedDate,
                                    new Date()
                                  );
                                  break;
                                case 'Diario':
                                default:
                                  isCompleted = isSameDay(
                                    lastCompletedDate,
                                    new Date()
                                  );
                                  break;
                              }
                            }
        
                            return (
                              <div
                                key={habit.id}
                                className="flex items-center justify-between rounded-md bg-muted/50 p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{habit.icon}</span>
                                  <div>
                                    <p className="font-medium">{habit.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Racha: {habit.currentStreak}{' '}
                                      {habit.frequency === 'Diario'
                                        ? 'días'
                                        : habit.frequency === 'Semanal'
                                        ? 'semanas'
                                        : 'meses'}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant={isCompleted ? 'secondary' : 'outline'}
                                  size="sm"
                                  onClick={() => handleToggleHabit(habit.id)}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {isCompleted ? 'Completado' : 'Marcar'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                ))
              ) : (
                !habitsLoading && <p>No tienes hábitos configurados para hoy.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="size-5" />
                <span>Tareas Pendientes</span>
              </CardTitle>
              <CardDescription>Tus tareas más urgentes.</CardDescription>
            </CardHeader>
            <CardContent>
              {tasksLoading && <p>Cargando tareas...</p>}
              <ul className="space-y-3">
                {urgentTasks?.map((task) => (
                  <li key={task.id} className="flex items-start gap-3">
                    <div className="mt-1 h-4 w-4 rounded-full border border-primary" />
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Vence:{' '}
                        {task.dueDate?.toDate
                          ? task.dueDate.toDate().toLocaleDateString()
                          : 'Sin fecha'}
                      </p>
                    </div>
                  </li>
                ))}
                {urgentTasks?.length === 0 && !tasksLoading && <p>No tienes tareas urgentes.</p>}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="size-5" />
                <span>¿Cómo te sientes?</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around">
              {moodOptions.map((mood) => (
                <Button
                  key={mood.level}
                  variant="ghost"
                  size="icon"
                  className="h-14 w-14 rounded-full"
                >
                  <span className="text-3xl">{mood.emoji}</span>
                  <span className="sr-only">{mood.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
