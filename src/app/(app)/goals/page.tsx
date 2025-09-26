'use client';

import { useState, useMemo } from 'react';
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
import {
  PlusCircle,
  Target,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  useFirebase,
  useCollection,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
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

export default function GoalsPage() {
  const { firestore, user } = useFirebase();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isProgressDialogOpen, setProgressDialogOpen] = useState(false);
  
  const [goalToEdit, setGoalToEdit] = useState<any | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<any | null>(null);
  const [goalToUpdateProgress, setGoalToUpdateProgress] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [unit, setUnit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [newProgress, setNewProgress] = useState('');

  const goalsQuery = useMemo(
    () => (user ? collection(firestore, 'users', user.uid, 'goals') : null),
    [firestore, user]
  );
  const { data: allGoals, isLoading: goalsLoading } = useCollection(goalsQuery);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetValue('');
    setCurrentValue('0');
    setUnit('');
    setDueDate('');
    setGoalToEdit(null);
  };

  const handleOpenDialog = (goal?: any) => {
    if (goal) {
      setGoalToEdit(goal);
      setName(goal.name);
      setDescription(goal.description || '');
      setTargetValue(goal.targetValue.toString());
      setCurrentValue(goal.currentValue.toString());
      setUnit(goal.unit || '');
      setDueDate(goal.dueDate?.toDate ? goal.dueDate.toDate().toISOString().split('T')[0] : '');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };
  
  const handleOpenProgressDialog = (goal: any) => {
    setGoalToUpdateProgress(goal);
    setNewProgress(goal.currentValue.toString());
    setProgressDialogOpen(true);
  };

  const handleSaveGoal = async () => {
    if (!user || !name || !targetValue) return;

    const goalData = {
      name,
      description,
      targetValue: parseFloat(targetValue),
      currentValue: parseFloat(currentValue || '0'),
      unit,
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate + 'T00:00:00')) : null,
      userId: user.uid,
    };

    if (goalToEdit) {
      const goalRef = doc(firestore, 'users', user.uid, 'goals', goalToEdit.id);
      await updateDocumentNonBlocking(goalRef, goalData);
    } else {
      const goalsColRef = collection(firestore, 'users', user.uid, 'goals');
      await addDocumentNonBlocking(goalsColRef, {
        ...goalData,
        isCompleted: false,
        createdAt: serverTimestamp(),
      });
    }
    setDialogOpen(false);
    resetForm();
  };
  
  const handleUpdateProgress = async () => {
    if (!user || !goalToUpdateProgress || newProgress === '') return;

    const progressValue = parseFloat(newProgress);
    if (isNaN(progressValue)) return;
    
    const goalRef = doc(firestore, 'users', user.uid, 'goals', goalToUpdateProgress.id);
    
    const isCompleted = progressValue >= goalToUpdateProgress.targetValue;
    
    await updateDocumentNonBlocking(goalRef, { 
      currentValue: progressValue,
      isCompleted: isCompleted,
    });
    
    setProgressDialogOpen(false);
    setGoalToUpdateProgress(null);
    setNewProgress('');
  };

  const handleDeleteGoal = async () => {
    if (!user || !goalToDelete) return;
    const goalRef = doc(firestore, 'users', user.uid, 'goals', goalToDelete.id);
    await deleteDocumentNonBlocking(goalRef);
    setGoalToDelete(null);
  };
  
  const formatDate = (date: any) => {
     if (!date?.toDate) return 'Sin fecha';
     const d = date.toDate();
     // Adjust for timezone offset to show the correct date
     const timezoneOffset = d.getTimezoneOffset() * 60000;
     const adjustedDate = new Date(d.getTime() + timezoneOffset);
     return adjustedDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="METAS"
          description="Define y sigue el progreso de tus metas a largo plazo."
        >
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Meta
          </Button>
        </PageHeader>

        {goalsLoading && <p>Cargando metas...</p>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allGoals?.map((goal) => (
            <Card key={goal.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{goal.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Target className={`h-6 w-6 ${goal.isCompleted ? 'text-green-500' : 'text-primary'}`} />
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(goal)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setGoalToDelete(goal)} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription>{goal.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {goal.currentValue.toLocaleString()} {goal.unit}
                  </span>
                  <span className="text-muted-foreground">
                    {goal.targetValue.toLocaleString()} {goal.unit}
                  </span>
                </div>
                <Progress
                  value={(goal.currentValue / goal.targetValue) * 100}
                  aria-label={`${(goal.currentValue / goal.targetValue) * 100}% completado`}
                />
              </CardContent>
               <CardFooter className="flex-col items-start gap-4">
                <p className="text-sm text-muted-foreground">
                  Vencimiento: {formatDate(goal.dueDate)}
                </p>
                <Button variant="outline" className="w-full" onClick={() => handleOpenProgressDialog(goal)}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Actualizar Progreso
                </Button>
              </CardFooter>
            </Card>
          ))}
          {!allGoals?.length && !goalsLoading && (
            <Card className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center p-10 text-center">
                <CardHeader>
                  <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                  <CardTitle className="mt-4">
                    No has definido metas
                  </CardTitle>
                  <CardDescription>
                    Crea tu primera meta para empezar a seguir tu progreso.
                  </CardDescription>
                </CardHeader>
              </Card>
          )}
        </div>
      </div>
      
      {/* Create/Edit Goal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{goalToEdit ? 'Editar Meta' : 'Crear Nueva Meta'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Nombre</Label>
              <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-desc">Descripción</Label>
              <Textarea id="goal-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-target">Valor Objetivo</Label>
                <Input id="goal-target" type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="goal-current">Valor Inicial</Label>
                <Input id="goal-current" type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} disabled={!!goalToEdit}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-unit">Unidad</Label>
                <Input id="goal-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ej: Kms, Libros, Horas"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-due-date">Fecha de Vencimiento</Label>
                <Input id="goal-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleSaveGoal}>{goalToEdit ? 'Guardar Cambios' : 'Crear Meta'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Update Progress Dialog */}
      <Dialog open={isProgressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Progreso de "{goalToUpdateProgress?.name}"</DialogTitle>
          </DialogHeader>
           <div className="space-y-2">
              <Label htmlFor="goal-progress">Nuevo Valor Actual</Label>
              <Input id="goal-progress" type="number" value={newProgress} onChange={(e) => setNewProgress(e.target.value)} />
            </div>
          <DialogFooter>
             <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleUpdateProgress}>Actualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la meta "{goalToDelete?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    
