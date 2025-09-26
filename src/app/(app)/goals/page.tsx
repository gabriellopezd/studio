'use client';

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
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Target } from 'lucide-react';
import {
  useFirebase,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';

export default function GoalsPage() {
  const { firestore, user } = useFirebase();

  const goalsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'goals') : null),
    [firestore, user]
  );
  const { data: allGoals, isLoading: goalsLoading } = useCollection(goalsQuery);

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

      {goalsLoading && <p>Cargando metas...</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allGoals?.map((goal) => (
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
                <span className="font-medium text-foreground">
                  {goal.currentValue.toLocaleString()} {goal.unit}
                </span>
                <span className="text-muted-foreground">
                  {goal.targetValue.toLocaleString()} {goal.unit}
                </span>
              </div>
              <Progress
                value={(goal.currentValue / goal.targetValue) * 100}
                aria-label={`${
                  (goal.currentValue / goal.targetValue) * 100
                }% completado`}
              />
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Vencimiento:{' '}
                {goal.dueDate?.toDate ? goal.dueDate.toDate().toLocaleDateString() : 'Sin fecha'}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
