'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Smile,
  Flame,
  Trophy,
  Timer,
  Check,
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
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  useFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  query,
  where,
  limit,
  Timestamp,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { TodaysMoodCard } from './_components/TodaysMoodCard';
import { calculateStreak, isHabitCompletedToday } from '@/lib/habits';

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

const today = new Date();

export default function TodayPage() {
  const [isClient, setIsClient] = useState(false);
  const { firestore, user } = useFirebase();

  const [timerHabit, setTimerHabit] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimerDialogOpen, setTimerDialogOpen] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setElapsedSeconds(seconds => seconds + 1);
      }, 1000);
    } else if (!isTimerActive && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive]);

  const habitsQuery = useMemo(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'habits'))
        : null,
    [firestore, user]
  );
  const { data: allHabits, isLoading: habitsLoading } =
    useCollection(habitsQuery);

    
  const habitsForToday = useMemo(() => {
    if (!allHabits) return [];
    return allHabits.filter(habit => {
      return !isHabitCompletedToday(habit);
    });
  }, [allHabits]);
    
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

  const tasksQuery = useMemo(
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

  const completedHabits = allHabits?.filter((h) => isHabitCompletedToday(h)).length ?? 0;

  const totalHabits = allHabits?.length ?? 0;
  const habitsProgress =
    totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

  const handleToggleHabit = (habitId: string) => {
    if (!user || !allHabits) return;

    const habit = allHabits.find((h) => h.id === habitId);
    if (!habit) return;

    const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);

    const isCompleted = isHabitCompletedToday(habit);

    if (isCompleted) {
      // Reverting completion.
      updateDocumentNonBlocking(habitRef, {
        lastCompletedAt: habit.previousLastCompletedAt ?? null,
        currentStreak: habit.previousStreak ?? 0,
        previousStreak: null,
        previousLastCompletedAt: null,
      });
    } else {
      // Completing the habit.
      const streakData = calculateStreak(habit);
      
      updateDocumentNonBlocking(habitRef, {
        lastCompletedAt: Timestamp.fromDate(today),
        ...streakData,
        previousStreak: habit.currentStreak || 0,
        previousLastCompletedAt: habit.lastCompletedAt ?? null,
      });
    }
  };

  const handleStartTimer = (habit: any) => {
    setTimerHabit(habit);
    setElapsedSeconds(0);
    setTimerStartTime(Date.now());
    setIsTimerActive(true);
    setTimerDialogOpen(true);
  };
  
  const handleStopAndComplete = () => {
    if (timerHabit && user && timerStartTime) {
      handleToggleHabit(timerHabit.id);

      const timeLogsColRef = collection(firestore, 'users', user.uid, 'timeLogs');
      addDocumentNonBlocking(timeLogsColRef, {
        referenceId: timerHabit.id,
        referenceType: 'habit',
        startTime: Timestamp.fromMillis(timerStartTime),
        endTime: Timestamp.now(),
        durationSeconds: elapsedSeconds,
        createdAt: serverTimestamp(),
        userId: user.uid,
      });
    }
    setIsTimerActive(false);
    setTimerDialogOpen(false);
    setTimerHabit(null);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

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
        description={
          isClient
            ? `Resumen de tu actividad para hoy, ${todayString}.`
            : 'Resumen de tu actividad para hoy.'
        }
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Activity className="size-5" />
                <span>Tus Hábitos Pendientes</span>
                </CardTitle>
                <CardDescription>
                Progreso general de hoy: {completedHabits} de {totalHabits} hábitos completados.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Progress
                value={habitsProgress}
                aria-label={`${habitsProgress}% de hábitos completados`}
                />
                <div className="space-y-6">
                {habitsLoading && <p>Cargando hábitos...</p>}
                {habitsForToday.length > 0 ? (
                    habitCategories.map(category => (
                        groupedHabits[category] && groupedHabits[category].length > 0 && (
                        <div key={category}>
                            <h3 className="text-lg font-semibold tracking-tight mb-2">{category}</h3>
                            <div className="space-y-2">
                            {groupedHabits[category].map((habit) => {
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
                                            <Flame className="h-4 w-4 text-accent"/> 
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
                                            onClick={() => handleStartTimer(habit)}
                                            className="h-9 w-9"
                                        >
                                            <Timer className="h-4 w-4" />
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
                </div>
            </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
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
                    <div className="mt-1 h-4 w-4 rounded-full border border-primary bg-primary" />
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

          <TodaysMoodCard />
        </div>
      </div>
    </div>
    <Dialog open={isTimerDialogOpen} onOpenChange={setTimerDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Timer /> {timerHabit?.name}
                </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="text-8xl font-bold font-mono text-center">
                    {formatTime(elapsedSeconds)}
                </div>
                <Label>Tiempo Transcurrido</Label>
            </div>
            <DialogFooter className="justify-center gap-2 sm:gap-0">
                <Button onClick={() => setIsTimerActive(!isTimerActive)} variant="outline">
                    {isTimerActive ? 'Pausar' : 'Iniciar'}
                </Button>
                <Button onClick={handleStopAndComplete}>
                    <Check className="mr-2 h-4 w-4" />
                    Detener y Completar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
