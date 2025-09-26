'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Smile,
  Flame,
  Trophy,
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
import { moodLevels, feelings, influences } from '@/lib/moods';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
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

function TodaysMoodCard() {
  const { firestore, user } = useFirebase();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(1);

  const [selectedMood, setSelectedMood] = useState<{
    level: number;
    emoji: string;
    label: string;
  } | null>(null);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [selectedInfluences, setSelectedInfluences] = useState<string[]>([]);
  
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  const moodsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'moods'),
      where('date', '>=', `${todayISO}T00:00:00.000Z`),
      where('date', '<=', `${todayISO}T23:59:59.999Z`),
      limit(1)
    );
  }, [firestore, user, todayISO]);
  
  const { data: moods } = useCollection(moodsQuery);
  const todayEntry = moods?.[0];

  const resetForm = () => {
    setStep(1);
    setSelectedMood(null);
    setSelectedFeelings([]);
    setSelectedInfluences([]);
    setDialogOpen(false);
  };

  const handleStartMoodRegistration = () => {
    if (todayEntry) {
      const mood = moodLevels.find(m => m.level === todayEntry.moodLevel);
      setSelectedMood(mood || null);
      setSelectedFeelings(todayEntry.feelings || []);
      setSelectedInfluences(todayEntry.influences || []);
    } else {
      // Clear selections when starting a new entry
      setSelectedMood(null);
      setSelectedFeelings([]);
      setSelectedInfluences([]);
    }
    setStep(1);
    setDialogOpen(true);
  };

  const handleMoodSelect = (mood: {
    level: number;
    emoji: string;
    label: string;
  }) => {
    setSelectedMood(mood);
    setStep(2);
  };

  const handleToggleSelection = (
    item: string,
    selection: string[],
    setSelection: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelection((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSaveMood = async () => {
    if (!user || !selectedMood) return;

    const moodData = {
      moodLevel: selectedMood.level,
      moodLabel: selectedMood.label,
      emoji: selectedMood.emoji,
      feelings: selectedFeelings,
      influences: selectedInfluences,
      date: new Date().toISOString(),
      userId: user.uid,
    };
    
    if (todayEntry) {
        const existingDocRef = doc(firestore, 'users', user.uid, 'moods', todayEntry.id);
        await updateDocumentNonBlocking(existingDocRef, moodData);
    } else {
        const newDocRef = doc(collection(firestore, 'users', user.uid, 'moods'));
        await addDocumentNonBlocking(newDocRef, {
            ...moodData,
            id: newDocRef.id,
            createdAt: serverTimestamp(),
        });
    }
    
    resetForm();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="size-5" />
            <span>¿Cómo te sientes?</span>
          </CardTitle>
          <CardDescription>Registra tu estado de ánimo de hoy.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleStartMoodRegistration} className="w-full mb-4">
            {todayEntry ? (
              <>
                <span className="mr-2 text-lg">{todayEntry.emoji}</span>
                Actualizar mi día
              </>
            ) : (
              'Registrar mi día'
            )}
          </Button>
          {todayEntry && (
            <div className="space-y-4 text-sm">
                <div>
                    <h4 className="font-medium mb-2">Sentimientos:</h4>
                    <div className="flex flex-wrap gap-1">
                        {todayEntry.feelings.map((feeling: string) => (
                            <Badge key={feeling} variant="secondary">{feeling}</Badge>
                        ))}
                    </div>
                </div>
                 <div>
                    <h4 className="font-medium mb-2">Influencias:</h4>
                    <div className="flex flex-wrap gap-1">
                        {todayEntry.influences.map((influence: string) => (
                            <Badge key={influence} variant="secondary">{influence}</Badge>
                        ))}
                    </div>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step === 1 && '¿Cómo te sientes hoy?'}
              {step === 2 && '¿Qué características describen mejor lo que sientes?'}
              {step === 3 && '¿Qué es lo que más está influyendo en tu ánimo?'}
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="flex justify-around py-6">
              {moodLevels.map((mood) => (
                <Button
                  key={mood.level}
                  variant={selectedMood?.level === mood.level ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => handleMoodSelect(mood)}
                  className="h-20 w-20 rounded-full"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-4xl">{mood.emoji}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {mood.label}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2 justify-center py-4">
              {feelings.map((feeling) => (
                <Button
                  key={feeling}
                  variant={
                    selectedFeelings.includes(feeling) ? 'secondary' : 'outline'
                  }
                  onClick={() =>
                    handleToggleSelection(
                      feeling,
                      selectedFeelings,
                      setSelectedFeelings
                    )
                  }
                >
                  {feeling}
                </Button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-wrap gap-2 justify-center py-4">
              {influences.map((influence) => (
                <Button
                  key={influence}
                  variant={
                    selectedInfluences.includes(influence)
                      ? 'secondary'
                      : 'outline'
                  }
                  onClick={() =>
                    handleToggleSelection(
                      influence,
                      selectedInfluences,
                      setSelectedInfluences
                    )
                  }
                >
                  {influence}
                </Button>
              ))}
            </div>
          )}

          <DialogFooter>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Atrás
              </Button>
            )}
            {step < 3 && (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !selectedMood) || (step === 2 && selectedFeelings.length === 0)}
              >
                Siguiente
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={handleSaveMood}
                disabled={selectedInfluences.length === 0}
              >
                Guardar Registro
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function TodayPage() {
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

  const today = useMemo(() => new Date(), []);
    
  const habitsForToday = useMemo(() => {
    if (!allHabits) return [];
    return allHabits.filter(habit => {
      const lastCompletedDate = habit.lastCompletedAt ? (habit.lastCompletedAt as Timestamp).toDate() : null;
      
      let isCompletedInCurrentPeriod = false;
      if (lastCompletedDate) {
        switch (habit.frequency) {
          case 'Diario':
            isCompletedInCurrentPeriod = isSameDay(lastCompletedDate, today);
            break;
          case 'Semanal':
            isCompletedInCurrentPeriod = isSameWeek(lastCompletedDate, today);
            break;
          case 'Mensual':
            isCompletedInCurrentPeriod = isSameMonth(lastCompletedDate, today);
            break;
          default:
            break;
        }
      }
      return !isCompletedInCurrentPeriod;
    });
  }, [allHabits, today]);
    
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

  const completedHabits = allHabits?.filter((h) => {
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

  const totalHabits = allHabits?.length ?? 0;
  const habitsProgress =
    totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

  const handleToggleHabit = (habitId: string) => {
    if (!user || !allHabits) return;

    const habit = allHabits.find((h) => h.id === habitId);
    if (!habit) return;

    const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);

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
      let longestStreak = habit.longestStreak || 0;
      let newStreak = 1;
      let isConsecutive = false;

      if (lastCompletedDate) {
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

        // Update longest streak based on the *previous* streak before this completion
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      }
      
      // Save the current state before updating, so we can revert if needed.
      updateDocumentNonBlocking(habitRef, {
        lastCompletedAt: Timestamp.fromDate(today),
        currentStreak: newStreak,
        longestStreak: Math.max(longestStreak, newStreak),
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi Día"
        description={
          isClient
            ? `Resumen de tu actividad para hoy, ${todayString}.`
            : 'Resumen de tu actividad para hoy.'
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
  );
}
