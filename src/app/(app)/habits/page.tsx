
'use client';

import { useState, useEffect } from 'react';
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
  DropdownMenuSeparator,
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
import { Check, Flame, MoreHorizontal, Pencil, PlusCircle, Trash2, Trophy, RotateCcw, Play, Square, CalendarDays, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isHabitCompletedToday } from '@/lib/habits';
import { useAppContext } from '@/app/_providers/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';


const habitCategories = ["Productividad", "Conocimiento", "Social", "Físico", "Espiritual", "Hogar", "Profesional", "Relaciones Personales"];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

const motivationalQuotes = [
    "La constancia es la madre de la maestría.",
    "Pequeños hábitos, grandes resultados.",
    "Un hábito al día mantiene la mediocridad a raya.",
    "Siembra un hábito y cosecha un carácter.",
    "Eres lo que haces repetidamente."
];

function MonthlyHabitHeatmap({ data }: { data: { day: number, value: number }[] }) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const emptyDays = Array(firstDayOfMonth).fill(null);
    const calendarDays = [...emptyDays, ...data];

    const getHeatmapColor = (value: number) => {
        if (value === 0) return 'bg-muted/30';
        if (value < 25) return 'bg-heatmap-1';
        if (value < 50) return 'bg-heatmap-2';
        if (value < 75) return 'bg-heatmap-3';
        return 'bg-heatmap-4';
    };
    
    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="grid grid-cols-7 gap-1 md:gap-2">
            {weekDays.map(day => <div key={day} className="text-center text-xs font-semibold text-muted-foreground">{day}</div>)}
            {calendarDays.map((dayData, index) => {
                if (!dayData) {
                    return <div key={`empty-${index}`} className="aspect-square rounded-md" />;
                }
                return (
                    <TooltipProvider key={dayData.day}>
                        <UITooltip>
                            <TooltipTrigger asChild>
                                <div className={cn(
                                    "aspect-square rounded-md flex items-center justify-center",
                                    getHeatmapColor(dayData.value)
                                )}>
                                    <span className="text-xs text-foreground/70">{dayData.day}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{dayData.value}% completado</p>
                            </TooltipContent>
                        </UITooltip>
                    </TooltipProvider>
                );
            })}
        </div>
    );
}

export default function HabitsPage() {
  const { 
    groupedHabits, 
    habitsLoading,
    habitCategoryData,
    dailyProductivityData,
    topHabitsByStreak,
    topHabitsByTime,
    monthlyCompletionData,
    analyticsLoading,
    handleToggleHabit,
    handleCreateOrUpdateHabit,
    handleDeleteHabit,
    handleResetAllStreaks,
    activeSession, 
    startSession, 
    stopSession
  } = useAppContext();
  
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<any>(null);
  const [habitToDelete, setHabitToDelete] = useState<any>(null);
  const [habitToReset, setHabitToReset] = useState<any>(null);
  const [motivation, setMotivation] = useState('');

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState('Diario');
  const [newHabitCategory, setNewHabitCategory] = useState('');

  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);
  
  const resetForm = () => {
    setNewHabitName('');
    setNewHabitIcon('');
    setNewHabitFrequency('Diario');
    setNewHabitCategory('');
    setHabitToEdit(null);
  };
  
  const onSave = () => {
    handleCreateOrUpdateHabit({
      id: habitToEdit?.id,
      name: newHabitName,
      icon: newHabitIcon,
      frequency: newHabitFrequency,
      category: newHabitCategory,
    });
    setDialogOpen(false);
    resetForm();
  }

  const onDelete = () => {
    if (habitToDelete) {
      handleDeleteHabit(habitToDelete.id);
      setHabitToDelete(null);
    }
  }

  const onReset = () => {
    if (habitToReset) {
      handleResetAllStreaks();
      setHabitToReset(null);
    }
  }

  const handleOpenDialog = (habit?: any) => {
    if (habit) {
      setHabitToEdit(habit);
      setNewHabitName(habit.name);
      setNewHabitIcon(habit.icon);
      setNewHabitFrequency(habit.frequency);
      setNewHabitCategory(habit.category);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">
                        Hábitos
                        </h1>
                        <p className="text-muted-foreground">Gestiona tus hábitos y sigue tu progreso.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/settings/habits">
                            <Settings className="mr-2 h-4 w-4" />
                            Configurar Hábitos
                            </Link>
                        </Button>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Hábito
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>

        <Tabs defaultValue="habits">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="habits">Mis Hábitos</TabsTrigger>
            <TabsTrigger value="analytics">Análisis de Hábitos</TabsTrigger>
          </TabsList>
          <TabsContent value="habits">
            {habitsLoading && <p className="py-4">Cargando hábitos...</p>}
            <div className="space-y-8 mt-6">
              {Object.keys(groupedHabits).length === 0 && !habitsLoading ? (
                <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
                    <CardHeader>
                        <CardTitle className="mt-4">Aún no tienes hábitos</CardTitle>
                        <CardDescription>
                            Crea tu primer hábito para empezar a construir una rutina positiva.
                        </CardDescription>
                    </CardHeader>
                </Card>
              ) : habitCategories.map((category) => (
                groupedHabits[category] && groupedHabits[category].length > 0 && (
                  <div key={category}>
                    <h2 className="text-xl font-bold tracking-tight mb-4">
                      {category}
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {groupedHabits[category].map((habit: any) => {
                        const isCompleted = isHabitCompletedToday(habit);
                        const isSessionActive = activeSession?.id === habit.id;
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
                             <CardContent className="flex-grow flex items-center justify-between">
                                {habit.category && <Badge variant="secondary">{habit.category}</Badge>}
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenDialog(habit)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setHabitToReset(habit)}>
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Reiniciar Racha
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                    onClick={() => setHabitToDelete(habit)}
                                    className="text-red-500"
                                    >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </CardContent>
                            <CardFooter className="gap-2">
                                <Button
                                    variant={isCompleted ? 'secondary' : 'outline'}
                                    className="w-full"
                                    onClick={() => handleToggleHabit(habit.id)}
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    {isCompleted ? 'Completado' : 'Completar'}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => isSessionActive ? stopSession() : startSession(habit.id, habit.name, 'habit')}
                                    disabled={isCompleted || (!isSessionActive && !!activeSession)}
                                    className={cn(isSessionActive && "bg-primary text-primary-foreground animate-pulse")}
                                >
                                    {isSessionActive ? <Square className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
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
          </TabsContent>
          <TabsContent value="analytics">
            {analyticsLoading && <p className="py-4">Cargando análisis...</p>}
            
            {!analyticsLoading && habitCategoryData?.length === 0 && topHabitsByStreak.length === 0 && topHabitsByTime.length === 0 && monthlyCompletionData.length === 0 && (
                <Card className="mt-4 flex flex-col items-center justify-center p-10 text-center">
                    <CardHeader>
                    <CardTitle className="mt-4">No hay datos para analizar</CardTitle>
                    <CardDescription>
                        Empieza a completar hábitos y a usar el cronómetro para ver tus analíticas.
                    </CardDescription>
                    </CardHeader>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {topHabitsByStreak.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 5 Hábitos por Racha Récord</CardTitle>
                      <CardDescription>Tus hábitos más consistentes a lo largo del tiempo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topHabitsByStreak} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => `${value} días`} />
                          <Bar dataKey="racha" name="Racha Récord" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {topHabitsByTime.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 5 Hábitos por Tiempo de Enfoque</CardTitle>
                      <CardDescription>Donde más has invertido tu tiempo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topHabitsByTime} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" unit=" min" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => `${value} min`} />
                          <Bar dataKey="minutos" name="Minutos" fill="hsl(var(--accent))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {habitCategoryData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tiempo por Categoría de Hábito</CardTitle>
                        <CardDescription>Distribución de tu tiempo de enfoque en hábitos (en minutos).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={habitCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                    {habitCategoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} min`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                )}

                {dailyProductivityData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Productividad por Día de la Semana</CardTitle>
                        <CardDescription>Total de minutos de enfoque (hábitos y tareas) por día.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyProductivityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis unit=" min" />
                                <Tooltip formatter={(value) => `${value} min`} />
                                <Bar dataKey="value" fill="hsl(var(--primary))" name="Minutos de Enfoque">
                                {dailyProductivityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                )}

                {monthlyCompletionData.length > 0 && (
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5"/>Cumplimiento Mensual</CardTitle>
                            <CardDescription>Mapa de calor de tu consistencia con los hábitos diarios este mes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MonthlyHabitHeatmap data={monthlyCompletionData} />
                        </CardContent>
                    </Card>
                )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setDialogOpen(open);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{habitToEdit ? 'Editar Hábito': 'Crear Nuevo Hábito'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="habit-name">Nombre</Label>
              <Input
                id="habit-name"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Ej: Leer 30 minutos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="habit-icon">Ícono</Label>
              <Input
                id="habit-icon"
                value={newHabitIcon}
                onChange={(e) => setNewHabitIcon(e.target.value)}
                placeholder="Ej: 📚"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="habit-frequency">Frecuencia</Label>
              <Select
                value={newHabitFrequency}
                onValueChange={setNewHabitFrequency}
              >
                <SelectTrigger id="habit-frequency">
                  <SelectValue placeholder="Selecciona una frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diario">Diario</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="habit-category">Categoría</Label>
              <Select
                value={newHabitCategory}
                onValueChange={setNewHabitCategory}
              >
                <SelectTrigger id="habit-category">
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
                <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" onClick={onSave}>
              {habitToEdit ? 'Guardar Cambios' : 'Guardar Hábito'}
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
            <AlertDialogTitle>¿Reiniciar racha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se reiniciará la racha y el récord del hábito "{habitToReset?.name}" a cero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onReset} className="bg-destructive hover:bg-destructive/90">
              Sí, reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    