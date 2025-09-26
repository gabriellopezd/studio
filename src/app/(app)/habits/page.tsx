'use client';

import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Flame, PlusCircle } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export default function HabitsPage() {
  const { firestore, user } = useFirebase();

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState('Diario');

  const habitsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'habits') : null),
    [firestore, user]
  );
  const { data: allHabits, isLoading: habitsLoading } =
    useCollection(habitsQuery);

  const handleToggleHabit = (habitId: string) => {
    if (!user || !allHabits) return;

    const habit = allHabits.find((h) => h.id === habitId);
    if (!habit) return;
    
    const habitRef = doc(firestore, 'users', user.uid, 'habits', habitId);

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const lastCompletedDate = habit.lastCompletedAt ? (habit.lastCompletedAt as Timestamp).toDate() : null;
    const isCompletedToday = lastCompletedDate && isSameDay(lastCompletedDate, today);

    if (isCompletedToday) {
      // Habit already completed today, do nothing.
      // Or, add logic to "un-complete", which might complicate streak logic.
      // For now, we prevent un-completing to keep streaks simple.
      return;
    }

    const currentStreak = habit.currentStreak || 0;
    let newStreak = 1; // Default to starting a new streak

    if (lastCompletedDate && isSameDay(lastCompletedDate, yesterday)) {
      // It was completed yesterday, so we increment the streak.
      newStreak = currentStreak + 1;
    }
    
    updateDocumentNonBlocking(habitRef, {
      lastCompletedAt: Timestamp.fromDate(today),
      currentStreak: newStreak,
    });
  };

  const handleCreateHabit = async () => {
    if (!newHabitName.trim() || !newHabitIcon.trim() || !user) return;

    const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
    await addDocumentNonBlocking(habitsColRef, {
      name: newHabitName,
      icon: newHabitIcon,
      frequency: newHabitFrequency,
      currentStreak: 0,
      createdAt: serverTimestamp(),
      lastCompletedAt: null,
      userId: user.uid,
    });

    setNewHabitName('');
    setNewHabitIcon('');
    setNewHabitFrequency('Diario');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="HÁBITOS"
        description="Gestiona tus hábitos y sigue tu progreso."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Hábito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Hábito</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="habit-name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="habit-name"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="col-span-3"
                  placeholder="Ej: Leer 30 minutos"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="habit-icon" className="text-right">
                  Ícono
                </Label>
                <Input
                  id="habit-icon"
                  value={newHabitIcon}
                  onChange={(e) => setNewHabitIcon(e.target.value)}
                  className="col-span-3"
                  placeholder="Ej: 📚"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="habit-frequency" className="text-right">
                  Frecuencia
                </Label>
                <Select
                  value={newHabitFrequency}
                  onValueChange={setNewHabitFrequency}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diario">Diario</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="submit" onClick={handleCreateHabit}>
                  Guardar Hábito
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {habitsLoading && <p>Cargando hábitos...</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allHabits?.map((habit) => {
          const lastCompletedDate = habit.lastCompletedAt
            ? (habit.lastCompletedAt as Timestamp).toDate()
            : null;
          const isCompleted =
            lastCompletedDate && isSameDay(lastCompletedDate, new Date());

          return (
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
              <CardContent className="flex-grow"></CardContent>
              <CardFooter>
                <Button
                  variant={isCompleted ? 'secondary' : 'outline'}
                  className="w-full"
                  onClick={() => handleToggleHabit(habit.id)}
                  disabled={isCompleted}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isCompleted ? 'Completado Hoy' : 'Marcar como completado'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

    