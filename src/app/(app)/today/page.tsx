

'use client';

import {
  Activity,
  CheckCircle2,
  ListTodo,
  Smile,
  Trophy,
  Timer,
  Check,
  Play,
  Square,
  Flame,
} from 'lucide-react';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

import { useState, useEffect, useMemo } from 'react';
import { isHabitCompletedToday } from '@/lib/habits';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/app/_providers/AppProvider';
import { TodaysMoodCard } from './_components/TodaysMoodCard';

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

export default function TodayPage() {
  const [isClient, setIsClient] = useState(false);
  const [motivation, setMotivation] = useState('');
  const { allHabits, habitsLoading, urgentTasks, tasksLoading, activeSession, startSession, stopSession } = useAppContext();

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


  const completedHabits = activeHabits?.filter((h) => isHabitCompletedToday(h)).length ?? 0;

  const totalHabits = activeHabits?.length ?? 0;
  const habitsProgress =
    totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

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
        description={isClient ? `Resumen de tu actividad para hoy, ${todayString}.` : 'Resumen de tu actividad para hoy.'}
        motivation={motivation}
        imageId="dashboard-header"
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
                          ? task.dueDate.toDate().toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric'})
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
    </>
  );
}
