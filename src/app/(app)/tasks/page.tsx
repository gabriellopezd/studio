
'use client';

import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Play, Square, Percent, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ResponsiveCalendar } from './_components/ResponsiveCalendar';
import Link from 'next/link';
import { useTasks } from '@/app/_providers/TasksProvider';
import { useSession } from '@/app/_providers/SessionProvider';
import { useUI } from '@/app/_providers/UIProvider';

const motivationalQuotes = [
    "Una tarea completada es un paso más hacia tu meta.",
    "No dejes para mañana lo que puedas tachar de la lista hoy.",
    "Organiza tus tareas, conquista tu día.",
    "La satisfacción de una lista de tareas vacía no tiene precio.",
    "Divide y vencerás. Una tarea a la vez."
];

export default function TasksPage() {
  const [activeTaskListTab, setActiveTaskListTab] = useState('all');
  const [isClient, setIsClient] = useState(false);
  const [motivation, setMotivation] = useState('');
  
  const {
    tasks,
    tasksLoading,
    taskCategories,
    totalStats,
    categoryStats,
    taskTimeAnalytics,
    analyticsLoading,
    onTimeCompletionRate,
    dailyCompletionStats,
    completedTasksByCategory,
    handleToggleTask,
    handleSaveTask,
    handleDeleteTask,
  } = useTasks();

  const { activeSession, startSession, stopSession } = useSession();
  const {
    modalState,
    handleOpenModal,
    handleCloseModal,
    formState,
    setFormState,
  } = useUI();
  
  useEffect(() => {
    setIsClient(true);
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const activeTaskCategories = useMemo(() => taskCategories?.filter(c => c.isActive) || [], [taskCategories]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return { byCategory: {}, all: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let tasksToShow: any[];

    switch (activeTaskListTab) {
      case 'today':
        tasksToShow = tasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDueDate = task.dueDate.toDate();
          taskDueDate.setHours(0,0,0,0);
          return taskDueDate.getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        tasksToShow = tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDueDate = task.dueDate.toDate();
            taskDueDate.setHours(0,0,0,0);
            return taskDueDate > today && taskDueDate <= nextWeek;
        });
        break;
      case 'completed':
        tasksToShow = tasks.filter(task => task.isCompleted);
        break;
      case 'all':
      default:
        tasksToShow = tasks.filter(task => !task.isCompleted);
        break;
    }

    const byCategory = tasksToShow.reduce((acc, task) => {
      const cat = task.category || 'Sin Categoría';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(task);
      return acc;
    }, {} as Record<string, any[]>);

    return { byCategory, all: tasksToShow };

  }, [tasks, activeTaskListTab]);

  const getTaskDueDate = (task: any) => {
    if (task.dueDate && task.dueDate.toDate) {
      const date = task.dueDate.toDate();
      const today = new Date();
      today.setHours(0,0,0,0);
      const taskDate = new Date(date);
      taskDate.setHours(0,0,0,0);

      if (task.isCompleted && task.completionDate) {
        return `Completada: ${format(task.completionDate.toDate(), 'PPP', { locale: es })}`;
      }
      if (taskDate.getTime() < today.getTime()) {
        return `Venció: ${format(date, 'PPP', { locale: es })}`;
      }
      return `Vence: ${format(date, 'PPP', { locale: es })}`;
    }
    return 'Sin fecha de vencimiento';
  }
  
  const getPriorityBadge = (priority: string) => {
     switch(priority) {
        case 'high': return 'bg-red-200 text-red-800 hover:bg-red-200/80';
        case 'medium': return 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200/80';
        case 'low': return 'bg-green-200 text-green-800 hover:bg-green-200/80';
        default: return 'bg-gray-200 text-gray-800';
     }
  }
  
  const categoryOrder = taskCategories?.map(c => c.name).sort() || [];

  const renderTaskList = (groupedTasks: Record<string, any[]>, allTasksInView: any[]) => {
    const sortedCategories = Object.keys(groupedTasks).sort((a, b) => {
        const orderA = categoryOrder.indexOf(a);
        const orderB = categoryOrder.indexOf(b);
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
    });

    return (
      <div className="mt-4 space-y-6">
        {tasksLoading && <p>Cargando tareas...</p>}
        {!allTasksInView?.length && !tasksLoading && (
           <p className="text-muted-foreground text-center p-4">No hay tareas en esta vista.</p>
        )}
        {sortedCategories.map(category => (
            groupedTasks[category] && groupedTasks[category].length > 0 && (
                <div key={category}>
                    <h3 className="text-lg font-semibold mb-2">{category}</h3>
                    <div className="space-y-2 rounded-lg border bg-card p-4">
                        {groupedTasks[category].map((task: any) => {
                          const isSessionActive = activeSession?.id === task.id;
                          return (
                            <div
                                key={task.id}
                                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                            >
                                <Checkbox
                                id={`task-${task.id}`}
                                checked={task.isCompleted}
                                onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)}
                                />
                                <label
                                htmlFor={`task-${task.id}`}
                                className="flex-1 cursor-pointer"
                                >
                                <p
                                    className={`font-medium ${
                                    task.isCompleted
                                        ? 'text-muted-foreground line-through'
                                        : ''
                                    }`}
                                >
                                    {task.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {getTaskDueDate(task)}
                                </p>
                                </label>
                                <Badge className={cn(getPriorityBadge(task.priority), 'ml-auto')}>
                                    {task.priority}
                                </Badge>
                                {!task.isCompleted && (
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => isSessionActive ? stopSession() : startSession(task.id, task.name, 'task')}
                                    disabled={!isSessionActive && !!activeSession}
                                    className={cn("h-9 w-9", isSessionActive && "bg-primary text-primary-foreground animate-pulse")}
                                  >
                                    {isSessionActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                  </Button>
                                )}
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenModal('task', { ...task, dueDate: task.dueDate?.toDate() })}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenModal('deleteTask', task)} className="text-red-500">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )})}
                    </div>
                </div>
            )
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
            title="TAREAS"
            description="Organiza tus tareas y mantente enfocado."
            motivation={motivation}
            imageId="dashboard-header"
        >
            <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" asChild>
                    <Link href="/settings/tasks">
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar Categorías
                    </Link>
                </Button>
                <Button onClick={() => handleOpenModal('task')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Tarea
                </Button>
            </div>
        </PageHeader>
        
        <Tabs defaultValue="tasks">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tasks">Mis Tareas</TabsTrigger>
                <TabsTrigger value="analytics">Análisis</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks">
                <Tabs defaultValue="all" onValueChange={setActiveTaskListTab} className="mt-4">
                    <TabsList>
                        <TabsTrigger value="all">Pendientes</TabsTrigger>
                        <TabsTrigger value="today">Hoy</TabsTrigger>
                        <TabsTrigger value="upcoming">Próximos 7 días</TabsTrigger>
                        <TabsTrigger value="completed">Completadas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">{renderTaskList(filteredTasks.byCategory, filteredTasks.all)}</TabsContent>
                    <TabsContent value="today">{renderTaskList(filteredTasks.byCategory, filteredTasks.all)}</TabsContent>
                    <TabsContent value="upcoming">{renderTaskList(filteredTasks.byCategory, filteredTasks.all)}</TabsContent>
                    <TabsContent value="completed">{renderTaskList(filteredTasks.byCategory, filteredTasks.all)}</TabsContent>
                </Tabs>
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Progreso Total de Tareas</CardTitle>
                                <CardDescription>
                                    {totalStats.completed} de {totalStats.total} tareas completadas en total.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Progress value={totalStats.completionRate} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Percent className="size-5" />
                                    Tasa de Cumplimiento a Tiempo
                                </CardTitle>
                                <CardDescription>
                                    Porcentaje de tareas completadas en o antes de su fecha de vencimiento.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{onTimeCompletionRate.toFixed(0)}%</p>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(categoryStats).map(([category, stats]) => (
                            <Card key={category}>
                                <CardHeader>
                                    <CardTitle>{category}</CardTitle>
                                    <CardDescription>
                                        {stats.completed} de {stats.total} tareas completadas
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Progress value={stats.completionRate} />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isClient && dailyCompletionStats.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rendimiento Semanal</CardTitle>
                                <CardDescription>Tareas completadas vs. pendientes por día en la semana actual.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dailyCompletionStats}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false}/>
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="completadas" stackId="a" fill="hsl(var(--primary))" name="Completadas" />
                                        <Bar dataKey="pendientes" stackId="a" fill="hsl(var(--destructive) / 0.5)" name="Pendientes" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}
                    {isClient && completedTasksByCategory.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tareas Completadas por Categoría</CardTitle>
                                <CardDescription>Volumen total de tareas finalizadas en cada categoría.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={completedTasksByCategory} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="tareas" name="Tareas Completadas" fill="hsl(var(--primary))" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {isClient && taskTimeAnalytics.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Tiempo de Enfoque por Categoría</CardTitle>
                                <CardDescription>Minutos totales registrados en cada categoría de tarea.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={taskTimeAnalytics} layout="vertical" margin={{ left: 20, right: 30 }}>
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
                    </div>
                </div>
            </TabsContent>
        </Tabs>
      </div>
      
       {/* Create/Edit Dialog */}
      <Dialog open={modalState.type === 'task'} onOpenChange={() => handleCloseModal('task')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formState.id ? 'Editar Tarea' : 'Crear Nueva Tarea'}</DialogTitle>
          </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-name">Nombre</Label>
                <Input id="task-name" value={formState.name || ''} onChange={(e) => setFormState(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-category">Categoría</Label>
                    <Select value={formState.category || 'Otro'} onValueChange={(value) => setFormState(p => ({ ...p, category: value }))}>
                      <SelectTrigger id="task-category">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTaskCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-priority">Prioridad</Label>
                    <Select value={formState.priority || 'medium'} onValueChange={(value) => setFormState(p => ({ ...p, priority: value }))}>
                      <SelectTrigger id="task-priority">
                        <SelectValue placeholder="Selecciona prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Fecha de Vencimiento</Label>
                <ResponsiveCalendar
                  id="task-due-date"
                  value={formState.dueDate ? new Date(formState.dueDate) : undefined}
                  onSelect={(date) =>
                    setFormState(p => ({ ...p, dueDate: date }))
                  }
                />
              </div>
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseModal('task')}>Cancelar</Button>
            <Button onClick={handleSaveTask}>{formState.id ? 'Guardar Cambios' : 'Crear Tarea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Delete Confirmation */}
      <AlertDialog open={modalState.type === 'deleteTask'} onOpenChange={() => handleCloseModal('deleteTask')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la tarea "{formState?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleCloseModal('deleteTask')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
