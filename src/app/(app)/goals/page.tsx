import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { allGoals } from "@/lib/placeholder-data";
import { PlusCircle, Target } from "lucide-react";

export default function GoalsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Metas"
        description="Define y sigue el progreso de tus metas a largo plazo."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Meta
        </Button>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allGoals.map((goal) => (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{goal.name}</CardTitle>
                <Target className="h-6 w-6 text-primary" />
              </div>
              <CardDescription>{goal.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-foreground">{goal.currentValue.toLocaleString()} {goal.unit}</span>
                <span className="text-muted-foreground">{goal.targetValue.toLocaleString()} {goal.unit}</span>
              </div>
              <Progress value={goal.progress} aria-label={`${goal.progress}% completado`} />
            </CardContent>
            <CardFooter>
                <p className="text-sm text-muted-foreground">Vencimiento: {goal.dueDate}</p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
