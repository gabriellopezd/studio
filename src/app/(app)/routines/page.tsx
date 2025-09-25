import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routines } from "@/lib/placeholder-data";
import { Play, PlusCircle } from "lucide-react";

export default function RoutinesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rutinas"
        description="Crea y sigue tus rutinas diarias para construir consistencia."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Rutina
        </Button>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routines.map((routine) => (
          <Card key={routine.id}>
            <CardHeader>
              <CardTitle>{routine.name}</CardTitle>
              <CardDescription>{routine.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {routine.habits.map((habit, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                    <span>{habit.icon}</span>
                    <span>{habit.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardContent>
              <Button className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Comenzar Rutina
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
