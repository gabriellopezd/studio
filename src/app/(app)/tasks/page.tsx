
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
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isToday, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTasks } from '@/app/_providers/TasksProvider';
import { useSession } from '@/app/_providers/SessionProvider';
import { useUI } from '@/app/_providers/UIProvider';
import { ResponsiveCalendar } from './_components/ResponsiveCalendar';

const motivationalQuotes = [
  'Una tarea completada es un paso más hacia tu meta.',
  'No dejes para mañana lo que puedas tachar de la lista hoy.',
  'Organiza tus tareas, conquista tu día.',
  'La satisfacción de una lista de tareas vacía no tiene precio.',
  'Divide y vencerás. Una tarea a la vez.',
];

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-red-200 text-red-800 hover:bg-red-200/80';
    case 'medium':
      return 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200/80';
    case 'low':
      return 'bg-green-200 text-green-800 hover:bg-green-200/80';
    default:
      return 'bg-gray-200 text-gray-800';
  }
}

export default function TasksPage() {
  const {
    tasks,
    tasksLoading,
    taskCategories,
    totalStats,
    categoryStats,
    dailyCompletionStats,
    onTimeCompletionRate,
    taskTimeAnalytics,
    analyticsLoading,
    handleToggleTask,
    handleSaveTask,
    handleDeleteTask,
  } = useTasks();

  const { activeSession, startSession, stopSession } = useSession();
  const { modalState, handleOpenModal, handleCloseModal, formState, setFormState } = useUI();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [motivation, setMotivation] = useState('');
  
  useEffect(() => {
    setMotivation(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const { groupedTasks, allTasksInView } = useMemo(() => {
    if (!tasks) return { groupedTasks: {}, allTasksInView: [] };

    let tasksToShow: any[];
    const today = startOfToday();

    switch (activeTab) {
      case 'today':
        tasksToShow = tasks.filter(task => !task.isCompleted && task.dueDate && isToday(task.dueDate.toDate()));
        break;
      case 'overdue':
        tasksToShow = tasks.filter(task => !task.isCompleted && task.dueDate && isBefore(task.dueDate.toDate(), today));
        break;

      case 'completed':
        tasksToShow = tasks.filter(task => task.isCompleted);
        break;
      case 'pending':
      default:
        tasksToShow = tasks.filter(task => !task.isCompleted);
        break;
    }

    const grouped = tasksToShow.reduce((acc, task) => {
      const cat = task.category || 'Sin Categoría';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(task);
      return acc;
    }, {} as Record<string, any[]>);
    
    return { groupedTasks: grouped, allTasksInView: tasksToShow };
  }, [tasks, activeTab]);

  const sortedCategories = useMemo(() => {
    if (!taskCategories) return [];
    return Object.keys(groupedTasks).sort((a,b) => {
      const aIndex = taskCategories.findIndex(c => c.name === a);
      const bIndex = taskCategories.findIndex(c => c.name === b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return a.localeCompare(b);
    })
  }, [groupedTasks, taskCategories]);

  const renderTaskList = () => (
    <div className="mt-4 space-y-6">
      {tasksLoading && <p>Cargando tareas...</p>}
      {!allTasksInView?.length && !tasksLoading && (
        <p className="text-muted-foreground text-center p-4">No hay tareas en esta vista.</p>
      )}
      {sortedCategories.map(category => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-2">{category}</h3>
          <div className="space-y-2 rounded-lg border bg-card p-4">
            {groupedTasks[category].map((task: any) => {
              const isSessionActive = activeSession?.id === task.id;
              const dueDate = task.dueDate?.toDate();
              const isOverdue = dueDate && isBefore(dueDate, startOfToday()) && !task.isCompleted;
              return (
                <div key={task.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                  <Checkbox id={`task-${task.id}`} checked={task.isCompleted} onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)} />
                  <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer">
                    <p className={cn('font-medium', task.isCompleted && 'text-muted-foreground line-through')}>{task.name}</p>
                    <p className={cn('text-sm', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                      {dueDate ? format(dueDate, 'PPP', { locale: es }) : 'Sin fecha'}
                    </p>
                  </label>
                  {isOverdue && <AlertTriangle className="h-5 w-5 text-destructive ml-auto" />}
                  <Badge className={cn(getPriorityBadge(task.priority))}>{task.priority}</Badge>
                  {!task.isCompleted && (
                    <Button variant="outline" size="icon" onClick={() => isSessionActive ? stopSession() : startSession(task.id, task.name, 'task')} disabled={!isSessionActive && !!activeSession} className={cn("h-9 w-9", isSessionActive && "bg-primary text-primary-foreground animate-pulse")}>
                      {isSessionActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenModal('task', task)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenModal('deleteTask', task)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader title="TAREAS" description="Organiza tus tareas y mantente enfocado." motivation={motivation} imageId="tasks-header">
          <Button onClick={() => handleOpenModal('task')}><PlusCircle className="mr-2 h-4 w-4" />Crear Tarea</Button>
        </PageHeader>
        
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Mis Tareas</TabsTrigger>
            <TabsTrigger value="analytics">Análisis de Productividad</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList>
                <TabsTrigger value="pending">Pendientes</TabsTrigger>
                <TabsTrigger value="today">Para Hoy</TabsTrigger>
                <TabsTrigger value="overdue">Vencidas</TabsTrigger>
                <TabsTrigger value="completed">Completadas</TabsTrigger>
              </TabsList>
              <TabsContent value="pending">{renderTaskList()}</TabsContent>
              <TabsContent value="today">{renderTaskList()}</TabsContent>
              <TabsContent value="overdue">{renderTaskList()}</TabsContent>
              <TabsContent value="completed">{renderTaskList()}</TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="analytics" className="mt-6 space-y-6">
            {analyticsLoading && <p>Cargando análisis...</p>}
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Progreso Total</CardTitle>
                        <CardDescription>{totalStats.completed} de {totalStats.total} tareas completadas en total</CardDescription>
                    </CardHeader>
                    <CardContent><Progress value={totalStats.completionRate} /></CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Tasa de Cumplimiento a Tiempo</CardTitle>
                        <CardDescription>Porcentaje de tareas completadas antes de su fecha de vencimiento.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold">{onTimeCompletionRate.toFixed(1)}%</div>
                            <Progress value={onTimeCompletionRate} />
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Tareas Completadas esta Semana</CardTitle>
                    <CardDescription>Resumen de tu productividad en los últimos 7 días.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyCompletionStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false}/>
                            <Tooltip />
                            <Bar dataKey="completadas" fill="hsl(var(--chart-2))" name="Completadas" stackId="a"/>
                            <Bar dataKey="pendientes" fill="hsl(var(--chart-5))" name="Pendientes" stackId="a"/>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Tareas por Categoría</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(categoryStats).map(([category, stats]) => (
                                <div key={category}>
                                    <div className="flex justify-between mb-1 text-sm">
                                        <span>{category}</span>
                                        <span>{stats.completed}/{stats.total}</span>
                                    </div>
                                    <Progress value={stats.completionRate} />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Tiempo de Enfoque por Categoría</CardTitle></CardHeader>
                    <CardContent>
                       <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={taskTimeAnalytics} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" unit=" min"/>
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }}/>
                                <Tooltip formatter={(value) => `${value} min`} />
                                <Bar dataKey="minutos" name="Minutos" fill="hsl(var(--primary))" />
                            </BarChart>
                       </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={modalState.type === 'task'} onOpenChange={(open) => !open && handleCloseModal('task')}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formState?.id ? 'Editar Tarea' : 'Crear Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Nombre</Label>
              <Input id="task-name" value={formState.name || ''} onChange={(e) => setFormState({ ...formState, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-category">Categoría</Label>
                <Select value={formState.category || ''} onValueChange={(value) => setFormState({ ...formState, category: value })}>
                  <SelectTrigger id="task-category"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>{taskCategories.map(cat => (<SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Prioridad</Label>
                <Select value={formState.priority || 'medium'} onValueChange={(value) => setFormState({ ...formState, priority: value })}>
                  <SelectTrigger id="task-priority"><SelectValue placeholder="Selecciona" /></SelectTrigger>
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
              <ResponsiveCalendar id="task-due-date" value={formState.dueDate} onSelect={(date) => setFormState({ ...formState, dueDate: date })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCloseModal('task')}>Cancelar</Button>
            <Button onClick={handleSaveTask}>{formState?.id ? 'Guardar Cambios' : 'Crear Tarea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={modalState.type === 'deleteTask'} onOpenChange={(open) => !open && handleCloseModal('deleteTask')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará la tarea "{formState?.name}" permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
