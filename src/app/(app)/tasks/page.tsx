'use client';

import { useState, useMemo, useEffect } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, CalendarIcon, Timer, Check } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp, where } from 'firebase/firestore';
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


const taskCategories = ["MinJusticia", "CNMH", "Proyectos Personales", "Otro"];

export default function TasksPage() {
  const { firestore, user } = useFirebase();
  const [activeTab, setActiveTab] = useState('all');
  const [isClient, setIsClient] = useState(false);

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('Otro');

  const [timerTask, setTimerTask] = useState<any | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimerDialogOpen, setTimerDialogOpen] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setElapsedSeconds(seconds => seconds + 1);
      }, 1000);
    } else if (!isTimerActive && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive]);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const tasksQuery = useMemo(() => {
    if (!user) return null;
    let q = query(collection(firestore, 'users', user.uid, 'tasks'));
    if (activeTab !== 'completed') {
      q = query(q, where('isCompleted', '==', false));
    } else {
      q = query(q, where('isCompleted', '==', true));
    }
    return q;
  }, [firestore, user, activeTab]);

  const { data: allTasks, isLoading: tasksLoading } = useCollection(tasksQuery);

  const totalStats = useMemo(() => {
    if (!allTasks) return { completed: 0, total: 0, completionRate: 0 };
    
    const completed = allTasks.filter(t => t.isCompleted).length;
    const total = allTasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, completionRate };
  }, [allTasks]);


  const categoryStats = useMemo(() => {
    if (!allTasks) return {};
    
    const stats = taskCategories.reduce((acc, category) => {
        const tasksInCategory = allTasks.filter(t => t.category === category);
        if (tasksInCategory.length > 0) {
            const completed = tasksInCategory.filter(t => t.isCompleted).length;
            const total = tasksInCategory.length;
            const completionRate = total > 0 ? (completed / total) * 100 : 0;
            
            acc[category] = { completed, total, completionRate };
        }
        return acc;
    }, {} as Record<string, { completed: number; total: number; completionRate: number; }>);

    return stats;
  }, [allTasks]);

  const weeklyTaskStats = useMemo(() => {
    if (!allTasks) return [];

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Lunes como inicio de semana
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);


    const weekData = Array(7).fill(0).map((_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return {
            name: day.toLocaleDateString('es-ES', { weekday: 'short' }),
            tasks: 0,
        };
    });

    allTasks.forEach(task => {
        if (task.dueDate && task.dueDate.toDate) {
            const taskDate = task.dueDate.toDate();
            if (taskDate >= startOfWeek && taskDate <= endOfWeek) {
                const dayIndex = (taskDate.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
                if (dayIndex >= 0 && dayIndex < 7) {
                    weekData[dayIndex].tasks++;
                }
            }
        }
    });

    return weekData;
  }, [allTasks]);


  const filteredTasks = useMemo(() => {
    if (!allTasks) return { byCategory: {}, all: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let tasksToShow: any[];

    switch (activeTab) {
      case 'today':
        tasksToShow = allTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDueDate = task.dueDate.toDate();
          taskDueDate.setHours(0,0,0,0);
          return taskDueDate.getTime() === today.getTime();
        });
        break;
      case 'upcoming':
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        tasksToShow = allTasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDueDate = task.dueDate.toDate();
            taskDueDate.setHours(0,0,0,0);
            return taskDueDate > today && taskDueDate <= nextWeek;
        });
        break;
      case 'completed':
      case 'all':
      default:
        tasksToShow = allTasks;
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

  }, [allTasks, activeTab]);

  const handleToggleTask = (taskId: string, currentStatus: boolean) => {
    if (!user) return;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskId);
    updateDocumentNonBlocking(taskRef, { isCompleted: !currentStatus });
  };
  
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
  
  const handleSaveTask = async () => {
    if (!user || !name) return;
  
    const taskData = {
      name,
      dueDate: dueDate ? Timestamp.fromDate(dueDate) : null,
      priority,
      category,
      userId: user.uid,
    };
  
    if (taskToEdit) {
      const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskToEdit.id);
      await updateDocumentNonBlocking(taskRef, taskData);
    } else {
      const tasksColRef = collection(firestore, 'users', user.uid, 'tasks');
      await addDocumentNonBlocking(tasksColRef, {
        ...taskData,
        isCompleted: false,
        createdAt: serverTimestamp(),
      });
    }
    setDialogOpen(false);
    resetForm();
  };
  
  const handleDeleteTask = async () => {
    if (!user || !taskToDelete) return;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskToDelete.id);
    await deleteDocumentNonBlocking(taskRef);
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

  const handleStartTimer = (task: any) => {
    setTimerTask(task);
    setElapsedSeconds(0);
    setIsTimerActive(false);
    setTimerDialogOpen(true);
  };
  
  const handleStopAndComplete = () => {
    if (timerTask) {
      handleToggleTask(timerTask.id, false); // Mark as complete
    }
    setIsTimerActive(false);
    setTimerDialogOpen(false);
    setTimerTask(null);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  
  const categoryOrder = ["MinJusticia", "CNMH", "Proyectos Personales", "Otro", "Sin Categoría"];

  const renderTaskList = (groupedTasks: Record<string, any[]>, allTasks: any[]) => {
    const sortedCategories = Object.keys(groupedTasks).sort((a, b) => {
        return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
    });

    return (
      <div className="mt-4 space-y-6">
        {tasksLoading && <p>Cargando tareas...</p>}
        {!allTasks?.length && !tasksLoading && (
           <p className="text-muted-foreground text-center p-4">No hay tareas en esta vista.</p>
        )}
        {sortedCategories.map(category => (
            groupedTasks[category] && groupedTasks[category].length > 0 && (
                <div key={category}>
                    <h3 className="text-lg font-semibold mb-2">{category}</h3>
                    <div className="space-y-2 rounded-lg border bg-card p-4">
                        {groupedTasks[category].map(task => (
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
                                <Badge className={getPriorityBadge(task.priority)}>
                                    {task.priority}
                                </Badge>
                                {!task.isCompleted && (
                                  <Button variant="outline" size="icon" onClick={() => handleStartTimer(task)} className="h-9 w-9">
                                      <Timer className="h-4 w-4" />
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
                        ))}
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
          <div className="grid gap-4 py-4">
             <div className="space-y-2">
              <Label htmlFor="task-name">Nombre</Label>
              <Input id="task-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
             <div className="grid grid-cols-2 gap-4">
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
            <DialogClose asChild><Button variant="outline" onClick={resetForm}>Cancelar</Button></DialogClose>
            <Button onClick={handleSaveTask}>{taskToEdit ? 'Guardar Cambios' : 'Crear Tarea'}</Button>
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
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Timer Dialog */}
      <Dialog open={isTimerDialogOpen} onOpenChange={setTimerDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Timer /> {timerTask?.name}
                </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="text-8xl font-bold font-mono text-center">
                    {formatTime(elapsedSeconds)}
                </div>
                <Label>Tiempo Transcurrido</Label>
            </div>
            <DialogFooter className="justify-center gap-2 sm:gap-0">
                <Button onClick={() => setIsTimerActive(!isTimerActive)} variant="outline">
                    {isTimerActive ? 'Pausar' : 'Iniciar'}
                </Button>
                <Button onClick={handleStopAndComplete}>
                    <Check className="mr-2 h-4 w-4" />
                    Detener y Completar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
