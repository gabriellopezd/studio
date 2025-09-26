'use client';

import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import { useState } from 'react';

export default function TasksPage() {
  const { firestore, user } = useFirebase();
  const [activeTab, setActiveTab] = useState('all');

  const tasksQuery = useMemoFirebase(() => {
    if (!user) return null;
    const tasksColRef = collection(firestore, 'users', user.uid, 'tasks');
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    switch (activeTab) {
      case 'today':
        return query(tasksColRef, where('dueDate', '>=', Timestamp.fromDate(today)), where('dueDate', '<', Timestamp.fromDate(tomorrow)));
      case 'upcoming':
         return query(tasksColRef, where('dueDate', '>=', Timestamp.fromDate(today)), where('dueDate', '<=', Timestamp.fromDate(nextWeek)));
      case 'completed':
        return query(tasksColRef, where('isCompleted', '==', true));
      case 'all':
      default:
        return tasksColRef;
    }
  }, [firestore, user, activeTab]);

  const { data: allTasks, isLoading: tasksLoading } = useCollection(tasksQuery);

  const handleToggleTask = (taskId: string, currentStatus: boolean) => {
    if (!user) return;
    const taskRef = doc(firestore, 'users', user.uid, 'tasks', taskId);
    updateDocumentNonBlocking(taskRef, { isCompleted: !currentStatus });
  };

  const getTaskDueDate = (task: any) => {
    if (task.dueDate && task.dueDate.toDate) {
      return `Vence: ${task.dueDate.toDate().toLocaleDateString()}`;
    }
    return 'Sin fecha de vencimiento';
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tareas"
        description="Organiza tus tareas y mantente enfocado."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Tarea
        </Button>
      </PageHeader>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos 7 días</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="mt-4 space-y-4 rounded-lg border bg-card p-4">
            {tasksLoading && <p>Cargando tareas...</p>}
            {allTasks?.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.isCompleted}
                  onCheckedChange={(checked) =>
                    handleToggleTask(task.id, !!checked)
                  }
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
                <div
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    task.priority === 'high'
                      ? 'bg-red-200 text-red-800'
                      : task.priority === 'medium'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-green-200 text-green-800'
                  }`}
                >
                  {task.priority}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="today">
           <div className="mt-4 space-y-4 rounded-lg border bg-card p-4">
             {tasksLoading && <p>Cargando tareas...</p>}
             {allTasks?.length === 0 && !tasksLoading && <p className="text-muted-foreground p-4">No hay tareas para hoy.</p>}
            {allTasks?.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.isCompleted}
                  onCheckedChange={(checked) =>
                    handleToggleTask(task.id, !!checked)
                  }
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
                <div
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    task.priority === 'high'
                      ? 'bg-red-200 text-red-800'
                      : task.priority === 'medium'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-green-200 text-green-800'
                  }`}
                >
                  {task.priority}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="upcoming">
           <div className="mt-4 space-y-4 rounded-lg border bg-card p-4">
            {tasksLoading && <p>Cargando tareas...</p>}
            {allTasks?.length === 0 && !tasksLoading && <p className="text-muted-foreground p-4">No hay tareas para los próximos 7 días.</p>}
            {allTasks?.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.isCompleted}
                  onCheckedChange={(checked) =>
                    handleToggleTask(task.id, !!checked)
                  }
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
                <div
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    task.priority === 'high'
                      ? 'bg-red-200 text-red-800'
                      : task.priority === 'medium'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-green-200 text-green-800'
                  }`}
                >
                  {task.priority}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="completed">
           <div className="mt-4 space-y-4 rounded-lg border bg-card p-4">
            {tasksLoading && <p>Cargando tareas...</p>}
            {allTasks?.length === 0 && !tasksLoading && <p className="text-muted-foreground p-4">No hay tareas completadas.</p>}
            {allTasks?.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <Checkbox
                  id={`task-${task.id}`}
                  checked={task.isCompleted}
                  onCheckedChange={(checked) =>
                    handleToggleTask(task.id, !!checked)
                  }
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
                <div
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    task.priority === 'high'
                      ? 'bg-red-200 text-red-800'
                      : task.priority === 'medium'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-green-200 text-green-800'
                  }`}
                >
                  {task.priority}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
