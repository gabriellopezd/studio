import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { allTasks } from "@/lib/placeholder-data";
import { PlusCircle } from "lucide-react";

export default function TasksPage() {
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

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos 7 días</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <div className="mt-4 space-y-4 rounded-lg border bg-card p-4">
            {allTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                <Checkbox id={`task-${task.id}`} checked={task.isCompleted} />
                <label htmlFor={`task-${task.id}`} className="flex-1 cursor-pointer">
                  <p className={`font-medium ${task.isCompleted ? 'text-muted-foreground line-through' : ''}`}>{task.name}</p>
                  <p className="text-sm text-muted-foreground">Vence: {task.dueDate}</p>
                </label>
                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    task.priority === 'high' ? 'bg-red-200 text-red-800' :
                    task.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                }`}>{task.priority}</div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="today">
          <p className="text-muted-foreground p-4">Tareas para hoy aparecerán aquí.</p>
        </TabsContent>
        <TabsContent value="upcoming">
          <p className="text-muted-foreground p-4">Tareas para los próximos 7 días aparecerán aquí.</p>
        </TabsContent>
        <TabsContent value="completed">
          <p className="text-muted-foreground p-4">Tareas completadas aparecerán aquí.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
