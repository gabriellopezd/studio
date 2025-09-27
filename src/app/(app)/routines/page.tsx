'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Play,
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  useFirebase,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};
const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const isSameWeek = (d1: Date, d2: Date) => isSameDay(getStartOfWeek(d1), getStartOfWeek(d2));
const isPreviousDay = (d1: Date, d2: Date) => { const y = new Date(d1); y.setDate(d1.getDate() - 1); return isSameDay(d2, y); };
const isPreviousWeek = (d1: Date, d2: Date) => { const lw = new Date(d1); lw.setDate(d1.getDate() - 7); return isSameWeek(d2, lw); };


export default function RoutinesPage() {
  const { firestore, user } = useFirebase();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<any | null>(null);
  const [routineToDelete, setRoutineToDelete] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);

  const routinesQuery = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'routines') : null),
    [firestore, user]
  );
  const { data: routines, isLoading: routinesLoading } = useCollection(routinesQuery);
  
  const habitsQuery = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'habits') : null),
    [firestore, user]
  );
  const { data: allHabits } = useCollection(habitsQuery);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedHabitIds([]);
    setRoutineToEdit(null);
  };

  const handleOpenDialog = (routine?: any) => {
    if (routine) {
      setRoutineToEdit(routine);
      setName(routine.name);
      setDescription(routine.description || '');
      setSelectedHabitIds(routine.habitIds || []);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSaveRoutine = async () => {
    if (!user || !name) return;

    const routineData = {
      name,
      description,
      habitIds: selectedHabitIds,
      userId: user.uid,
    };

    if (routineToEdit) {
      const routineRef = doc(firestore, 'users', user.uid, 'routines', routineToEdit.id);
      await updateDocumentNonBlocking(routineRef, routineData);
    } else {
      const routinesColRef = collection(firestore, 'users', user.uid, 'routines');
      await addDocumentNonBlocking(routinesColRef, {
        ...routineData,
        createdAt: serverTimestamp(),
      });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDeleteRoutine = async () => {
    if (!user || !routineToDelete) return;
    const routineRef = doc(firestore, 'users', user.uid, 'routines', routineToDelete.id);
    await deleteDocumentNonBlocking(routineRef);
    setRoutineToDelete(null);
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
      // Reverting completion
      updateDocumentNonBlocking(habitRef, {
        lastCompletedAt: habit.previousLastCompletedAt ?? null,
        currentStreak: habit.previousStreak ?? 0,
        previousStreak: null,
        previousLastCompletedAt: null,
      });
    } else {
      // Completing the habit
      const currentStreak = habit.currentStreak || 0;
      let longestStreak = habit.longestStreak || 0;
      let newStreak = 1;
      
      if (lastCompletedDate) {
        let isConsecutive = false;
        switch(habit.frequency) {
          case 'Semanal': isConsecutive = isPreviousWeek(today, lastCompletedDate); break;
          default: isConsecutive = isPreviousDay(today, lastCompletedDate); break;
        }
        if (isConsecutive) newStreak = currentStreak + 1;
      }
      
      const newLongestStreak = Math.max(longestStreak, newStreak);

      updateDocumentNonBlocking(habitRef, {
        lastCompletedAt: Timestamp.fromDate(today),
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        previousStreak: currentStreak,
        previousLastCompletedAt: habit.lastCompletedAt,
      });
    }
  };
  
  const isHabitCompleted = (habit: any) => {
      if (!habit.lastCompletedAt) return false;
      const lastCompletedDate = (habit.lastCompletedAt as Timestamp).toDate();
      const today = new Date();
      switch (habit.frequency) {
          case 'Semanal': return isSameWeek(lastCompletedDate, today);
          default: return isSameDay(lastCompletedDate, today);
      }
  };


  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="RUTINAS"
          description="Crea y sigue tus rutinas diarias para construir consistencia."
        >
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Rutina
          </Button>
        </PageHeader>

        {routinesLoading && <p>Cargando rutinas...</p>}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {routines?.map((routine) => {
            const routineHabits = allHabits?.filter(h => routine.habitIds.includes(h.id)) || [];
            const completedHabitsCount = routineHabits.filter(isHabitCompleted).length;
            const progress = routineHabits.length > 0 ? (completedHabitsCount / routineHabits.length) * 100 : 0;
            
            return (
              <Card key={routine.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{routine.name}</CardTitle>
                      <CardDescription>{routine.description}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(routine)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRoutineToDelete(routine)} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
                        <span>Progreso</span>
                        <span>{completedHabitsCount} de {routineHabits.length}</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <div className="space-y-3">
                    {routineHabits.map((habit: any) => (
                      <div key={habit.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                        <Checkbox
                          id={`routine-${routine.id}-habit-${habit.id}`}
                          checked={isHabitCompleted(habit)}
                          onCheckedChange={() => handleToggleHabit(habit.id)}
                        />
                        <Label htmlFor={`routine-${routine.id}-habit-${habit.id}`} className="flex items-center gap-2 font-normal cursor-pointer">
                          <span className="text-lg">{habit.icon}</span>
                          <span>{habit.name}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{routineToEdit ? 'Editar Rutina' : 'Crear Nueva Rutina'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="routine-name">Nombre</Label>
              <Input id="routine-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-desc">Descripción</Label>
              <Textarea id="routine-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hábitos</Label>
              <div className="space-y-2 rounded-md border p-2 max-h-60 overflow-y-auto">
                 {allHabits?.map(habit => (
                   <div key={habit.id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`habit-${habit.id}`}
                        checked={selectedHabitIds.includes(habit.id)}
                        onCheckedChange={(checked) => {
                          setSelectedHabitIds(prev => checked ? [...prev, habit.id] : prev.filter(id => id !== habit.id));
                        }}
                      />
                      <Label htmlFor={`habit-${habit.id}`} className="flex items-center gap-2 font-normal cursor-pointer">
                        <span className="text-lg">{habit.icon}</span>
                        {habit.name}
                      </Label>
                   </div>
                 ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={resetForm}>Cancelar</Button></DialogClose>
            <Button onClick={handleSaveRoutine}>{routineToEdit ? 'Guardar Cambios' : 'Crear Rutina'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Delete Confirmation */}
      <AlertDialog open={!!routineToDelete} onOpenChange={(open) => !open && setRoutineToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la rutina "{routineToDelete?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoutine} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
