
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Landmark,
  PiggyBank,
  CalendarClock,
} from 'lucide-react';
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/app/_providers/AppContext';

const motivationalQuotes = [
    "Una meta sin un plan es solo un deseo.",
    "El futuro pertenece a quienes creen en la belleza de sus sueños.",
    "Ponte metas grandes y no pares hasta llegar allí.",
    "La distancia entre tus sueños y la realidad se llama acción.",
    "No es la meta lo que importa, sino el camino."
];

export default function GoalsPage() {
  const { firestore, user, goals, goalsLoading } = useAppContext();

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
  const [type, setType] = useState('generic');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [motivation, setMotivation] = useState('');

  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const { savingsGoals, debtGoals, genericGoals } = useMemo(() => {
    return {
        savingsGoals: goals?.filter(g => g.type === 'savings') || [],
        debtGoals: goals?.filter(g => g.type === 'debt') || [],
        genericGoals: goals?.filter(g => g.type === 'generic' || !g.type) || [],
    }
  }, [goals]);


  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetValue('');
    setCurrentValue('0');
    setUnit('');
    setDueDate('');
    setGoalToEdit(null);
    setType('generic');
    setMonthlyContribution('');
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
      setType(goal.type || 'generic');
      setMonthlyContribution(goal.monthlyContribution?.toString() || '');
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
    if (!user || !name || !targetValue || !firestore) return;

    const goalData = {
      name,
      description,
      targetValue: parseFloat(targetValue),
      currentValue: parseFloat(currentValue || '0'),
      unit: type === 'generic' ? unit : 'COP',
      dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate + 'T00:00:00')) : null,
      type,
      monthlyContribution: type !== 'generic' ? parseFloat(monthlyContribution || '0') : null,
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
    if (!user || !goalToUpdateProgress || newProgress === '' || !firestore) return;

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
    if (!user || !goalToDelete || !firestore) return;
    const goalRef = doc(firestore, 'users', user.uid, 'goals', goalToDelete.id);
    await deleteDocumentNonBlocking(goalRef);
    setGoalToDelete(null);
  };
  
  const calculateProjectedDate = (goal: any) => {
    if (goal.isCompleted || !goal.monthlyContribution || goal.monthlyContribution <= 0) {
        return null;
    }
    const remaining = goal.targetValue - goal.currentValue;
    if (remaining <= 0) return 'Completado';

    const monthsRemaining = Math.ceil(remaining / goal.monthlyContribution);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsRemaining);

    return `Se completará en ${projectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
  };
  
  const formatDate = (date: any) => {
     if (!date?.toDate) return 'Sin fecha';
     const d = date.toDate();
     const timezoneOffset = d.getTimezoneOffset() * 60000;
     const adjustedDate = new Date(d.getTime() + timezoneOffset);
     return adjustedDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
  }

  const renderGoalCard = (goal: any) => {
    const isFinancial = goal.type === 'savings' || goal.type === 'debt';
    const projectedDate = isFinancial ? calculateProjectedDate(goal) : null;
    const progress = (goal.currentValue / goal.targetValue) * 100;

    return (
        <Card key={goal.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                     <div className="bg-primary/10 p-2 rounded-lg">
                        {goal.type === 'savings' ? <PiggyBank className="h-6 w-6 text-primary" />
                        : goal.type === 'debt' ? <Landmark className="h-6 w-6 text-primary" />
                        : <Target className={`h-6 w-6 ${goal.isCompleted ? 'text-green-500' : 'text-primary'}`} />}
                    </div>
                  <CardTitle>{goal.name}</CardTitle>
                </div>
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
            <CardDescription>{goal.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-foreground">
                  {isFinancial ? formatCurrency(goal.currentValue) : `${goal.currentValue.toLocaleString()} ${goal.unit}`}
                </span>
                <span className="text-muted-foreground">
                  {isFinancial ? formatCurrency(goal.targetValue) : `${goal.targetValue.toLocaleString()} ${goal.unit}`}
                </span>
              </div>
              <Progress
                value={progress}
                aria-label={`${progress.toFixed(0)}% completado`}
              />
            </div>
            {isFinancial && goal.monthlyContribution > 0 && (
                <div className="text-sm text-muted-foreground">
                    Aportando <span className="font-medium text-foreground">{formatCurrency(goal.monthlyContribution)}</span> al mes.
                </div>
            )}
          </CardContent>
           <CardFooter className="flex-col items-start gap-4">
            {projectedDate ? (
                 <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    {projectedDate}
                </p>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Vencimiento: {formatDate(goal.dueDate)}
                </p>
            )}
            <Button variant="outline" className="w-full" onClick={() => handleOpenProgressDialog(goal)}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Actualizar Progreso
            </Button>
          </CardFooter>
        </Card>
      );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="METAS"
          description="Define y sigue el progreso de tus metas a largo plazo."
          motivation={motivation}
          imageUrl="https://picsum.photos/seed/6/1200/300"
        >
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Meta
          </Button>
        </PageHeader>

        {goalsLoading && <p>Cargando metas...</p>}

        <Tabs defaultValue="savings">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="savings">Ahorros</TabsTrigger>
                <TabsTrigger value="debt">Deudas</TabsTrigger>
                <TabsTrigger value="generic">Genéricas</TabsTrigger>
            </TabsList>
            <TabsContent value="savings" className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {savingsGoals.map(renderGoalCard)}
                </div>
                 {!savingsGoals.length && !goalsLoading && (
                    <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
                        <CardHeader>
                        <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle className="mt-4">Sin Metas de Ahorro</CardTitle>
                        <CardDescription>Crea una meta de ahorro para empezar a planificar.</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </TabsContent>
            <TabsContent value="debt" className="mt-4">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {debtGoals.map(renderGoalCard)}
                </div>
                {!debtGoals.length && !goalsLoading && (
                    <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
                        <CardHeader>
                        <Landmark className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle className="mt-4">Sin Metas de Deudas</CardTitle>
                        <CardDescription>Registra una deuda para seguir tu progreso de amortización.</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </TabsContent>
            <TabsContent value="generic" className="mt-4">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {genericGoals.map(renderGoalCard)}
                </div>
                {!genericGoals.length && !goalsLoading && (
                    <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
                        <CardHeader>
                        <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle className="mt-4">Sin Metas Genéricas</CardTitle>
                        <CardDescription>Crea una meta para empezar a seguir tu progreso.</CardDescription>
                        </CardHeader>
                    </Card>
                )}
            </TabsContent>
        </Tabs>
      </div>
      
      {/* Create/Edit Goal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{goalToEdit ? 'Editar Meta' : 'Crear Nueva Meta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="goal-type">Tipo de Meta</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="goal-type">
                        <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="generic">Genérica</SelectItem>
                        <SelectItem value="savings">Ahorro</SelectItem>
                        <SelectItem value="debt">Deuda</SelectItem>
                    </SelectContent>
                </Select>
            </div>
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

            {type !== 'generic' && (
                 <div className="space-y-2">
                    <Label htmlFor="goal-contribution">Aportación Mensual</Label>
                    <Input id="goal-contribution" type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} placeholder="Ej: 50000"/>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-unit">Unidad</Label>
                <Input id="goal-unit" value={type === 'generic' ? unit : 'COP'} onChange={(e) => setUnit(e.target.value)} placeholder={type === 'generic' ? "Ej: Kms, Libros" : 'COP'} disabled={type !== 'generic'}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-due-date">Fecha de Vencimiento</Label>
                <Input id="goal-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={type !== 'generic'} />
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
           <div className="space-y-2 py-4">
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
