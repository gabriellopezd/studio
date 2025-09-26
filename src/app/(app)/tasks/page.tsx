'use client';

import { useState, useMemo } from 'react';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase';
import { collection, doc, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';


export default function TasksPage() {
  const { firestore, user } = useFirebase();
  const [activeTab, setActiveTab] = useState('all');

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<any | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');

  const tasksQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'));
  }, [firestore, user]);

  const { data: allTasks, isLoading: tasksLoading } = useCollection(tasksQuery);

  const filteredTasks = useMemo(() => {
    if (!allTasks) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (activeTab) {
      case 'today':
        return allTasks.filter(task => {
          if (task.isCompleted || !task.dueDate) return false;
          const taskDueDate = task.dueDate.toDate();
          taskDueDate.setHours(0,0,0,0);
          return taskDueDate.getTime() === today.getTime();
        });
      case 'upcoming':
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return allTasks.filter(task => {
            if (task.isCompleted || !task.dueDate) return false;
            const taskDueDate = task.dueDate.toDate();
            taskDueDate.setHours(0,0,0,0);
            return taskDueDate >= today && taskDueDate <= nextWeek;
        });
      case 'completed':
        return allTasks.filter(task => task.isCompleted);
      case 'all':
      default:
        return allTasks.filter(task => !task.isCompleted);
    }
  }, [allTasks, activeTab]);

  const handleToggleTask = (taskId: string, currentStatus: boolean) => {
    if (!user) return;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskId);
    updateDocumentNonBlocking(taskRef, { isCompleted: !currentStatus });
  };
  
  const resetForm = () => {
    setName('');
    setDueDate('');
    setPriority('medium');
    setTaskToEdit(null);
  };

  const handleOpenDialog = (task?: any) => {
    if (task) {
      setTaskToEdit(task);
      setName(task.name);
      setDueDate(task.dueDate?.toDate ? task.dueDate.toDate().toISOString().split('T')[0] : '');
      setPriority(task.priority || 'medium');
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };
  
  const handleSaveTask = async () => {
    if (!user || !name) return;

    let dueDateTimestamp = null;
    if (dueDate) {
        const date = new Date(dueDate);
        // Adjust for timezone offset by setting time to UTC midnight
        const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        dueDateTimestamp = Timestamp.fromDate(utcDate);
    }

    const taskData = {
      name,
      dueDate: dueDateTimestamp,
      priority,
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
      return `Vence: ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;
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
  
  const renderTaskList = (tasks: any[] | null) => {
    return (
      <div className="mt-4 space-y-2 rounded-lg border bg-card p-4">
        {tasksLoading && <p>Cargando tareas...</p>}
        {!tasks?.length && !tasksLoading && (
           <p className="text-muted-foreground text-center p-4">No hay tareas en esta vista.</p>
        )}
        {tasks?.map((task) => (
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
          <TabsContent value="all">{renderTaskList(filteredTasks)}</TabsContent>
          <TabsContent value="today">{renderTaskList(filteredTasks)}</TabsContent>
          <TabsContent value="upcoming">{renderTaskList(filteredTasks)}</TabsContent>
          <TabsContent value="completed">{renderTaskList(filteredTasks)}</TabsContent>
        </Tabs>
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
                  <Label htmlFor="task-due-date">Fecha de Vencimiento</Label>
                  <Input id="task-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
    </>
  );
}
