'use client';

import { useState, useMemo, useEffect, createContext, useContext } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, CalendarIcon, Timer, Check, Play, Square } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp, where } from 'firebase/firestore';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppContext } from '@/app/_providers/AppContext';
import { useTimer } from '../layout';


const taskCategories = ["MinJusticia", "CNMH", "Proyectos Personales", "Otro"];


export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [isClient, setIsClient] = useState(false);

  const {
    tasks,
    tasksLoading,
    totalStats,
    categoryStats,
    weeklyTaskStats,
    handleToggleTask,
    handleSaveTask,
    handleDeleteTask
  } = useAppContext();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('Otro');

  const { activeSession, startSession, stopSession } = useTimer();

  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredTasks = useMemo(() => {
    if (!tasks) return { byCategory: {}, all: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let tasksToShow: any[];

    switch (activeTab) {
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

  }, [tasks, activeTab]);

  const resetForm = () => {
    setName('');
    setDueDate(undefined);
    setPriority('medium');
    setCategory('Otro');
    setTaskToEdit(null);
  };

  const handleOpenDialog = (task?: any) => {
    if (task) {
      setTaskToEdit(task);
      setName(task.name);
      setDueDate(task.dueDate?.toDate ? task.dueDate.toDate() : undefined);
      setPriority(task.priority || 'medium');
      setCategory(task.category || 'Otro');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };
  
  const onSaveTask = async () => {
    await handleSaveTask({
      id: taskToEdit?.id,
      name,
      dueDate,
      priority,
      category,
    });
    setDialogOpen(false);
    resetForm();
  };
  
  const onDeleteTask = async () => {
    if (!taskToDelete) return;
    await handleDeleteTask(taskToDelete.id);
    setTaskToDelete(null);
  };


  const getTaskDueDate = (task: any) => {
    if (task.dueDate && task.dueDate.toDate) {
      const date = task.dueDate.toDate();
      const today = new Date();
      today.setHours(0,0,0,0);
      const taskDate = new Date(date);
      taskDate.setHours(0,0,0,0);

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
  
  const categoryOrder = ["MinJusticia", "CNMH", "Proyectos Personales", "Otro", "Sin Categoría"];

  const renderTaskList = (groupedTasks: Record<string, any[]>, allTasksInView: any[]) => {
    const sortedCategories = Object.keys(groupedTasks).sort((a, b) => {
        return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
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
                                    <DropdownMenuItem onClick={() => handleOpenDialog(task)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTaskToDelete(task)} className="text-red-500">
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
        >
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Tarea
          </Button>
        </PageHeader>
        
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
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

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
                <CardTitle>Progreso Total</CardTitle>
                <CardDescription>
                    {totalStats.completed} de {totalStats.total} tareas completadas
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Progress value={totalStats.completionRate} />
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
        
        <div className="grid grid-cols-1 gap-6">
          {isClient ? (
            <Card>
                <CardHeader>
                    <CardTitle>Tareas de la Semana</CardTitle>
                    <CardDescription>Distribución de tareas con fecha de vencimiento en la semana actual.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyTaskStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false}/>
                            <Tooltip />
                            <Bar dataKey="tasks" fill="hsl(var(--primary))" name="Tareas" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Tareas de la Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Cargando gráfico...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
       {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{taskToEdit ? 'Editar Tarea' : 'Crear Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
              <Label htmlFor="task-name">Nombre</Label>
              <Input id="task-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="task-category">Categoría</Label>
                   <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="task-category">
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {taskCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                   <Label htmlFor="task-priority">Prioridad</Label>
                   <Select value={priority} onValueChange={setPriority}>
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
                <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    />
                </PopoverContent>
                </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={onSaveTask}>{taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Delete Confirmation */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la tarea "{taskToDelete?.name}" permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteTask} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
