'use client';

import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, Flame, PlusCircle } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export default function HabitsPage() {
  const { firestore, user } = useFirebase();

  const habitsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'habits') : null),
    [firestore, user]
  );
  const { data: allHabits, isLoading: habitsLoading } =
    useCollection(habitsQuery);

  const handleToggleHabit = (habitId: string, currentStatus: boolean) => {
    if (!user) return;
    const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);
    updateDocumentNonBlocking(habitRef, { completed: !currentStatus });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hábitos"
        description="Gestiona tus hábitos y sigue tu progreso."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Hábito
        </Button>
      </PageHeader>

      {habitsLoading && <p>Cargando hábitos...</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allHabits?.map((habit) => (
          <Card key={habit.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{habit.icon}</div>
                  <div>
                    <CardTitle>{habit.name}</CardTitle>
                    <CardDescription>{habit.frequency}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-orange-500">
                  <Flame className="h-5 w-5" />
                  <span className="font-bold">{habit.currentStreak}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-sm text-muted-foreground mb-2">
                Progreso semanal
              </div>
              <Progress value={habit.weeklyProgress} />
            </CardContent>
            <CardFooter>
              <Button
                variant={habit.completed ? 'secondary' : 'outline'}
                className="w-full"
                onClick={() => handleToggleHabit(habit.id, habit.completed)}
              >
                <Check className="mr-2 h-4 w-4" />
                {habit.completed ? 'Completado' : 'Marcar como completado'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
