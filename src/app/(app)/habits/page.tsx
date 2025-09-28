'use client';

import { useState, useEffect, useMemo } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Flame, MoreHorizontal, Pencil, PlusCircle, Trash2, Trophy, RotateCcw } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
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

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

export default function HabitsPage() {
  const { firestore, user } = useFirebase();

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<any>(null);
  const [habitToDelete, setHabitToDelete] = useState<any>(null);
  const [habitToReset, setHabitToReset] = useState<any>(null);

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState('Diario');
  const [newHabitCategory, setNewHabitCategory] = useState('');

  const habitsQuery = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'habits') : null),
    [firestore, user]
  );
  const { data: allHabits, isLoading: habitsLoading } =
    useCollection(habitsQuery);
    
  const groupedHabits = useMemo(() => {
    if (!allHabits) return {};
    return allHabits.reduce((acc, habit) => {
      const category = habit.category || 'Sin Categoría';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(habit);
      return acc;
    }, {} as { [key: string]: any[] });
  }, [allHabits]);


  useEffect(() => {
    if (habitToEdit) {
      setNewHabitName(habitToEdit.name);
      setNewHabitIcon(habitToEdit.icon);
      setNewHabitFrequency(habitToEdit.frequency);
      setNewHabitCategory(habitToEdit.category);
      setEditDialogOpen(true);
    }
  }, [habitToEdit]);

  const resetForm = () => {
    setNewHabitName('');
    setNewHabitIcon('');
    setNewHabitFrequency('Diario');
    setNewHabitCategory('');
  };

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
        switch(habit.frequency) {
          case 'Semanal':
            isConsecutive = isPreviousWeek(today, lastCompletedDate);
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

  const handleCreateOrUpdateHabit = async () => {
    if (!newHabitName.trim() || !newHabitIcon.trim() || !user || !newHabitCategory) return;

    if (habitToEdit) {
      // Update existing habit
      const habitRef = doc(firestore, 'users', user.uid, 'habits', habitToEdit.id);
      await updateDocumentNonBlocking(habitRef, {
        name: newHabitName,
        icon: newHabitIcon,
        frequency: newHabitFrequency,
        category: newHabitCategory,
      });
      setEditDialogOpen(false);
      setHabitToEdit(null);
    } else {
      // Create new habit
      const habitsColRef = collection(firestore, 'users', user.uid, 'habits');
      await addDocumentNonBlocking(habitsColRef, {
        name: newHabitName,
        icon: newHabitIcon,
        frequency: newHabitFrequency,
        category: newHabitCategory,
        currentStreak: 0,
        longestStreak: 0,
        createdAt: serverTimestamp(),
        lastCompletedAt: null,
        userId: user.uid,
      });
      setCreateDialogOpen(false);
    }
    resetForm();
  };

  const handleDeleteHabit = async () => {
    if (!habitToDelete || !user) return;
    const habitRef = doc(firestore, 'users', user.uid, 'habits', habitToDelete.id);
    await deleteDocumentNonBlocking(habitRef);
    setHabitToDelete(null);
  };
  
  const handleResetStreak = async () => {
    if (!habitToReset || !user) return;
    const habitRef = doc(firestore, 'users', user.uid, 'habits', habitToReset.id);
    await updateDocumentNonBlocking(habitRef, {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedAt: null,
      previousStreak: null,
      previousLastCompletedAt: null,
    });
    setHabitToReset(null);
  };
  
  const handleOpenEditDialog = (habit: any) => {
    setHabitToEdit(habit);
    setNewHabitName(habit.name);
    setNewHabitIcon(habit.icon);
    setNewHabitFrequency(habit.frequency);
    setNewHabitCategory(habit.category);
    setEditDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setHabitToEdit(null);
    setCreateDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Hábitos"
          description="Gestiona tus hábitos y sigue tu progreso."
        >
          <Button onClick={handleOpenCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Hábito
          </Button>
        </PageHeader>

        {habitsLoading && <p>Cargando hábitos...</p>}

        <div className="space-y-8">
          {habitCategories.map((category) => (
            groupedHabits[category] && groupedHabits[category].length > 0 && (
              <div key={category}>
                <h2 className="text-xl font-bold tracking-tight mb-4">
                  {category}
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {groupedHabits[category].map((habit: any) => {
                    const lastCompletedDate = habit.lastCompletedAt
                      ? (habit.lastCompletedAt as Timestamp).toDate()
                      : null;
                      
                    let isCompleted = false;
                    if (lastCompletedDate) {
                      switch (habit.frequency) {
                        case 'Semanal':
                          isCompleted = isSameWeek(lastCompletedDate, new Date());
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
                             <div className="flex flex-col items-end gap-1 text-right">
                              <div className="flex items-center gap-1 text-orange-500">
                                <Flame className="h-5 w-5" />
                                <span className="font-bold">{habit.currentStreak || 0}</span>
                              </div>
                              <div className="flex items-center gap-1 text-yellow-500">
                                <Trophy className="h-4 w-4" />
                                <span className="font-semibold text-sm">{habit.longestStreak || 0}</span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <div className="flex items-center justify-between">
                            {habit.category && <Badge variant="secondary">{habit.category}</Badge>}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(habit)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setHabitToReset(habit)}>
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Reiniciar Racha
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setHabitToDelete(habit)}
                                  className="text-red-500"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
            )
          ))}
        </div>
      </div>
      
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetForm();
            setCreateDialogOpen(false);
          }
        }}>
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
            <Button type="submit" onClick={handleCreateOrUpdateHabit}>
              Guardar Hábito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setHabitToEdit(null);
            setEditDialogOpen(false);
            resetForm();
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Hábito</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-habit-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="edit-habit-name"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="col-span-3"
                placeholder="Ej: Leer 30 minutos"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-habit-icon" className="text-right">
                Ícono
              </Label>
              <Input
                id="edit-habit-icon"
                value={newHabitIcon}
                onChange={(e) => setNewHabitIcon(e.target.value)}
                className="col-span-3"
                placeholder="Ej: 📚"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-habit-frequency" className="text-right">
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
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-habit-category" className="text-right">
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
            <Button type="submit" onClick={handleCreateOrUpdateHabit}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!habitToDelete} onOpenChange={(open) => !open && setHabitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el hábito "{habitToDelete?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reset Streak Confirmation Dialog */}
      <AlertDialog open={!!habitToReset} onOpenChange={(open) => !open && setHabitToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar Progreso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reiniciará la racha actual y el récord de "{habitToReset?.name}" a cero. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetStreak} className="bg-destructive hover:bg-destructive/90">
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
