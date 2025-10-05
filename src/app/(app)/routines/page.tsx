
'use client';

import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Play,
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  Square,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Progress } from '@/components/ui/progress';
import { isHabitCompletedToday } from '@/lib/habits';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useHabits } from '@/app/_providers/HabitsProvider';
import { useSession } from '@/app/_providers/SessionProvider';
import { useUI } from '@/app/_providers/UIProvider';

const motivationalQuotes = [
    "La disciplina es el puente entre las metas y los logros.",
    "Una rutina sólida es el secreto de la productividad.",
    "Crea rutinas que te lleven a la vida que deseas.",
    "La automatización de tus mañanas es el primer paso hacia el éxito.",
    "Las cadenas del hábito son demasiado débiles para sentirlas hasta que son demasiado fuertes para romperlas."
];


export default function RoutinesPage() {
  const { 
    routines,
    routinesLoading,
    allHabits,
    routineTimeAnalytics,
    routineCompletionAnalytics,
    analyticsLoading,
    handleToggleHabit,
    handleSaveRoutine,
    handleDeleteRoutine,
    handleCompleteRoutine,
  } = useHabits();

  const { activeSession, startSession, stopSession } = useSession();

  const {
    modalState,
    handleOpenModal,
    handleCloseModal,
    formState,
    setFormState,
  } = useUI();

  const [motivation, setMotivation] = useState('');

  const activeHabits = useMemo(() => allHabits?.filter(h => h.isActive) || [], [allHabits]);


  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
            title="RUTINAS"
            description="Crea y sigue tus rutinas diarias para construir consistencia."
            motivation={motivation}
            imageId="routines-header"
        >
            <Button onClick={() => handleOpenModal('routine')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Rutina
            </Button>
        </PageHeader>

        <Tabs defaultValue="routines">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="routines">Mis Rutinas</TabsTrigger>
            <TabsTrigger value="analytics">Análisis de Rutinas</TabsTrigger>
          </TabsList>
          <TabsContent value="routines" className="mt-6">
            {routinesLoading && <p>Cargando rutinas...</p>}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {routines?.map((routine) => {
                const routineHabits = activeHabits?.filter(h => routine.habitIds.includes(h.id)) || [];
                const completedHabitsCount = routineHabits.filter(isHabitCompletedToday).length;
                const progress = routineHabits.length > 0 ? (completedHabitsCount / routineHabits.length) * 100 : 0;
                const allHabitsInRoutineCompleted = completedHabitsCount === routineHabits.length;
                
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
                            <DropdownMenuItem onClick={() => handleOpenModal('routine', routine)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenModal('deleteRoutine', routine)} className="text-red-500">
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
                        {routineHabits.map((habit: any) => {
                          const isSessionActive = activeSession?.id === habit.id;
                          return (
                            <div key={habit.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                              <Checkbox
                                id={`routine-${routine.id}-habit-${habit.id}`}
                                checked={isHabitCompletedToday(habit)}
                                onCheckedChange={() => handleToggleHabit(habit.id)}
                              />
                              <Label htmlFor={`routine-${routine.id}-habit-${habit.id}`} className="flex-1 items-center gap-2 font-normal cursor-pointer">
                                <span className="text-lg">{habit.icon}</span>
                                <span>{habit.name}</span>
                              </Label>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => isSessionActive ? stopSession() : startSession(habit.id, habit.name, 'habit')}
                                disabled={isHabitCompletedToday(habit) || (!isSessionActive && !!activeSession)}
                                className={cn("h-9 w-9", isSessionActive && "bg-primary text-primary-foreground animate-pulse")}
                              >
                                {isSessionActive ? <Square className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                          className="w-full"
                          onClick={() => handleCompleteRoutine(routine)}
                          disabled={allHabitsInRoutineCompleted}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {allHabitsInRoutineCompleted ? 'Rutina Completa' : 'Completar Rutina'}
                        </Button>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="mt-6">
             {analyticsLoading && <p>Cargando análisis...</p>}

            {!analyticsLoading && routineTimeAnalytics?.length === 0 && routineCompletionAnalytics.length === 0 && (
                <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
                    <CardHeader>
                    <CardTitle className="mt-4">No hay datos para analizar</CardTitle>
                    <CardDescription>
                        Empieza a registrar tiempo en los hábitos de tus rutinas para ver tus analíticas.
                    </CardDescription>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {routineTimeAnalytics.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Tiempo de Enfoque por Rutina</CardTitle>
                      <CardDescription>Distribución del tiempo invertido en cada rutina.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={routineTimeAnalytics} layout="vertical" margin={{ left: 20, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" unit=" min" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => `${value} min`} />
                          <Bar dataKey="minutos" name="Minutos de Enfoque" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
                {routineCompletionAnalytics.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Tasa de Cumplimiento por Rutina</CardTitle>
                      <CardDescription>Consistencia de los hábitos en cada rutina (últimos 30 días).</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={routineCompletionAnalytics} layout="vertical" margin={{ left: 20, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" unit="%" domain={[0, 100]} />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => `${(value as number).toFixed(0)}%`} />
                          <Bar dataKey="completionRate" name="Cumplimiento" fill="hsl(var(--accent))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={modalState.type === 'routine'} onOpenChange={() => handleCloseModal('routine')}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{formState.id ? 'Editar Rutina' : 'Crear Nueva Rutina'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="routine-name">Nombre</Label>
              <Input id="routine-name" value={formState.name || ''} onChange={(e) => setFormState(p => ({...p, name: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routine-desc">Descripción</Label>
              <Textarea id="routine-desc" value={formState.description || ''} onChange={(e) => setFormState(p => ({...p, description: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label>Hábitos</Label>
              <div className="space-y-2 rounded-md border p-2 max-h-60 overflow-y-auto">
                 {activeHabits?.map(habit => (
                   <div key={habit.id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`habit-${habit.id}`}
                        checked={(formState.habitIds || []).includes(habit.id)}
                        onCheckedChange={(checked) => {
                          const currentIds = formState.habitIds || [];
                          const newIds = checked ? [...currentIds, habit.id] : currentIds.filter((id: string) => id !== habit.id);
                          setFormState(p => ({...p, habitIds: newIds}));
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
            <DialogClose asChild><Button variant="outline" onClick={() => handleCloseModal('routine')}>Cancelar</Button></DialogClose>
            <Button onClick={handleSaveRoutine}>{formState.id ? 'Guardar Cambios' : 'Crear Rutina'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={modalState.type === 'deleteRoutine'} onOpenChange={() => handleCloseModal('deleteRoutine')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la rutina "{formState?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleCloseModal('deleteRoutine')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoutine} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
