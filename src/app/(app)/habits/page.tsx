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
import { Badge } from '@/components/ui/badge';


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
  if (d1.getMonth() === 0 && d2.getMonth() === 11 && d2.getFullYear() === d1.getFullYear() - 1) {
    return true;
  }
  return d2.getFullYear() === lastMonth.getFullYear() && d2.getMonth() === lastMonth.getMonth();
};

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual"];

export default function HabitsPage() {
  const { firestore, user } = useFirebase();

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState('Diario');
  const [newHabitCategory, setNewHabitCategory] = useState('');

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
        switch(habit.frequency) {
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

  const handleCreateHabit = async () => {
    if (!newHabitName.trim() || !newHabitIcon.trim() || !user || !newHabitCategory) return;

    const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
    await addDocumentNonBlocking(habitsColRef, {
      name: newHabitName,
      icon: newHabitIcon,
      frequency: newHabitFrequency,
      category: newHabitCategory,
      currentStreak: 0,
      createdAt: serverTimestamp(),
      lastCompletedAt: null,
      userId: user.uid,
    });

    setNewHabitName('');
    setNewHabitIcon('');
    setNewHabitFrequency('Diario');
    setNewHabitCategory('');
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="habit-category" className="text-right">
                  Categoría
                </Label>
                <Select
                  value={newHabitCategory}
                  onValueChange={setNewHabitCategory}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {habitCategories.map(category => (
                       <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
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
            
          let isCompleted = false;
          if (lastCompletedDate) {
            switch (habit.frequency) {
              case 'Semanal':
                isCompleted = isSameWeek(lastCompletedDate, new Date());
                break;
              case 'Mensual':
                isCompleted = isSameMonth(lastCompletedDate, new Date());
                break;
              case 'Diario':
              default:
                isCompleted = isSameDay(lastCompletedDate, new Date());
                break;
            }
          }

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
              <CardContent className="flex-grow">
                 {habit.category && <Badge variant="secondary">{habit.category}</Badge>}
              </CardContent>
              <CardFooter>
                <Button
                  variant={isCompleted ? 'secondary' : 'outline'}
                  className="w-full"
                  onClick={() => handleToggleHabit(habit.id)}
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
