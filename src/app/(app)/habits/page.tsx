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

import { doc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { calculateStreak, isHabitCompletedToday, resetStreak } from '@/lib/habits';
import { HabitsProvider, useHabits } from './_components/HabitsProvider';

const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];

function HabitsContent() {
  const { 
    firestore, 
    user, 
    groupedHabits, 
    habitsLoading,
    handleToggleHabit,
    handleCreateOrUpdateHabit,
    handleDeleteHabit,
    handleResetStreak,
  } = useHabits();

  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<any>(null);
  const [habitToDelete, setHabitToDelete] = useState<any>(null);

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState('Diario');
  const [newHabitCategory, setNewHabitCategory] = useState('');
  
  const [habitToReset, setHabitToReset] = useState<any | null>(null);

  const resetForm = () => {
    setNewHabitName('');
    setNewHabitIcon('');
    setNewHabitFrequency('Diario');
    setNewHabitCategory('');
  };
  
  const onSave = () => {
    handleCreateOrUpdateHabit({
      id: habitToEdit?.id,
      name: newHabitName,
      icon: newHabitIcon,
      frequency: newHabitFrequency,
      category: newHabitCategory,
    });
    if (habitToEdit) {
      setEditDialogOpen(false);
      setHabitToEdit(null);
    } else {
      setCreateDialogOpen(false);
    }
    resetForm();
  }

  const onDelete = () => {
    if (habitToDelete) {
      handleDeleteHabit(habitToDelete.id);
      setHabitToDelete(null);
    }
  }

  const onResetStreak = () => {
    if (habitToReset) {
      handleResetStreak(habitToReset.id);
      setHabitToReset(null);
    }
  }
  
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
                    const isCompleted = isHabitCompletedToday(habit);

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
                              <div className="flex items-center gap-1 text-accent">
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
          } else {
            handleOpenCreateDialog();
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
            <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" onClick={onSave}>
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
             <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" onClick={onSave}>
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
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reset Streak Confirmation Dialog */}
      <AlertDialog open={!!habitToReset} onOpenChange={(open) => !open && setHabitToReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar Racha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reiniciará la racha actual y el récord del hábito "{habitToReset?.name}" a cero. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onResetStreak} className="bg-destructive hover:bg-destructive/90">
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


export default function HabitsPage() {
  return (
    <HabitsProvider>
      <HabitsContent />
    </HabitsProvider>
  )
}
